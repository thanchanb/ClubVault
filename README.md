# ClubVault 🏛️
**Transparent Club Funds. Member-Approved Spending.**  
*Built for the MST Blockchain BUILDATHON (Round 2)*

[![Live dApp](https://img.shields.io/badge/Live%20dApp-frontend--tau--blue--73.vercel.app-success.svg)](https://frontend-tau-blue-73.vercel.app)
[![MST Mainnet Chain ID: 4646](https://img.shields.io/badge/MST%20Mainnet-4646-red.svg)](https://mstscan.com)
[![EVM Target: Paris](https://img.shields.io/badge/EVM%20Target-Paris-blue.svg)](https://hardhat.org)
[![Hardhat Tests: 71 Passing](https://img.shields.io/badge/Hardhat%20Tests-71%20Passing-success.svg)](test)
[![Frontend: React + Vite + TS](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-purple.svg)](frontend)
[![MST Testnet Chain ID: 91562037](https://img.shields.io/badge/MST%20Testnet-91562037-orange.svg)](https://testnet.mstscan.com)

---

## 🚀 Live Production dApp
- **Live Vercel Website:** **[https://frontend-tau-blue-73.vercel.app](https://frontend-tau-blue-73.vercel.app)**
- **Preferred Wallet:** BridgeKey Extension (MST Mainnet & MST Testnet)
- **Deployment Status:** Production Ready & Verified

---

## 📌 Executive Summary

College clubs, student committees, event teams, hackathon groups, and non-profits often manage shared funds through centralized personal accounts, informal chat groups, and disconnected spreadsheets. Members struggle to verify who approved spending, whether treasury rules were followed, and which transactions actually occurred on-chain.

**ClubVault** is a decentralized treasury platform engineered around the organizational workflows of student clubs and small societies. It replaces opaque chat-based spending with transparent on-chain governance, member approval quorums, safe accounting reserves, two-stage advance/receipt workflows, and optional gas-sponsored voting.

---

## 💡 Key Architectural Differentiators

### 1. Two-Stage Expense Lifecycle: *Approve, then Confirm*
In traditional treasury multisigs (such as Gnosis Safe), reaching an approval threshold immediately disburses 100% of the funds to a recipient. If an off-chain purchase fails or goods are never delivered, the treasury suffers a total loss.

ClubVault addresses this trust gap:
- **Advance Disbursement:** When an advance proposal is approved, only the requested initial advance is disbursed so the recipient can pay vendors.
- **Reserved Accounting:** The remainder stays safely reserved inside the vault balance (`reservedFunds`), preventing double-spending.
- **Receipt Confirmation:** The recipient uploads proof (SHA-256 document hash). Members vote to confirm the receipt.
  - If confirmed by quorum $\rightarrow$ Remainder is disbursed to the recipient.
  - If disputed or timed out $\rightarrow$ Recipient is flagged as blocked until advance funds are repaid, and reserved funds are released back to available balance.

> **Honest Architectural Boundary:** A receipt hash recorded on-chain proves file integrity relative to that specific document hash; it does not independently prove that an off-chain purchase was genuine or that goods arrived. Social consensus by club members remains the verification authority.

### 2. Dual-Track Voting: Direct On-Chain & Gas-Sponsored EIP-712 Relayer
- **V1 (Genesis Vault):** Pure on-chain governance where voters sign direct transactions with BridgeKey or MetaMask.
- **V2 (Gasless-Enabled Vault):** Introduces standard **EIP-712** typed message signing (`voteProposalBySig`). Student members can cast their vote with zero native gas fees—the cryptographic signature is relayed and gas is paid by an application-operated relayer service.

---

## 🌐 Verified MST Mainnet Production Deployment (Chain ID 4646)

The following contracts are deployed and verified on **MST Mainnet** (Chain ID `4646`):

| Contract | Address | Explorer Link | Block Number | Gas Used |
| :--- | :--- | :--- | :--- | :--- |
| **VaultFactoryV2** | `0x57B3f9C17ADfAa10d2Bbc9E2955be41ed2528b58` | [View on MSTScan](https://mstscan.com/address/0x57B3f9C17ADfAa10d2Bbc9E2955be41ed2528b58) | `#21785565` | `3,533,641` |
| **Genesis ClubVaultV2 (2-of-2 Multisig)** | `0x9a81aED1b3D2d4c85A0ea8FC6129D17b2fFed339` | [View on MSTScan](https://mstscan.com/address/0x9a81aED1b3D2d4c85A0ea8FC6129D17b2fFed339) | `#21785567` | `3,040,438` |

- **Network Name:** MST Mainnet
- **Chain ID:** `4646` (`0x1226`)
- **RPC URL:** `https://mariorpc.mstblockchain.com`
- **Native Currency:** `MSTC`
- **Explorer:** `https://mstscan.com`
- **Deployment Record:** [`deployments/mstMainnet.json`](deployments/mstMainnet.json)
- **Financial Audit:** Deployed with only `0.006574 MSTC` total gas expenditure (0.16% of 4 MSTC limit), preserving `4.9934 MSTC` remaining balance.

---

## 🧪 Verified MST Testnet Deployment (Chain ID 91562037)

The following contracts are deployed and verified on MST Testnet (Chain ID `91562037`):

| Contract | Address | Explorer Link |
| :--- | :--- | :--- |
| **Genesis ClubVault (V1)** | `0xECAD385e56299b0aec5A51dB2DdCF0A4746E7c31` | [View on MSTScan](https://testnet.mstscan.com/address/0xECAD385e56299b0aec5A51dB2DdCF0A4746E7c31) |
| **VaultFactory (V1)** | `0xFf1A398eaEAd76dEEA1bF84BDF52e25848369308` | [View on MSTScan](https://testnet.mstscan.com/address/0xFf1A398eaEAd76dEEA1bF84BDF52e25848369308) |
| **Genesis ClubVaultV2 (EIP-712 Gasless)** | `0x8442bF7dE2d0FF9aF4136a83Cf20BE559b6Fb5C9` | [View on MSTScan](https://testnet.mstscan.com/address/0x8442bF7dE2d0FF9aF4136a83Cf20BE559b6Fb5C9) |
| **VaultFactoryV2** | `0x68738EfB0e8B2Dad986a9FF3Db3eF39A0D4Fcfb0` | [View on MSTScan](https://testnet.mstscan.com/address/0x68738EfB0e8B2Dad986a9FF3Db3eF39A0D4Fcfb0) |
| **TestRelayerVault (2-of-2 Live Test Vault)** | `0x90e309A5246B37bBC79224A1449D25CC29ef88bE` | [View on MSTScan](https://testnet.mstscan.com/address/0x90e309A5246B37bBC79224A1449D25CC29ef88bE) |

- **Network Name:** MST Testnet
- **Chain ID:** `91562037` (`0x5752035`)
- **RPC URL:** `https://testnetrpc.mstblockchain.com`
- **Native Token:** `tMSTC` (18 decimals)
- **Explorer:** `https://testnet.mstscan.com`

*Provenance Note:* V1 contracts provide battle-tested direct wallet voting. V2 contracts extend functionality with EIP-712 signature verification (`voteProposalBySig`) for gas-sponsored voting. Both coexist without interference.

---

## 🏗️ Architecture & Data Flow

```
                                      ┌─────────────────────────────────┐
                                      │   Connected Member (BridgeKey)  │
                                      └────────────────┬────────────────┘
                                                       │
                           Direct Voting (V1 & V2)     │ Gasless Vote (V2 Only)
                                     ┌─────────────────┴─────────────────┐
                                     │                                   │
                                     ▼                                   ▼
                         [ Direct Transaction ]              [ EIP-712 Typed Signature ]
                                 (User pays gas)                     (0 gas for user)
                                     │                                   │
                                     │                                   ▼
                                     │                     ┌───────────────────────────┐
                                     │                     │ ClubVault Relayer Backend │
                                     │                     │ - Rate limiting           │
                                     │                     │ - Payload validation      │
                                     │                     │ - Preflight simulation    │
                                     │                     └─────────────┬─────────────┘
                                     │                                   │ (Relayer pays gas)
                                     ▼                                   ▼
                     ┌───────────────────────────────────────────────────────────┐
                     │              ClubVaultV2 Smart Contract                   │
                     │  - Replay protection (per-member sequential nonces)       │
                     │  - ECDSA signature recovery (recovers voter address)      │
                     │  - Quorum verification & reservedFunds accounting         │
                     │  - Event emission (ProposalVoted, VoteRelayed)            │
                     └───────────────────────────────────────────────────────────┘
```

---

## 🔒 Relayer Security & Guardrails

The ClubVault Relayer (`relayer/service.ts`, `relayer/server.ts`) is designed with defense-in-depth:
1. **No Client-Supplied Voter Trust:** The smart contract recovers the voter address directly via `ECDSA.recover(digest, signature)`. If the recovered address does not match `voter`, execution reverts with `InvalidSignature()`.
2. **Replay & Fork Protection:** Signatures include `proposalId`, `approve`, `nonce`, and `deadline`, bound to the `chainId` and `verifyingContract` address. Nonces increment on every successful vote; replayed signatures revert immediately.
3. **Preflight Simulation:** Before broadcasting, the relayer simulates the execution using `staticCall`. Reverts (such as non-member, already voted, expired deadline) are intercepted and rejected without spending relayer gas.
4. **Rate Limiting:** IP- and address-based throttling limits requests to 10 per minute to prevent DoS.
5. **Zero Secret Leakage:** The sponsor key is loaded strictly from a server-side environment variable (`RELAYER_PRIVATE_KEY`). It is never bundled into client code, logged, or exposed over endpoints.

---

## 🛠️ Technology Stack

- **Smart Contracts:** Solidity `0.8.24`, OpenZeppelin Contracts v5.6.1 (`ECDSA`), Hardhat TypeScript.
- **EVM Target:** `evmVersion: "paris"` (ensures 100% compatibility across MST node clients and avoids unsupported Cancun opcodes like `mcopy`).
- **Relayer Service:** Node.js, TypeScript, Ethers v6, standalone HTTP server (zero external web framework dependencies).
- **Frontend dApp:** React 18, Vite, TypeScript, Ethers v6, Lucide icons, custom responsive CSS design system.
- **Wallet Support:** BridgeKey (official MST wallet) with EIP-6963 provider discovery and standard EVM injected fallback.

---

## 🚀 How to Run Locally

### 1. Installation
```bash
git clone https://github.com/thanchanbhumij/ClubVault.git
cd ClubVault
npm install
cd frontend && npm install && cd ..
```

### 2. Run Smart Contract Compilation
```bash
npx hardhat compile
```
*Output: `Compiled 3 Solidity files successfully (evm target: paris)`.*

### 3. Run Automated Tests
```bash
npx hardhat test
```
*Output: `71 passing` covering unit tests, invariant checks, V2 relayer security, double-voting prevention, and backend protections.*

### 4. Run the Local End-to-End Demonstration Script
```bash
npx hardhat run scripts/demo_local_relayer_e2e.ts
```
*Executes the complete scenario: vault creation, treasury funding, proposal creation, off-chain EIP-712 signing, relayer broadcast, quorum transition, replay attack rejection, and on-chain disbursement.*

### 5. Start the Relayer Service (Local Development)
```bash
export CHAIN_ID=31337
export RELAYER_PORT=3001
export ALLOWLISTED_VAULTS=0xa16E02E87b7454126E5E10d957A927A7F5B5d2be
npx ts-node relayer/server.ts
```

### 6. Start Frontend Development Server
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🎤 20-Second Judge Pitch & Live Demo Script

### The 20-Second Problem Pitch
> *"College clubs, student societies, and event teams manage millions in shared funds using personal bank accounts, spreadsheets, and messaging apps. When money is spent, nobody can verify who authorized it, whether treasury rules were followed, or if the funds actually went to the vendor. ClubVault brings transparent, member-approved governance to MST Blockchain—where spending requires on-chain quorum, advances require proof before final release, and students can vote without paying gas."*

### Demo Steps (2-3 Minutes)
1. **Show Live Genesis Vault:** Open the dashboard showing Genesis Vault (`0xECAD...7c31`) verified on MST Testnet with live on-chain balance and quorum rules.
2. **Create Proposal:** Submit an expense proposal ("3D Printer Filament - 1.5 tMSTC"). Show that the proposer's vote is recorded and status is `PENDING`.
3. **Show Dual Voting Modes:**
   - Demonstrate **Direct Voting** with BridgeKey (requires gas).
   - Demonstrate **Gasless Voting (EIP-712 Relayer)**: Open the Gasless Vote modal. Explain that the member only signs an off-chain message; the application relayer submits the transaction and pays the gas fee.
4. **Quorum & Execution:** Show the proposal transition from `PENDING` to `APPROVED` once quorum is reached. Click **Execute Disbursement** and verify funds arrive in the vendor wallet.
5. **Explorer Verification:** Click the transaction hash to open MSTScan Explorer, showing the confirmed on-chain event ledger.

---

## 📋 Security Status & Limitations

- **Audit Status:** This codebase has undergone internal security reviews, threat modeling, and 71 automated regression tests. It has **NOT** undergone a third-party commercial audit. It is a hackathon-ready prototype for testing and demonstration on MST Testnet.
- **Relayer Classification:** The relayer is an **application-operated relayer service**, not an official native MST protocol paymaster.
- **File Storage:** Receipt documents are hashed locally using browser SHA-256. Only the 32-byte cryptographic hash is recorded on-chain; private receipt contents are kept off-chain.
