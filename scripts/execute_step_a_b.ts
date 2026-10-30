import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("=================================================");
  console.log("Executing Approved Steps A & B on MST Testnet");
  console.log("Target Vault: 0x8442bF7dE2d0FF9aF4136a83Cf20BE559b6Fb5C9");
  console.log("=================================================\n");

  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;
  const network = await provider.getNetwork();

  if (Number(network.chainId) !== 91562037) {
    throw new Error(`Safety check failed: unexpected chainId ${network.chainId}, expected 91562037`);
  }

  const vaultAddress = "0x8442bF7dE2d0FF9aF4136a83Cf20BE559b6Fb5C9";
  const recipientAddress = "0xF09192ed618C49e9f9A439D97d798F8c600A38a8";

  console.log(`Deployer Address : ${deployer.address}`);
  const balanceBefore = await provider.getBalance(deployer.address);
  console.log(`Deployer Balance : ${ethers.formatEther(balanceBefore)} tMSTC\n`);

  // --- Step A: Deposit 0.01 tMSTC ---
  console.log("[Step A] Depositing 0.01 tMSTC to GenesisClubVaultV2...");
  const depositTx = await deployer.sendTransaction({
    to: vaultAddress,
    value: ethers.parseEther("0.01"),
  });
  console.log(`Deposit tx broadcast! Hash: ${depositTx.hash}`);
  console.log(`Explorer Link: https://testnet.mstscan.com/tx/${depositTx.hash}`);

  const depositReceipt = await depositTx.wait();
  console.log(`✔ Deposit confirmed in block #${depositReceipt?.blockNumber}!\n`);

  const vaultBalance = await provider.getBalance(vaultAddress);
  console.log(`✔ Vault Treasury Balance: ${ethers.formatEther(vaultBalance)} tMSTC`);

  // --- Step B: Create Small Test Proposal ---
  console.log("\n[Step B] Creating Test Proposal #1 (0.001 tMSTC)...");
  const ClubVaultV2Factory = await ethers.getContractFactory("ClubVaultV2");
  const vault = ClubVaultV2Factory.attach(vaultAddress) as any;

  const createPropTx = await vault.connect(deployer).createProposal(
    0, // STANDARD_PAYMENT
    recipientAddress,
    ethers.parseEther("0.001"),
    "Hackathon Gasless Relayer Verification Test",
    7 * 86400, // 7 days window
    0
  );
  console.log(`Create Proposal tx broadcast! Hash: ${createPropTx.hash}`);
  console.log(`Explorer Link: https://testnet.mstscan.com/tx/${createPropTx.hash}`);

  const propReceipt = await createPropTx.wait();
  console.log(`✔ Proposal creation confirmed in block #${propReceipt?.blockNumber}!\n`);

  const propCount = await vault.proposalCount();
  console.log(`✔ On-Chain Proposal Count: ${propCount.toString()}`);

  const proposal = await vault.getProposal(1);
  console.log(`Proposal #1 Details:`);
  console.log(` - ID: ${proposal.id}`);
  console.log(` - Description: ${proposal.description}`);
  console.log(` - Amount: ${ethers.formatEther(proposal.amount)} tMSTC`);
  console.log(` - Recipient: ${proposal.recipient}`);
  console.log(` - Proposer: ${proposal.proposer}`);
  console.log(` - Approvals: ${proposal.approvalsCount}`);
  console.log(` - Rejections: ${proposal.rejectionsCount}`);
  console.log(` - Status: ${proposal.status} (0: PENDING, 1: APPROVED, 3: EXECUTED)`);

  const balanceAfter = await provider.getBalance(deployer.address);
  console.log(`\nDeployer Balance After: ${ethers.formatEther(balanceAfter)} tMSTC`);
  console.log("=================================================");
  console.log("Steps A & B Completed Successfully on MST Testnet!");
  console.log("=================================================");
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
