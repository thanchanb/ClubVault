import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("=================================================");
  console.log("Deploying 2-of-2 Relayer Test Vault on MST Testnet");
  console.log("=================================================\n");

  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;
  const network = await provider.getNetwork();

  if (Number(network.chainId) !== 91562037) {
    throw new Error(`Safety check failed: unexpected chainId ${network.chainId}, expected 91562037`);
  }

  const factoryAddress = "0x68738EfB0e8B2Dad986a9FF3Db3eF39A0D4Fcfb0";
  const bridgeKeyMember = "0xF09192ed618C49e9f9A439D97d798F8c600A38a8";

  console.log(`Deployer Address  : ${deployer.address}`);
  console.log(`BridgeKey Member  : ${bridgeKeyMember}`);
  console.log(`Factory Address   : ${factoryAddress}\n`);

  // 1. Call factory.createVault with requiredApprovals = 2
  console.log("[1/4] Calling VaultFactoryV2.createVault (Quorum = 2)...");
  const FactoryFactory = await ethers.getContractFactory("VaultFactoryV2");
  const factory = FactoryFactory.attach(factoryAddress) as any;

  const createTx = await factory.connect(deployer).createVault(
    "MST Relayer Test Vault (2-of-2)",
    "Dedicated 2-of-2 multisig vault for live gas-sponsored voting verification",
    [deployer.address, bridgeKeyMember],
    2n // 2 of 2 quorum
  );
  console.log(`Create vault transaction broadcast! Hash: ${createTx.hash}`);
  console.log(`Explorer Link: https://testnet.mstscan.com/tx/${createTx.hash}`);

  const createReceipt = await createTx.wait();
  console.log(`✔ Vault deployment confirmed in block #${createReceipt?.blockNumber}!`);

  // Parse VaultCreated event
  let newVaultAddress = "";
  for (const log of createReceipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log);
      if (parsed?.name === "VaultCreated") {
        newVaultAddress = parsed.args[0];
        break;
      }
    } catch {}
  }

  if (!newVaultAddress) {
    const allVaults = await factory.getAllVaults();
    newVaultAddress = allVaults[allVaults.length - 1];
  }

  console.log(`✔ New 2-of-2 Vault Address: ${newVaultAddress}`);
  console.log(`Explorer Link: https://testnet.mstscan.com/address/${newVaultAddress}\n`);

  const ClubVaultV2Factory = await ethers.getContractFactory("ClubVaultV2");
  const vault = ClubVaultV2Factory.attach(newVaultAddress) as any;

  // Verify on-chain quorum is indeed 2
  const quorum = await vault.requiredApprovals();
  console.log(`✔ Verified on-chain requiredApprovals: ${quorum.toString()} (Expected: 2)\n`);

  // 2. Seed vault with 0.005 tMSTC
  console.log("[2/4] Seeding vault with 0.005 tMSTC for available funds...");
  const depositTx = await deployer.sendTransaction({
    to: newVaultAddress,
    value: ethers.parseEther("0.005"),
  });
  console.log(`Seed deposit tx broadcast! Hash: ${depositTx.hash}`);
  await depositTx.wait();
  console.log(`✔ Seed deposit confirmed! Vault Balance: ${ethers.formatEther(await provider.getBalance(newVaultAddress))} tMSTC\n`);

  // 3. Create Proposal #1
  console.log("[3/4] Creating Proposal #1 (0.001 tMSTC) by Deployer...");
  const createPropTx = await vault.connect(deployer).createProposal(
    0, // STANDARD_PAYMENT
    bridgeKeyMember,
    ethers.parseEther("0.001"),
    "Hackathon Gasless Vote Verification (2-of-2 Quorum)",
    7 * 86400,
    0
  );
  console.log(`Create Proposal tx broadcast! Hash: ${createPropTx.hash}`);
  console.log(`Explorer Link: https://testnet.mstscan.com/tx/${createPropTx.hash}`);
  await createPropTx.wait();
  console.log(`✔ Proposal creation confirmed!\n`);

  // 4. Verify on-chain Proposal is PENDING with 1/2 approvals
  console.log("[4/4] Verifying On-Chain Proposal Status...");
  const prop = await vault.getProposal(1);
  const statusLabels = ["PENDING", "APPROVED", "REJECTED", "EXECUTED"];

  console.log(`Proposal #1 Details:`);
  console.log(` - ID:               ${prop.id}`);
  console.log(` - Description:      ${prop.description}`);
  console.log(` - Amount:           ${ethers.formatEther(prop.amount)} tMSTC`);
  console.log(` - Recipient:        ${prop.recipient}`);
  console.log(` - Proposer:         ${prop.proposer}`);
  console.log(` - Approvals Count:  ${prop.approvalsCount} / ${quorum} required`);
  console.log(` - Rejections Count: ${prop.rejectionsCount}`);
  console.log(` - Status:           ${statusLabels[Number(prop.status)]} (Code: ${prop.status})`);

  if (Number(prop.status) === 0 && Number(prop.approvalsCount) === 1) {
    console.log(`\n✔ PERFECT: Proposal is confirmed PENDING with 1/2 approvals!`);
    console.log(`Member 2 (${bridgeKeyMember}) is ready to cast the deciding EIP-712 Gasless Vote.`);
  } else {
    console.warn(`WARNING: Unexpected proposal state: ${prop.status}`);
  }

  console.log("\n=================================================");
  console.log("2-of-2 Vault Setup Completed on MST Testnet!");
  console.log("=================================================");
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
