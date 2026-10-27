import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const rpcUrl = process.env.MST_TESTNET_RPC_URL || "https://testnetrpc.mstblockchain.com";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey || privateKey.startsWith("00000000")) {
    console.log("No custom PRIVATE_KEY detected in .env.");
    console.log("Generating a fresh, dedicated development wallet...");
    const wallet = ethers.Wallet.createRandom(provider);
    console.log("\n=======================================================");
    console.log("Generated Dedicated Testnet Wallet:");
    console.log(`Address     : ${wallet.address}`);
    console.log(`Private Key : ${wallet.privateKey}`);
    console.log("=======================================================");
    console.log("To fund this wallet with testnet tMSTC tokens:");
    console.log("1. Visit: https://faucet.mstblockchain.com");
    console.log(`2. Paste your address: ${wallet.address}`);
    console.log("3. Add PRIVATE_KEY to your .env file in /Users/thanchanbhumij/ClubVault/.env");
    console.log("=======================================================\n");
  } else {
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    console.log("\n=======================================================");
    console.log("Configured Testnet Wallet:");
    console.log(`Address : ${wallet.address}`);
    console.log(`Balance : ${ethers.formatEther(balance)} tMSTC`);
    console.log("=======================================================\n");
  }
}

main().catch(console.error);
