# ClubVault 🏛️

**Decentralized Multi-Member Treasury & Expense Management on MST Blockchain**  
*Built for the MST Blockchain Buildathon 2.0 (Round 2)*

---

## 📌 Executive Summary

ClubVault is a decentralized treasury designed for college clubs, student hackathon teams, residential societies, and community groups. Funds sit directly in a transparent smart contract on the MST Blockchain.

**Key Rule:** No admin or treasurer can unilaterally move money. Spending requires member consensus, and payments employ a unique two-stage security model: **Approve, then Confirm**.

---

## 💡 The Core Differentiator: *Approve, then Confirm*

In traditional treasury multisigs, reaching an approval threshold immediately releases 100% of the funds to the recipient. If an off-chain purchase fails or goods are never delivered, the treasury suffers a total loss.

**ClubVault solves this trust gap:**
1. **Advance Payment:** When an expense proposal is approved, only an initial advance (`advanceBps`, e.g. 30% to 50%) is disbursed so the recipient can pay for goods.
2. **Locked Remainder:** The remainder stays reserved inside the vault.
3. **Receipt Confirmation:** The recipient submits proof (document hash/IPFS CID). Members vote to confirm receipt.
   - If confirmed by quorum $\rightarrow$ Remainder is disbursed to the recipient.
   - If rejected / disputed $\rightarrow$ Remainder is returned to the vault balance.
   - If confirmation window expires $\rightarrow$ Remainder is automatically returned to the vault.

> **Honest Architectural Boundary:** A receipt confirmation is a member governance decision (social consensus), not cryptographic proof that an off-chain purchase occurred. Smart contracts enforce voting thresholds and reserved accounting; they cannot independently verify real-world logistics.

---

## 🌐 Supported MST Networks

| Parameter | MST Testnet | MST Mainnet |
| :--- | :--- | :--- |
| **Chain ID** | `91562037` | `4646` |
| **RPC Endpoint** | `https://testnetrpc.mstblockchain.com` | `https://mariorpc.mstblockchain.com/` |
| **Native Token** | `tMSTC` | `MSTC` |
| **Block Explorer**| [https://testnet.mstscan.com](https://testnet.mstscan.com) | [https://mstscan.com](https://mstscan.com) |
| **Faucet** | [https://faucet.mstblockchain.com](https://faucet.mstblockchain.com) | N/A |

---

## 🛠️ Technology Stack

- **Smart Contracts:** Solidity `^0.8.20`, OpenZeppelin Contracts v5 (`ReentrancyGuard`), Hardhat TypeScript.
- **EVM Target:** `evmVersion: "paris"` (conservative target providing broad compatibility across node clients).
- **Frontend dApp:** React 18, Vite, TypeScript, Ethers v6, custom vanilla CSS design system.
- **Wallet Support:** BridgeKey (official MST wallet) and MetaMask / EIP-1193 wallets.

---

## 🚀 Quickstart Guide

### 1. Installation
```bash
git clone <repo-url> ClubVault
cd ClubVault
npm install
```

### 2. Environment Configuration
Copy the example environment file and add your deployer private key:
```bash
cp .env.example .env
```

### 3. Run Preflight Diagnostic
```bash
# Diagnostic against MST Testnet
npx hardhat run scripts/preflight.ts --network mstTestnet

# Diagnostic against MST Mainnet (read-only)
npx hardhat run scripts/preflight.ts --network mstMainnet
```

### 4. Run Automated Tests
```bash
npm test
```

### 5. Run Frontend Development Server
```bash
cd frontend
npm install
npm run dev
```

---

## 📜 Documentation

- [`docs/CODE_WALKTHROUGH.md`](docs/CODE_WALKTHROUGH.md): Plain-English explanation of contracts, functions, and design choices for hackathon judges.
