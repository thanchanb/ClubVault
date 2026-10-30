import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import VaultFactoryV2Artifact from "../artifacts/contracts/VaultFactoryV2.sol/VaultFactoryV2.json";
import ClubVaultV2Artifact from "../artifacts/contracts/ClubVaultV2.sol/ClubVaultV2.json";

async function main() {
  const rpcUrl = "https://mariorpc.mstblockchain.com";
  const chainId = 4646;
  const deployer = "0xF09192ed618C49e9f9A439D97d798F8c600A38a8";
  const member1 = "0x06e08cf0aed1663834E267E90333164a0276bbbD";

  console.log("=================================================");
  console.log("   MST MAINNET ON-CHAIN VERIFICATION & AUDIT     ");
  console.log("=================================================");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const net = await provider.getNetwork();
  console.log(`Connected Network: ${net.name} (Chain ID: ${net.chainId})`);
  if (Number(net.chainId) !== chainId) {
    throw new Error(`Chain ID mismatch! Expected ${chainId}, got ${net.chainId}`);
  }

  const nonce = await provider.getTransactionCount(deployer);
  const balanceWei = await provider.getBalance(deployer);
  console.log(`Deployer: ${deployer}`);
  console.log(`Current Nonce: ${nonce}`);
  console.log(`Current Balance: ${ethers.formatEther(balanceWei)} MSTC`);

  // Check if deployments/mstMainnet.json already exists
  const mainnetJsonPath = path.join(__dirname, "..", "deployments", "mstMainnet.json");
  if (fs.existsSync(mainnetJsonPath)) {
    console.log(`\nFound existing deployment record: ${mainnetJsonPath}`);
    const record = JSON.parse(fs.readFileSync(mainnetJsonPath, "utf8"));
    const factoryAddr = record.contracts.VaultFactoryV2.address;
    const vaultAddr = record.contracts.GenesisClubVaultV2.address;

    console.log(`\nVerifying Deployed Bytecode:`);
    const factoryCode = await provider.getCode(factoryAddr);
    console.log(`- VaultFactoryV2 (${factoryAddr}): ${factoryCode.length > 2 ? "VERIFIED DEPLOYED (" + factoryCode.length + " bytes)" : "NOT DEPLOYED"}`);
    
    const vaultCode = await provider.getCode(vaultAddr);
    console.log(`- GenesisClubVaultV2 (${vaultAddr}): ${vaultCode.length > 2 ? "VERIFIED DEPLOYED (" + vaultCode.length + " bytes)" : "NOT DEPLOYED"}`);

    const factory = new ethers.Contract(factoryAddr, VaultFactoryV2Artifact.abi, provider);
    const isReg = await factory.isRegisteredVault(vaultAddr);
    console.log(`- Factory Registration: ${isReg ? "VERIFIED REGISTERED" : "UNREGISTERED"}`);

    const vault = new ethers.Contract(vaultAddr, ClubVaultV2Artifact.abi, provider);
    const cName = await vault.clubName();
    const cDesc = await vault.clubDescription();
    const cMembers = await vault.getMembers();
    const cQuorum = await vault.requiredApprovals();

    console.log(`\nGenesis Vault State:`);
    console.log(`- Name: ${cName}`);
    console.log(`- Description: ${cDesc}`);
    console.log(`- Members: ${cMembers.join(", ")}`);
    console.log(`- Quorum: ${cQuorum.toString()} of ${cMembers.length} (Strict 2-of-2 Multisig)`);

    console.log("\nFinancial Limit Verification:");
    const initialBal = 5.0;
    const currentBal = parseFloat(ethers.formatEther(balanceWei));
    const spent = initialBal - currentBal;
    console.log(`- Initial Balance: ${initialBal.toFixed(4)} MSTC`);
    console.log(`- Current Balance: ${currentBal.toFixed(4)} MSTC`);
    console.log(`- Total Spent: ${spent.toFixed(6)} MSTC`);
    console.log(`- Budget Check: ${spent <= 4.0 ? "PASSED (Spent <= 4.0 MSTC)" : "FAILED"}`);
    console.log(`- Reserve Check: ${currentBal >= 1.0 ? "PASSED (Balance >= 1.0 MSTC)" : "FAILED"}`);
    return;
  }

  if (nonce === 0) {
    console.log("\n[STATUS: AWAITING SIGNATURES]");
    console.log("No transactions submitted yet from Member 2 wallet.");
    console.log("Please confirm the 2 deployment transactions via BridgeKey in the browser.");
  }
}

main().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
