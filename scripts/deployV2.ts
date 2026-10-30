import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("=================================================");
  console.log(`Starting ClubVault V2 Deployment on network: ${network.name}`);
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
    throw new Error("Deployer account has 0 balance! Please fund via https://faucet.mstblockchain.com");
  }

  // 1. Deploy VaultFactoryV2
  console.log("\n[1/3] Deploying VaultFactoryV2...");
  const VaultFactoryV2Contract = await ethers.getContractFactory("VaultFactoryV2");
  const factoryV2 = await VaultFactoryV2Contract.deploy({
    gasPrice: feeData.gasPrice ?? 1000000000n,
  });
  await factoryV2.waitForDeployment();
  const factoryV2Address = await factoryV2.getAddress();
  const factoryDeployTx = factoryV2.deploymentTransaction();
  console.log(`✔ VaultFactoryV2 deployed at: ${factoryV2Address}`);
  if (factoryDeployTx) {
    console.log(`  Tx Hash: ${factoryDeployTx.hash}`);
    if (network.name === "mstTestnet") {
      console.log(`  Explorer Link: https://testnet.mstscan.com/tx/${factoryDeployTx.hash}`);
    }
  }

  // 2. Create Genesis ClubVaultV2 instance via FactoryV2
  console.log("\n[2/3] Instantiating Genesis ClubVaultV2 via FactoryV2...");
  const clubName = "Web3 Builders Club V2";
  const clubDesc = "Decentralized treasury with EIP-712 gas-sponsored voting on MST Testnet";
  const fundedBridgeKeyWallet = "0xF09192ed618C49e9f9A439D97d798F8c600A38a8";
  const initialMembers = Array.from(
    new Set([
      ethers.getAddress(deployerAddress),
      ethers.getAddress(fundedBridgeKeyWallet),
    ])
  );
  const requiredApprovals = 1;

  const createTx = await factoryV2.createVault(
    clubName,
    clubDesc,
    initialMembers,
    requiredApprovals,
    { gasPrice: feeData.gasPrice ?? 1000000000n }
  );
  await createTx.wait();
  console.log(`✔ Genesis ClubVaultV2 creation confirmed!`);
  console.log(`  Tx Hash: ${createTx.hash}`);
  if (network.name === "mstTestnet") {
    console.log(`  Explorer Link: https://testnet.mstscan.com/tx/${createTx.hash}`);
  }

  const allVaults = await factoryV2.getAllVaults();
  const genesisVaultV2Address = allVaults[0];
  console.log(`✔ Genesis ClubVaultV2 Address: ${genesisVaultV2Address}`);
  if (network.name === "mstTestnet") {
    console.log(`  Explorer Link: https://testnet.mstscan.com/address/${genesisVaultV2Address}`);
  }

  // 3. Persist deployment metadata — strictly preserving V1 records
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);
  let existingData: any = {};
  if (fs.existsSync(deploymentFile)) {
    try {
      existingData = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    } catch {
      existingData = {};
    }
  }

  const updatedData = {
    ...existingData,
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    lastUpdated: new Date().toISOString(),
    deployer: deployerAddress,
    contracts: {
      ...(existingData.contracts || {}),
      // Preserve V1 contracts exactly
      VaultFactory: existingData.contracts?.VaultFactory || {
        address: "0xFf1A398eaEAd76dEEA1bF84BDF52e25848369308",
      },
      GenesisClubVault: existingData.contracts?.GenesisClubVault || {
        address: "0xECAD385e56299b0aec5A51dB2DdCF0A4746E7c31",
      },
      // Add separate V2 contracts
      VaultFactoryV2: {
        address: factoryV2Address,
        txHash: factoryDeployTx?.hash,
      },
      GenesisClubVaultV2: {
        address: genesisVaultV2Address,
        name: clubName,
        members: initialMembers,
        requiredApprovals: requiredApprovals,
        txHash: createTx.hash,
      },
    },
    explorerUrls: {
      ...(existingData.explorerUrls || {}),
      factory: existingData.explorerUrls?.factory || "https://testnet.mstscan.com/address/0xFf1A398eaEAd76dEEA1bF84BDF52e25848369308",
      genesisVault: existingData.explorerUrls?.genesisVault || "https://testnet.mstscan.com/address/0xECAD385e56299b0aec5A51dB2DdCF0A4746E7c31",
      factoryV2: `https://testnet.mstscan.com/address/${factoryV2Address}`,
      genesisVaultV2: `https://testnet.mstscan.com/address/${genesisVaultV2Address}`,
    },
  };

  fs.writeFileSync(deploymentFile, JSON.stringify(updatedData, null, 2));
  console.log(`\n[3/3] Deployment record safely updated in: ${deploymentFile}`);

  // 4. Update frontend config without overwriting V1
  const configPath = path.join(__dirname, "..", "frontend", "src", "contracts", "config.ts");
  if (fs.existsSync(configPath) && network.name === "mstTestnet") {
    let configContent = fs.readFileSync(configPath, "utf8");
    configContent = configContent.replace(
      /VaultFactoryV2:\s*null/g,
      `VaultFactoryV2: "${factoryV2Address}"`
    );
    configContent = configContent.replace(
      /GenesisVaultV2:\s*null/g,
      `GenesisVaultV2: "${genesisVaultV2Address}"`
    );
    fs.writeFileSync(configPath, configContent);
    console.log(`✔ Frontend configuration updated with separate V2 entries in: ${configPath}`);
  }

  console.log("=================================================");
  console.log("ClubVault V2 Deployment completed successfully!");
  console.log("V1 Genesis Vault preserved at 0xECAD385e56299b0aec5A51dB2DdCF0A4746E7c31");
  console.log("=================================================");
}

main().catch((error) => {
  console.error("V2 Deployment failed:", error);
  process.exit(1);
});
