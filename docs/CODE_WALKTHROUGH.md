# ClubVault — Code Walkthrough for Judges

This walkthrough explains the architecture, design choices, and every file and function in plain English. It is structured so that a student engineer can clearly walk judges through each component with confidence.

---

## 1. Project Overview & Philosophy

**ClubVault** is a decentralized treasury management system designed for college clubs, student hackathon teams, residential societies, and community organizations.

### The Problem
Traditional student clubs or small teams usually pool money into one person's bank account or UPI/crypto wallet. This creates two failure points:
1. **Centralized custody risk:** The person holding the keys or account can vanish or spend without consent.
2. **The "Purchase Receipt" trust gap:** Traditional multisigs (like Safe) transfer 100% of the funds the instant a threshold is reached. If the recipient claims they are buying a 3D printer for $500, takes the money, and never buys it, the club loses everything.

### The Solution: *Approve, then Confirm*
ClubVault introduces a two-stage disbursement model:
1. **Stage 1 (Advance Disbursement):** When members vote to approve an expense, only a configurable advance (e.g. 30% or 50%, determined by `advanceBps`) is released so the recipient can initiate the purchase.
2. **Stage 2 (Receipt Confirmation):** The remaining balance stays locked inside the vault. The recipient submits proof (an off-chain document hash/IPFS CID), and club members must vote to confirm receipt. Only after quorum confirms receipt is the remainder disbursed. If rejected or if the confirmation window expires, the remainder returns to the vault's available balance.

---

## 2. Directory Structure & Architecture

```
/ClubVault
├── contracts/               # Solidity smart contracts
│   ├── ClubVault.sol        # Core single-vault contract (funds, voting, advance/confirm flow)
│   ├── VaultFactory.sol     # Factory allowing anyone to spin up their own vault in 1 click
│   └── test/
│       └── MaliciousReentrant.sol # Exploit simulation contract to verify reentrancy defense
├── scripts/                 # Automation & network verification scripts
│   ├── preflight.ts         # Preflight diagnostic checking RPC, chain ID, and deployer balance
│   ├── check_wallet.ts      # Read-only wallet diagnostic
│   └── deploy.ts            # Production deployment script with explorer logging
├── test/                    # Comprehensive automated test suites (Mocha + Chai + Ethers)
│   ├── ClubVault.test.ts    # 24 unit, invariant, timeout, dispute, and reentrancy tests
│   └── VaultFactory.test.ts # Factory creation, registry indexing, and isolation tests
├── frontend/                # React + Vite + TypeScript web application
│   ├── src/                 # UI components, state management, and contract bindings
│   └── index.html
├── docs/                    # Student explanations, demo scripts, and judge QA
│   └── CODE_WALKTHROUGH.md  # Plain-English guide for judges
├── hardhat.config.ts        # EVM compiler settings (Solidity 0.8.20, Paris target) & network entries
├── README.md                # Project documentation
├── .gitignore               # Strict exclusion of .env, secrets, and build artifacts
└── .env.example             # Template with empty variables for security
```

---

## 3. Phase 0 File Explanations (Setup & Preflight)

### `hardhat.config.ts`
- **What it does:** Configures the development environment, Solidity compiler, and blockchain networks.
- **Why Solidity 0.8.20 and `evmVersion: "paris"`?**
  Solidity 0.8.20 introduced the `PUSH0` opcode by default (from the Ethereum Shanghai upgrade). While modern nodes support it, some EVM networks or block explorers can reject bytecode containing newer opcodes. Choosing `evmVersion: "paris"` is the most conservative and reliable target: it compiles clean, gas-efficient bytecode that works universally across both MST Testnet (Chain ID 91562037) and MST Mainnet (Chain ID 4646).
- **Network Entries:**
  - `mstTestnet`: RPC `https://testnetrpc.mstblockchain.com`, Chain ID `91562037`.
  - `mstMainnet`: RPC `https://mariorpc.mstblockchain.com/`, Chain ID `4646`.
  - Accounts are loaded safely from environment variables without hardcoding.

### `scripts/preflight.ts`
- **What it does:** A read-only diagnostic script executed before any deployment.
- **How it works:**
  1. Calls `eth_chainId` directly on the connected RPC and verifies that it exactly equals `91562037` (Testnet) or `4646` (Mainnet).
  2. Queries `eth_blockNumber` to confirm the network is healthy and actively mining/producing blocks.
  3. Checks the deployer account balance to verify that sufficient native tokens (`tMSTC` or `MSTC`) exist for gas.
  4. Never logs or prints private keys. Prints a clear `PASS` / `FAIL` summary.

### `.gitignore` and `.env.example`
- **What it does:** Guarantees zero secret leakage.
- **How it works:** `.gitignore` explicitly excludes `.env`, `node_modules`, `cache`, `artifacts`, and build outputs. `.env.example` provides clean, empty template keys for other developers and judges.

---

## 4. Key Questions Judges Might Ask About Phase 0

1. **"Why did you choose `evmVersion: 'paris'` instead of the default Shanghai or Cancun?"**
   *Answer:* "We chose Paris as a conservative, battle-tested EVM target. While MST Testnet supports Shanghai opcodes like PUSH0, setting Paris guarantees complete forward and backward compatibility across all node clients and block explorers without risk of deployment reverts."

2. **"How do you ensure you never deploy to Mainnet accidentally?"**
   *Answer:* "Our Hardhat config separates `mstTestnet` and `mstMainnet` by distinct chain IDs. Our `preflight.ts` script checks `eth_chainId` against expected constants before any action, and our deployment process requires an explicit, separate flag."
