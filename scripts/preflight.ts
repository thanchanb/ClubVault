import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

interface NetworkExpectation {
  expectedChainId: number;
  name: string;
  currency: string;
  explorer: string;
  faucet?: string;
}

const NETWORK_SPECS: Record<string, NetworkExpectation> = {
  mstTestnet: {
    expectedChainId: 91562037,
    name: "MST Testnet",
    currency: "tMSTC",
    explorer: "https://testnet.mstscan.com",
    faucet: "https://faucet.mstblockchain.com",
  },
  mstMainnet: {
    expectedChainId: 4646,
    name: "MST Mainnet",
    currency: "MSTC",
    explorer: "https://mstscan.com",
  },
  hardhat: {
    expectedChainId: 31337,
    name: "Hardhat Local Network",
    currency: "ETH",
    explorer: "N/A (Local)",
  },
};

async function main() {
  console.log("===============================================================");
  console.log(`ClubVault Preflight Diagnostic: [Network: ${network.name}]`);
  console.log("===============================================================");

  const targetSpec = NETWORK_SPECS[network.name] || {
    expectedChainId: 0,
    name: network.name,
    currency: "MSTC",
    explorer: "Unknown",
  };

  let allChecksPassed = true;

  // 1. Check RPC & Chain ID
  let actualChainId = 0;
  try {
    const net = await ethers.provider.getNetwork();
    actualChainId = Number(net.chainId);
    const chainIdHex = await ethers.provider.send("eth_chainId", []);

    console.log(`\n[Check 1] RPC Connectivity & Chain ID:`);
    console.log(`  RPC Endpoint : ${(network.config as any).url || "In-Memory"}`);
    console.log(`  Returned Hex : ${chainIdHex}`);
    console.log(`  Decimal ID   : ${actualChainId}`);

    if (targetSpec.expectedChainId !== 0 && actualChainId === targetSpec.expectedChainId) {
      console.log(`  Status       : ✔ PASS (Matches expected ${targetSpec.expectedChainId})`);
    } else if (targetSpec.expectedChainId === 0) {
      console.log(`  Status       : ℹ INFO (Custom network, chain ID: ${actualChainId})`);
    } else {
      console.log(`  Status       : ❌ FAIL (Expected ${targetSpec.expectedChainId}, got ${actualChainId})`);
      allChecksPassed = false;
    }
  } catch (err: any) {
    console.log(`\n[Check 1] RPC Connectivity & Chain ID:`);
    console.log(`  Status       : ❌ FAIL (Could not connect to RPC: ${err.message})`);
    allChecksPassed = false;
  }

  // 2. Check Latest Block
  try {
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log(`\n[Check 2] Latest Block Height:`);
    console.log(`  Block Number : ${blockNumber}`);
    if (blockNumber >= 0) {
      console.log(`  Status       : ✔ PASS (Network is active and producing blocks)`);
    }
  } catch (err: any) {
    console.log(`\n[Check 2] Latest Block Height:`);
    console.log(`  Status       : ❌ FAIL (${err.message})`);
    allChecksPassed = false;
  }

  // 3. Check Deployer Wallet & Balance (Without exposing private key)
  console.log(`\n[Check 3] Deployer Wallet & Balance:`);
  try {
    const signers = await ethers.getSigners();
    if (signers.length === 0) {
      console.log(`  Deployer     : None configured in .env`);
      console.log(`  Status       : ❌ FAIL (Missing PRIVATE_KEY in .env)`);
      allChecksPassed = false;
    } else {
      const deployer = signers[0];
      const address = await deployer.getAddress();
      const balance = await ethers.provider.getBalance(address);
      const balanceFormatted = ethers.formatEther(balance);

      console.log(`  Address      : ${address}`);
      console.log(`  Balance      : ${balanceFormatted} ${targetSpec.currency}`);

      if (balance > 0n) {
        console.log(`  Status       : ✔ PASS (Wallet is funded and ready for deployment)`);
      } else {
        console.log(`  Status       : ❌ FAIL (Balance is 0.0 ${targetSpec.currency})`);
        if (targetSpec.faucet) {
          console.log(`  Action Needed: Request test tokens at ${targetSpec.faucet} for address ${address}`);
        }
        allChecksPassed = false;
      }
    }
  } catch (err: any) {
    console.log(`  Status       : ❌ FAIL (${err.message})`);
    allChecksPassed = false;
  }

  console.log("\n===============================================================");
  if (allChecksPassed) {
    console.log(`PREFLIGHT RESULT: ✔ ALL CHECKS PASSED FOR ${network.name.toUpperCase()}`);
  } else {
    console.log(`PREFLIGHT RESULT: ❌ PREFLIGHT CHECKS FAILED OR ACTION REQUIRED`);
  }
  console.log("===============================================================");

  if (!allChecksPassed) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Preflight script failed:", err);
  process.exitCode = 1;
});
