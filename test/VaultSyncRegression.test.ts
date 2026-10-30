import { expect } from "chai";
import { ethers } from "hardhat";
import { ClubVault } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Vault State Synchronization & Zero Proposal Invariant Tests", function () {
  let vault: ClubVault;
  let owner: SignerWithAddress;
  let member1: SignerWithAddress;
  let member2: SignerWithAddress;

  beforeEach(async function () {
    [owner, member1, member2] = await ethers.getSigners();
    const ClubVaultArtifact = await ethers.getContractFactory("ClubVault");
    vault = await ClubVaultArtifact.deploy(
      "Web3 Builders Club",
      "Decentralized treasury for hackathon expenses and grants",
      [owner.address, member1.address, member2.address],
      2
    );
    await vault.waitForDeployment();
  });

  it("should confirm initial proposalCount is 0 on a freshly deployed vault", async function () {
    const count = await vault.proposalCount();
    expect(count).to.equal(0n);
  });

  it("should revert with ProposalNotFound when executing non-existent proposal ID on empty vault", async function () {
    // Exact simulation of clicking execute on mock proposal ID 3 on a fresh contract
    await expect(vault.executeProposal(3))
      .to.be.revertedWithCustomError(vault, "ProposalNotFound")
      .withArgs(3);

    // Also for proposal ID 1 and 0
    await expect(vault.executeProposal(1))
      .to.be.revertedWithCustomError(vault, "ProposalNotFound")
      .withArgs(1);

    await expect(vault.executeProposal(0))
      .to.be.revertedWithCustomError(vault, "ProposalNotFound")
      .withArgs(0);
  });

  it("should simulate syncOnChainVault logic and verify mock proposals are cleared when proposalCount is 0", async function () {
    // Simulated pre-existing UI mock proposals state
    const mockProposals = [
      { id: 1, description: "Mock proposal 1", status: "EXECUTED" },
      { id: 2, description: "Mock proposal 2", status: "RECEIPT_PENDING_CONFIRMATION" },
      { id: 3, description: "Mock proposal 3", status: "APPROVED" },
    ];

    let uiProposalsState = [...mockProposals];
    expect(uiProposalsState.length).to.equal(3);

    // Run the updated syncOnChainVault algorithm
    const count = Number(await vault.proposalCount());
    const loaded: any[] = [];
    for (let i = 1; i <= count; i++) {
      const p = await vault.getProposal(i);
      loaded.push(p);
    }
    // State is always updated with loaded (clearing mock data when count is 0)
    uiProposalsState = loaded.reverse();

    expect(uiProposalsState.length).to.equal(0);
    expect(uiProposalsState).to.deep.equal([]);
  });

  it("should correctly populate synchronized UI state when real on-chain proposals are created", async function () {
    // Deposit funds so proposals can be created
    await vault.deposit({ value: ethers.parseEther("5.0") });

    // Create an on-chain proposal
    await vault.connect(member1).createProposal(
      0, // STANDARD_PAYMENT
      member2.address,
      ethers.parseEther("1.5"),
      "Hackathon catering invoice",
      0,
      0
    );

    const count = Number(await vault.proposalCount());
    expect(count).to.equal(1);

    const loaded: any[] = [];
    for (let i = 1; i <= count; i++) {
      const p = await vault.getProposal(i);
      loaded.push({
        id: Number(p.id),
        amount: ethers.formatEther(p.amount),
        description: p.description,
        recipient: p.recipient,
      });
    }

    const uiProposalsState = loaded.reverse();
    expect(uiProposalsState.length).to.equal(1);
    expect(uiProposalsState[0].id).to.equal(1);
    expect(uiProposalsState[0].description).to.equal("Hackathon catering invoice");
    expect(uiProposalsState[0].amount).to.equal("1.5");
  });

  describe("Deposit Amount Validation & ethers.parseEther Invariant Tests", function () {
    // Pure validator matching frontend implementation exactly
    function validateDepositInput(raw: string): { isValid: boolean; parsedWei?: bigint; error?: string } {
      const trimmed = raw ? raw.trim() : "";
      if (!trimmed) {
        return { isValid: false, error: "Please enter a deposit amount." };
      }
      if (!/^\d+(\.\d+)?$/.test(trimmed)) {
        return { isValid: false, error: "Amount must be a valid positive number with no negative signs or symbols." };
      }
      try {
        const wei = ethers.parseEther(trimmed);
        if (wei <= 0n) {
          return { isValid: false, error: "Deposit amount must be strictly greater than zero." };
        }
        return { isValid: true, parsedWei: wei };
      } catch {
        return { isValid: false, error: "Invalid decimal precision (maximum 18 decimal places supported)." };
      }
    }

    it("should reject empty, whitespace, and nullish inputs", function () {
      expect(validateDepositInput("").isValid).to.be.false;
      expect(validateDepositInput("   ").isValid).to.be.false;
      expect(validateDepositInput("").error).to.include("Please enter a deposit amount");
    });

    it("should reject negative numbers, signs, and non-numeric inputs", function () {
      expect(validateDepositInput("-5").isValid).to.be.false;
      expect(validateDepositInput("-0.1").isValid).to.be.false;
      expect(validateDepositInput("+1").isValid).to.be.false;
      expect(validateDepositInput("abc").isValid).to.be.false;
      expect(validateDepositInput("5tMSTC").isValid).to.be.false;
      expect(validateDepositInput("$5.0").isValid).to.be.false;
      expect(validateDepositInput("1e-5").isValid).to.be.false;
    });

    it("should reject zero values", function () {
      expect(validateDepositInput("0").isValid).to.be.false;
      expect(validateDepositInput("0.0").isValid).to.be.false;
      expect(validateDepositInput("0.000000000000000000").isValid).to.be.false;
      expect(validateDepositInput("0").error).to.include("strictly greater than zero");
    });

    it("should reject invalid decimal formats and >18 decimal precision", function () {
      expect(validateDepositInput("1.0.0").isValid).to.be.false;
      expect(validateDepositInput("1..5").isValid).to.be.false;
      expect(validateDepositInput(".5").isValid).to.be.false; // Must start with digit
      // 19 decimal places
      expect(validateDepositInput("1.0000000000000000001").isValid).to.be.false;
      expect(validateDepositInput("1.0000000000000000001").error).to.include("precision");
    });

    it("should accept valid positive amounts and convert directly via ethers.parseEther without floating point loss", function () {
      const testCases = [
        { input: "0.1", expectedWei: 100000000000000000n },
        { input: "0.5", expectedWei: 500000000000000000n },
        { input: "1.0", expectedWei: 1000000000000000000n },
        { input: "2", expectedWei: 2000000000000000000n },
        { input: "5.0", expectedWei: 5000000000000000000n },
        { input: "  10.25  ", expectedWei: 10250000000000000000n },
      ];

      for (const tc of testCases) {
        const res = validateDepositInput(tc.input);
        expect(res.isValid).to.be.true;
        expect(res.parsedWei).to.equal(tc.expectedWei);
        // Verify roundtrip formatEther matches trimmed input exactly
        expect(ethers.formatEther(res.parsedWei!)).to.equal(
          tc.input.trim().includes(".") ? tc.input.trim().replace(/\.0$/, ".0") : tc.input.trim() + ".0"
        );
      }
    });

    it("should verify that calling deposit() with validated parseEther value updates vault balance", async function () {
      const validation = validateDepositInput("2.5");
      expect(validation.isValid).to.be.true;

      const initialBal = await ethers.provider.getBalance(await vault.getAddress());
      expect(initialBal).to.equal(0n);

      await expect(vault.deposit({ value: validation.parsedWei! }))
        .to.emit(vault, "FundsDeposited")
        .withArgs(owner.address, validation.parsedWei!, validation.parsedWei!);

      const finalBal = await ethers.provider.getBalance(await vault.getAddress());
      expect(finalBal).to.equal(validation.parsedWei!);
      expect(await vault.availableFunds()).to.equal(validation.parsedWei!);
    });
  });

  describe("Transaction State Isolation & CSV Export Invariant Tests", function () {
    // Pure CSV generator matching frontend App.tsx exportLedgerToCSV implementation
    function generateLedgerCSV(
      isLive: boolean,
      vaultAddr: string,
      liveTxs: any[],
      demoTxs: any[],
      proposalsList: any[]
    ): string {
      const activeTxs = isLive ? liveTxs : demoTxs;
      const activeProps = proposalsList;

      const headers = [
        "Date/Time (UTC)",
        "Type",
        "Amount",
        "Counterparty / Recipient",
        "Description",
        "Status",
        "Transaction Hash",
        "Receipt Hash / CID",
      ];

      const metadataRows = [
        `# ClubVault Treasury Audit Trail Ledger`,
        `# Network: ${isLive ? "MST Testnet (Chain ID: 91562037)" : "Demo Simulation Mode"}`,
        `# Vault Contract: ${vaultAddr}`,
        `# Export Timestamp: 2026-10-29T20:00:00.000Z`,
        `# Verification Status: ${isLive ? "On-Chain Verified Records Only" : "Demo Simulation Only - Not Recorded On-Chain"}`,
        `# Total Transactions: ${activeTxs.length}`,
        `# Total Proposals: ${activeProps.length}`,
      ];

      const rows: string[][] = activeTxs.map((tx) => [
        `"${new Date(tx.timestamp * 1000).toISOString()}"`,
        `"${tx.type}"`,
        `"${tx.amount}"`,
        `"${tx.fromOrTo}"`,
        `"Disbursement / Vault Activity"`,
        `"${tx.status}"`,
        `"${tx.txHash}"`,
        `""`,
      ]);

      activeProps.forEach((p) => {
        rows.push([
          `"${new Date(p.createdAt * 1000).toISOString()}"`,
          `"${p.proposalType === 1 ? "ADVANCE_PROPOSAL" : "STANDARD_PROPOSAL"}"`,
          `"${p.amount} tMSTC"`,
          `"${p.recipient}"`,
          `"${p.description.replace(/"/g, '""')}"`,
          `"${p.status}"`,
          `"${p.txHash || "PENDING"}"`,
          `"${p.receiptHash || ""}"`,
        ]);
      });

      return [...metadataRows, "", headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }

    it("should guarantee liveTransactions is strictly isolated from demoTransactions and defaults to empty on fresh vault", async function () {
      const demoTransactions = [
        { id: "tx-1", type: "STANDARD_DISBURSEMENT", amount: "2.0 tMSTC", fromOrTo: "0x7099...", txHash: "DEMO-TX-1", timestamp: 1000, status: "CONFIRMED" },
        { id: "tx-2", type: "ADVANCE_DISBURSEMENT", amount: "1.2 tMSTC", fromOrTo: "0x3C44...", txHash: "DEMO-TX-2", timestamp: 2000, status: "CONFIRMED" },
        { id: "tx-3", type: "DEPOSIT", amount: "10.0 tMSTC", fromOrTo: "0x06e0...", txHash: "DEMO-TX-3", timestamp: 3000, status: "CONFIRMED" },
      ];
      const liveTransactions: any[] = [];

      // When live is true, displayedTransactions must equal liveTransactions
      const getDisplayedTransactions = (isLive: boolean) => (isLive ? liveTransactions : demoTransactions);

      expect(getDisplayedTransactions(true).length).to.equal(0);
      expect(getDisplayedTransactions(true)).to.deep.equal([]);
      expect(getDisplayedTransactions(false).length).to.equal(3);
    });

    it("should parse on-chain FundsDeposited events into live transaction records with real hashes", async function () {
      const depositTx = await vault.deposit({ value: ethers.parseEther("1.0") });
      const receipt = await depositTx.wait();

      const depFilter = vault.filters.FundsDeposited();
      const logs = await vault.queryFilter(depFilter);
      expect(logs.length).to.equal(1);

      const parsed = vault.interface.parseLog(logs[0]);
      expect(parsed).to.not.be.null;

      const liveTx = {
        id: `onchain-dep-${logs[0].transactionHash}-${logs[0].index}`,
        type: "DEPOSIT",
        amount: `${ethers.formatEther(parsed!.args[1])} tMSTC`,
        fromOrTo: parsed!.args[0],
        txHash: logs[0].transactionHash,
        status: "CONFIRMED",
      };

      expect(liveTx.type).to.equal("DEPOSIT");
      expect(liveTx.amount).to.equal("1.0 tMSTC");
      expect(liveTx.fromOrTo).to.equal(owner.address);
      expect(liveTx.txHash).to.equal(receipt!.hash);
    });

    it("should generate live CSV audit export containing zero simulated transactions and verified on-chain metadata", function () {
      const demoTransactions = [
        { id: "tx-1", type: "STANDARD_DISBURSEMENT", amount: "2.0 tMSTC", fromOrTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", txHash: "DEMO-TX-FAKE-HASH-1", timestamp: 1000, status: "CONFIRMED" },
        { id: "tx-2", type: "ADVANCE_DISBURSEMENT", amount: "1.2 tMSTC", fromOrTo: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", txHash: "DEMO-TX-FAKE-HASH-2", timestamp: 2000, status: "CONFIRMED" },
      ];
      const liveTransactions: any[] = []; // Empty fresh on-chain vault
      const liveProposals: any[] = [];

      const csv = generateLedgerCSV(true, "0xECAD385e56299b0aec5A51dB2DdCF0A4746E7c31", liveTransactions, demoTransactions, liveProposals);

      expect(csv).to.include("# Network: MST Testnet (Chain ID: 91562037)");
      expect(csv).to.include("# Verification Status: On-Chain Verified Records Only");
      expect(csv).to.include("# Total Transactions: 0");
      expect(csv).to.include("# Total Proposals: 0");
      // Must NOT leak any demo data
      expect(csv).to.not.include("DEMO-TX-FAKE-HASH-1");
      expect(csv).to.not.include("DEMO-TX-FAKE-HASH-2");
      expect(csv).to.not.include("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
    });

    it("should generate demo CSV audit export that preserves simulated transactions and clearly labels simulation mode", function () {
      const demoTransactions = [
        { id: "tx-1", type: "STANDARD_DISBURSEMENT", amount: "2.0 tMSTC", fromOrTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", txHash: "DEMO-TX-SIMULATED-HASH", timestamp: 1000, status: "CONFIRMED" },
      ];
      const liveTransactions: any[] = [];
      const demoProposals = [
        { id: 1, proposalType: 0, amount: "2.0", recipient: "0x7099...", description: "Demo Proposal", status: "EXECUTED", txHash: "DEMO-EXEC-1", receiptHash: "", createdAt: 1000 },
      ];

      const csv = generateLedgerCSV(false, "0xECAD385e56299b0aec5A51dB2DdCF0A4746E7c31", liveTransactions, demoTransactions, demoProposals);

      expect(csv).to.include("# Network: Demo Simulation Mode");
      expect(csv).to.include("# Verification Status: Demo Simulation Only - Not Recorded On-Chain");
      expect(csv).to.include("# Total Transactions: 1");
      expect(csv).to.include("DEMO-TX-SIMULATED-HASH");
    });
  });
});
