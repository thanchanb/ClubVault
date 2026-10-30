import { ethers } from "hardhat";
import { ethers as ethersLib } from "ethers";

async function main() {
  console.log("=================================================");
  console.log("MST Mainnet Pre-Deployment Gas & Budget Validator");
  console.log("=================================================");

  // 1. VaultFactoryV2 Deployment Gas
  const Factory = await ethers.getContractFactory("VaultFactoryV2");
  const factoryDeployTx = await Factory.getDeployTransaction();
  const factoryGas = await ethers.provider.estimateGas(factoryDeployTx);
  console.log(`1. VaultFactoryV2 Deployment Gas       : ${factoryGas.toLocaleString()} units`);

  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  // 2. Genesis ClubVaultV2 via createVault
  const initialMembers = [
    "0x06e08cf0aed1663834E267E90333164a0276bbbD",
    "0xF09192ed618C49e9f9A439D97d798F8c600A38a8"
  ];
  const createTxData = await factory.createVault.populateTransaction(
    "Web3 Builders Club",
    "MST Mainnet Production Treasury Vault (2-of-2 Multisig)",
    initialMembers,
    2
  );
  const createGas = await ethers.provider.estimateGas(createTxData);
  console.log(`2. createVault (ClubVaultV2 Deploy) Gas: ${createGas.toLocaleString()} units`);

  const totalGas = factoryGas + createGas;
  console.log(`-------------------------------------------------`);
  console.log(`Total Gas Units Required               : ${totalGas.toLocaleString()} units`);

  // Query live Mainnet gas price and balances
  const mainnetRpc = new ethersLib.JsonRpcProvider("https://mariorpc.mstblockchain.com/");
  const network = await mainnetRpc.getNetwork();
  const feeData = await mainnetRpc.getFeeData();
  const gasPrice = feeData.gasPrice ?? 1000000000n; // 1 Gwei
  const member2Address = "0xF09192ed618C49e9f9A439D97d798F8c600A38a8";
  const balanceWei = await mainnetRpc.getBalance(member2Address);

  console.log(`\nLive MST Mainnet Status (Chain ID: ${network.chainId}):`);
  console.log(`  Live Gas Price                       : ${ethersLib.formatUnits(gasPrice, "gwei")} Gwei`);
  console.log(`  Member 2 Balance (${member2Address}) : ${ethersLib.formatEther(balanceWei)} MSTC`);

  const totalCostWei = totalGas * gasPrice;
  const totalCostEth = Number(ethersLib.formatEther(totalCostWei));
  console.log(`  Expected Total Deployment Cost       : ${totalCostEth.toFixed(6)} MSTC`);

  // Safety buffer of 200% (3x)
  const conservativeGasPrice = gasPrice * 3n;
  const conservativeCostWei = totalGas * conservativeGasPrice;
  const conservativeCostEth = Number(ethersLib.formatEther(conservativeCostWei));
  console.log(`  Conservative Cost (3x Gas Price)     : ${conservativeCostEth.toFixed(6)} MSTC`);

  const remainingBalanceEth = Number(ethersLib.formatEther(balanceWei - totalCostWei));
  console.log(`  Projected Remaining Balance          : ${remainingBalanceEth.toFixed(6)} MSTC`);

  console.log(`\nBudget Constraint Verification:`);
  console.log(`  Available Balance                    : 5.000000 MSTC`);
  console.log(`  Max Permitted Expenditure            : 4.000000 MSTC`);
  console.log(`  Mandatory Reserve                    : >= 1.000000 MSTC`);
  console.log(`  Deployment Cost <= 4.0 MSTC?         : ${totalCostEth < 4.0 ? "YES (PASSED)" : "NO (FAILED)"}`);
  console.log(`  Remaining Balance >= 1.0 MSTC?       : ${remainingBalanceEth >= 1.0 ? "YES (PASSED)" : "NO (FAILED)"}`);
  console.log(`=================================================`);
}

main().catch((err) => {
  console.error("Gas estimation failed:", err);
  process.exit(1);
});
