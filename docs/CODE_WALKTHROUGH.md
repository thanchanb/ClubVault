# ClubVault — Code Walkthrough for Judges
**Transparent Club Funds. Member-Approved Spending.**  
*Comprehensive Technical & Architectural Guide for MST Blockchain BUILDATHON*

---

## 1. Project Overview & Philosophy

**ClubVault** is a decentralized treasury management system designed for student clubs, university committees, event teams, and community organizations.

### The Problem
Traditional student clubs or small teams pool money into one person's bank account or crypto wallet. This creates two distinct failure modes:
1. **Centralized custody risk:** The person holding the keys can vanish or spend without consent.
2. **The "Purchase Receipt" trust gap:** Traditional multisigs transfer 100% of the funds the instant a threshold is reached. If the recipient claims they are buying equipment, takes the money, and never delivers, the club loses everything.
3. **The Gas Barrier:** Student members often do not hold native gas tokens (`tMSTC`) just to participate in a routine club vote.

### The Solution
1. **Configurable Member Quorum:** All expenditures require verifiable on-chain approvals from authorized members.
2. **Approve, then Confirm (Advance/Receipt Subsystem):** Only an initial advance is disbursed. The remainder stays reserved in the vault until the recipient uploads proof and members vote to confirm the receipt.
3. **Dual-Track Voting (V1 Direct + V2 Gasless EIP-712):** Members can either vote directly with their own wallet, or sign an off-chain EIP-712 typed vote that is relayed and gas-sponsored by an application relayer.

---

## 2. Directory Structure & Architecture

```
/ClubVault
├── contracts/
│   ├── ClubVault.sol            # Core V1 single-vault contract (governance, accounting, advances)
│   ├── ClubVaultV2.sol          # V2 vault extending V1 with EIP-712 gas-sponsored voting
│   ├── VaultFactory.sol         # Factory registry deploying and indexing isolated ClubVault instances
│   ├── VaultFactoryV2.sol       # V2 factory deploying and indexing ClubVaultV2 instances
│   └── test/
│       └── MaliciousReentrant.sol # Reentrancy exploit simulation contract
├── relayer/
│   ├── types.ts                 # TypeScript interfaces for Relayer payload, config, and responses
│   ├── service.ts               # Core RelayerService: payload validation, rate limiting, preflight staticCall
│   └── server.ts                # Standalone HTTP server (GET /health, POST /api/relay-vote)
├── scripts/
│   ├── preflight.ts             # Preflight diagnostic checking RPC, chain ID, and deployer balance
│   ├── check_wallet.ts          # Read-only wallet diagnostic
│   ├── deploy.ts                # V1 deployment script
│   └── demo_local_relayer_e2e.ts# Repeatable local end-to-end demonstration runner
├── test/
│   ├── ClubVault.test.ts        # 44 unit, invariant, timeout, dispute, deposit, and CSV isolation tests
│   ├── ClubVaultV2Relayer.test.ts # 13 tests for V2 EIP-712 voting, replay defence, and cross-vault checks
│   └── RelayerBackend.test.ts   # 14 tests for Relayer validation, simulation, rate limiting, and HTTP security
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── GaslessVoteModal.tsx # EIP-712 signature modal with live nonce query & relayer broadcast
│   │   │   ├── BridgeKeyModal.tsx   # BridgeKey wallet connection & network switcher
│   │   │   ├── VaultHeroExperience.tsx # Main dashboard hero experience
│   │   │   └── ProposalDetailModal.tsx # Proposal inspector & direct vote triggers
│   │   ├── contracts/
│   │   │   ├── config.ts        # Network configs, addresses, and EIP-712 type declarations
│   │   │   ├── ClubVaultABI.json
│   │   │   ├── ClubVaultV2ABI.json
│   │   │   └── VaultFactoryABI.json
│   │   ├── utils/wallet.ts      # EIP-6963 wallet provider detection & helpers
│   │   └── App.tsx              # Main state machine, treasury metrics, CSV export, and lifecycle
│   └── package.json
├── hardhat.config.ts            # EVM target: "paris" (Solidity 0.8.24) avoiding Cancun opcode incompatibilities
├── README.md                    # Project documentation & quickstart
└── .env.example                 # Clean template for environment variables
```

---

## 3. Deep-Dive: Contract Engineering

### `ClubVault.sol` (Core Invariants)
- **Safe Accounting (`reservedFunds`):**
  When a proposal is approved or an advance is disbursed, the requested amount is locked into `reservedFunds`. The contract invariant strictly enforces:
  $$\text{balance} \ge \text{reservedFunds}$$
  $$\text{availableFunds} = \text{balance} - \text{reservedFunds}$$
  This mathematically guarantees that an organization cannot approve more spending than it holds, preventing treasury insolvencies.
- **Bounded Membership:** Hard-capped at 50 members (`MAX_MEMBERS = 50`) to guarantee that governance loops and voting events never hit block gas limits.
- **Reentrancy Protection:** All fund disbursements use OpenZeppelin `ReentrancyGuard` and follow the Checks-Effects-Interactions pattern.

### `ClubVaultV2.sol` (EIP-712 Relayer Support)
- **Domain Separator:**
  ```solidity
  bytes32 public constant EIP712_DOMAIN_TYPEHASH = keccak256(
      "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
  );
  ```
  Dynamically binds `block.chainid` and `address(this)` to prevent cross-chain or cross-vault signature replay.
- **TypeHash:**
  ```solidity
  bytes32 public constant VOTE_TYPEHASH = keccak256(
      "VoteProposal(address voter,uint256 proposalId,bool approve,uint256 nonce,uint256 deadline)"
  );
  ```
- **Cryptographic Recovery (`voteProposalBySig`):**
  1. Verifies `block.timestamp <= _deadline`.
  2. Constructs typed digest using voter's current nonce: `nonces[_voter]`.
  3. Recovers signer via `ECDSA.recover(digest, _signature)`.
  4. Requires `recovered == _voter` and `isMember[_voter] == true`.
  5. Increments `nonces[_voter]++`.
  6. Executes internal `_voteProposal(...)`. EVM atomicity guarantees that if the proposal is already approved or voted, the transaction reverts and the nonce increment rolls back cleanly.

---

## 4. Key Questions Judges Might Ask

1. **"Why did you choose EVM target 'paris'?"**  
   *Answer:* "Solidity 0.8.24 defaults to Cancun, which generates new opcodes like `mcopy` (0x5e). However, many EVM networks (including MST Testnet) run Paris/Shanghai EVM execution clients. Targeting Paris ensures 100% bytecode compatibility without risk of execution reverts from unsupported opcodes."

2. **"How does ClubVault prevent signature replay attacks in V2?"**  
   *Answer:* "Each member has an isolated on-chain `nonce` counter. The signed EIP-712 struct includes the exact nonce. When a vote is relayed, the contract consumes the nonce. If anyone tries to replay the signature, the contract hashes with the new nonce (nonce + 1), causing `ECDSA.recover` to return an address that does not match the voter, reverting with `InvalidSignature()`."

3. **"Can the relayer censor or forge member votes?"**  
   *Answer:* "No. Because the contract mathematically recovers the voter from the cryptographic signature, the relayer cannot forge an approval or change a rejection into an approval. If the relayer refuses to submit a vote, the member always has the direct on-chain fallback button (`voteProposal`) to broadcast the transaction directly from their wallet."

4. **"What is actually verified on-chain versus off-chain?"**  
   *Answer:* "On-chain: treasury balances, member whitelist, proposal quorum, approval thresholds, fund disbursements, and document hash integrity. Off-chain: physical invoice inspection, vendor legitimacy, and real-world delivery."
