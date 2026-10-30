import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * MST Mainnet Production Deployment Script
 * Deploys VaultFactoryV2 and instantiates Genesis ClubVaultV2 with 2-of-2 quorum.
 * Network: MST Mainnet (Chain ID: 4646, RPC: https://mariorpc.mstblockchain.com)
 */
async function main() {
  console.log("=================================================");
  console.log(`Starting ClubVault Production Deployment on: ${network.name}`);
  console.log("=================================================");

  const currentNetwork = await ethers.provider.getNetwork();
  const chainId = Number(currentNetwork.chainId);

  // Strict network verification guard
  if (chainId !== 4646 || network.name !== "mstMainnet") {
    throw new Error(
      `ABORTED: This script is restricted to MST Mainnet (Chain ID 4646). Detected: ${network.name} (Chain ID ${chainId})`
    );
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account configured. Check PRIVATE_KEY in .env");
  }

  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 1000000000n; // 1.0 Gwei

  console.log(`Target Network   : MST Mainnet (Chain ID: 4646)`);
  console.log(`Deployer Address : ${deployerAddress}`);
  console.log(`Account Balance  : ${ethers.formatEther(balance)} MSTC`);
  console.log(`Current Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} Gwei`);

  // Require minimum 0.01 MSTC for deployment
  const minRequired = ethers.parseEther("0.01");
  if (balance < minRequired) {
    throw new Error(
      `Insufficient balance for MST Mainnet deployment. Current balance: ${ethers.formatEther(
        balance
      )} MSTC. Minimum required: 0.01 MSTC.`
    );
  }

  // 1. Deploy VaultFactoryV2
  console.log("\n[1/3] Deploying VaultFactoryV2 to MST Mainnet...");
  const VaultFactoryV2Contract = await ethers.getContractFactory("VaultFactoryV2");
  const factory = await VaultFactoryV2Contract.deploy({ gasPrice });
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  const factoryDeployTx = factory.deploymentTransaction();

  console.log(`✔ VaultFactoryV2 Deployed: ${factoryAddress}`);
  if (factoryDeployTx) {
    console.log(`  Tx Hash: ${factoryDeployTx.hash}`);
    console.log(`  Explorer Link: https://mstscan.com/tx/${factoryDeployTx.hash}`);
  }

  // 2. Instantiate Genesis ClubVaultV2 with 2-of-2 multisig quorum
  console.log("\n[2/3] Instantiating Genesis ClubVaultV2 via VaultFactoryV2...");
  const clubName = "Web3 Builders Club";
  const clubDesc = "MST Mainnet Production Treasury Vault (2-of-2 Multisig)";
  const member1 = ethers.getAddress(deployerAddress);
  const member2 = ethers.getAddress("0xF09192ed618C49e9f9A439D97d798F8c600A38a8");
  const initialMembers = [member1, member2];
  const requiredApprovals = 2; // Strict 2-of-2 multisig quorum

  console.log(`  Club Name          : ${clubName}`);
  console.log(`  Members            : ${initialMembers.join(", ")}`);
  console.log(`  Required Approvals : ${requiredApprovals} of ${initialMembers.length}`);

  const createTx = await factory.createVault(
    clubName,
    clubDesc,
    initialMembers,
    requiredApprovals,
    { gasPrice }
  );
  const receipt = await createTx.wait();
  console.log(`✔ Genesis ClubVaultV2 Creation Confirmed!`);
  console.log(`  Tx Hash: ${createTx.hash}`);
  console.log(`  Explorer Link: https://mstscan.com/tx/${createTx.hash}`);

  const allVaults = await factory.getAllVaults();
  const genesisVaultAddress = allVaults[0];
  console.log(`✔ Genesis ClubVaultV2 Address: ${genesisVaultAddress}`);
  console.log(`  Explorer Link: https://mstscan.com/address/${genesisVaultAddress}`);

  // 3. Persist Mainnet metadata cleanly in deployments/mstMainnet.json
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentData = {
    network: "mstMainnet",
    chainId: "4646",
    timestamp: new Date().toISOString(),
    deployer: deployerAddress,
    contracts: {
      VaultFactoryV2: {
        address: factoryAddress,
        txHash: factoryDeployTx?.hash || null,
        blockNumber: receipt?.blockNumber || null,
      },
      GenesisClubVaultV2: {
        address: genesisVaultAddress,
        name: clubName,
        description: clubDesc,
        members: initialMembers,
        requiredApprovals: requiredApprovals,
        txHash: createTx.hash,
        blockNumber: receipt?.blockNumber || null,
      },
    },
    explorerUrls: {
      factoryV2: `https://mstscan.com/address/${factoryAddress}`,
      genesisVaultV2: `https://mstscan.com/address/${genesisVaultAddress}`,
    },
    lastUpdated: new Date().toISOString(),
  };

  const mainnetFile = path.join(deploymentsDir, "mstMainnet.json");
  fs.writeFileSync(mainnetFile, JSON.stringify(deploymentData, null, 2));
  console.log(`\n✔ Mainnet deployment metadata saved to: ${mainnetFile}`);
  console.log("MST Mainnet deployment complete!");
}

main().catch((err) => {
  console.error("\n❌ Deployment failed:", err.message || err);
  process.exit(1);
});
