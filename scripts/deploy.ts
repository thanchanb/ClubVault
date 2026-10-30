import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("=================================================");
  console.log(`Starting ClubVault Deployment on network: ${network.name}`);
  console.log("=================================================");

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No deployer account configured. Please check PRIVATE_KEY in .env file."
    );
  }

  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);
  const feeData = await ethers.provider.getFeeData();

  console.log(`Deployer Address : ${deployerAddress}`);
  console.log(`Account Balance  : ${ethers.formatEther(balance)} native tokens`);
  console.log(`Gas Price        : ${ethers.formatUnits(feeData.gasPrice ?? 1000000000n, "gwei")} Gwei`);

  if (balance === 0n && network.name !== "hardhat" && network.name !== "localhost") {
    console.warn("WARNING: Deployer account has 0 balance! Please fund via https://faucet.mstblockchain.com");
  }

  // 1. Deploy VaultFactory
  console.log("\n[1/3] Deploying VaultFactory...");
  const VaultFactoryContract = await ethers.getContractFactory("VaultFactory");
  const factory = await VaultFactoryContract.deploy({
    gasPrice: feeData.gasPrice ?? 1000000000n,
  });
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  const factoryDeployTx = factory.deploymentTransaction();
  console.log(`✔ VaultFactory deployed at: ${factoryAddress}`);
  if (factoryDeployTx) {
    console.log(`  Tx Hash: ${factoryDeployTx.hash}`);
    if (network.name === "mstTestnet") {
      console.log(`  Explorer Link: https://testnet.mstscan.com/tx/${factoryDeployTx.hash}`);
    }
  }

  // 2. Create Genesis ClubVault instance via Factory
  console.log("\n[2/3] Instantiating Genesis ClubVault via Factory...");
  const clubName = "Web3 Builders Club";
  const clubDesc = "Decentralized treasury for hackathon expenses and grants";
  // Include both deployer and user funded BridgeKey wallet as authorized initial members
  const fundedBridgeKeyWallet = "0xF09192ed618C49e9f9A439D97d798F8c600A38a8";
  const initialMembers = Array.from(
    new Set([
      ethers.getAddress(deployerAddress),
      ethers.getAddress(fundedBridgeKeyWallet),
    ])
  );
  const requiredApprovals = 1;

  const createTx = await factory.createVault(
    clubName,
    clubDesc,
    initialMembers,
    requiredApprovals,
    { gasPrice: feeData.gasPrice ?? 1000000000n }
  );
  const receipt = await createTx.wait();
  console.log(`✔ Genesis Club creation tx confirmed!`);
  console.log(`  Tx Hash: ${createTx.hash}`);
  if (network.name === "mstTestnet") {
    console.log(`  Explorer Link: https://testnet.mstscan.com/tx/${createTx.hash}`);
  }

  const allVaults = await factory.getAllVaults();
  const genesisVaultAddress = allVaults[0];
  console.log(`✔ Genesis ClubVault Address: ${genesisVaultAddress}`);
  if (network.name === "mstTestnet") {
    console.log(`  Explorer Link: https://testnet.mstscan.com/address/${genesisVaultAddress}`);
  }

  // 3. Persist deployment metadata
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentData = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    timestamp: new Date().toISOString(),
    deployer: deployerAddress,
    contracts: {
      VaultFactory: {
        address: factoryAddress,
        txHash: factoryDeployTx?.hash,
      },
      GenesisClubVault: {
        address: genesisVaultAddress,
        name: clubName,
        members: initialMembers,
        requiredApprovals: requiredApprovals,
        txHash: createTx.hash,
      },
    },
    explorerUrls: {
      factory: `https://testnet.mstscan.com/address/${factoryAddress}`,
      genesisVault: `https://testnet.mstscan.com/address/${genesisVaultAddress}`,
    },
  };

  const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
  console.log(`\n[3/3] Deployment record saved to: ${deploymentFile}`);
  console.log("=================================================");
  console.log("Deployment completed successfully!");
  console.log("=================================================");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
