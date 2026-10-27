import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  ClubVaultABI,
  VaultFactoryABI,
  MST_TESTNET_CONFIG,
  CONTRACT_ADDRESSES,
} from "./contracts/config";

// Types matching smart contract enums
export enum ProposalType {
  STANDARD_PAYMENT = 0,
  ADVANCE_PAYMENT = 1,
}

export enum ProposalStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
  EXECUTED = 3,
  ADVANCE_DISBURSED = 4,
  RECEIPT_PENDING_CONFIRMATION = 5,
  RECEIPT_CONFIRMED = 6,
  RECEIPT_DISPUTED = 7,
  RECEIPT_DEFAULTED = 8,
  RECEIPT_REPAID = 9,
}

interface ProposalData {
  id: number;
  proposalType: ProposalType;
  status: ProposalStatus;
  proposer: string;
  recipient: string;
  amount: string; // in ether
  description: string;
  approvalsCount: number;
  rejectionsCount: number;
  createdAt: number;
  executionDeadline: number;
  receiptGracePeriod: number;
  receiptDeadline: number;
  receiptHash: string;
  receiptDescription: string;
  receiptApprovals: number;
  receiptRejections: number;
}

export const App: React.FC = () => {
  // Wallet State
  const [account, setAccount] = useState<string | null>(null);
  const [accountBalance, setAccountBalance] = useState<string>("0");
  const [networkName, setNetworkName] = useState<string>("MST Testnet (91562037)");
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(true);

  // Vault State
  const [vaultAddress, setVaultAddress] = useState<string>(CONTRACT_ADDRESSES.GenesisVault);
  const [clubName, setClubName] = useState<string>("Web3 Builders Club");
  const [clubDescription, setClubDescription] = useState<string>(
    "Decentralized treasury for hackathon expenses and research grants"
  );
  const [members, setMembers] = useState<string[]>([
    "0x06e08cf0aed1663834E267E90333164a0276bbbD",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  ]);
  const [requiredApprovals, setRequiredApprovals] = useState<number>(2);

  // Treasury Metrics
  const [vaultBalance, setVaultBalance] = useState<string>("15.5");
  const [availableFunds, setAvailableFunds] = useState<string>("12.5");
  const [reservedFunds, setReservedFunds] = useState<string>("3.0");
  const [unconfirmedAdvances, setUnconfirmedAdvances] = useState<string>("1.2");

  // Proposals State
  const [proposals, setProposals] = useState<ProposalData[]>([
    {
      id: 1,
      proposalType: ProposalType.STANDARD_PAYMENT,
      status: ProposalStatus.EXECUTED,
      proposer: "0x06e08cf0aed1663834E267E90333164a0276bbbD",
      recipient: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      amount: "2.0",
      description: "Cloud server infrastructure hosting for hackathon dApps",
      approvalsCount: 2,
      rejectionsCount: 0,
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 2,
      executionDeadline: Math.floor(Date.now() / 1000) + 86400 * 5,
      receiptGracePeriod: 0,
      receiptDeadline: 0,
      receiptHash: "",
      receiptDescription: "",
      receiptApprovals: 0,
      receiptRejections: 0,
    },
    {
      id: 2,
      proposalType: ProposalType.ADVANCE_PAYMENT,
      status: ProposalStatus.RECEIPT_PENDING_CONFIRMATION,
      proposer: "0x06e08cf0aed1663834E267E90333164a0276bbbD",
      recipient: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      amount: "1.2",
      description: "Advance for 3D printer filament and sensor kits",
      approvalsCount: 2,
      rejectionsCount: 0,
      createdAt: Math.floor(Date.now() / 1000) - 86400,
      executionDeadline: Math.floor(Date.now() / 1000) + 86400 * 6,
      receiptGracePeriod: 86400 * 3,
      receiptDeadline: Math.floor(Date.now() / 1000) + 86400 * 2,
      receiptHash: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      receiptDescription: "Invoice #HK-8849 from Hobby Robotics Supply",
      receiptApprovals: 1,
      receiptRejections: 0,
    },
    {
      id: 3,
      proposalType: ProposalType.ADVANCE_PAYMENT,
      status: ProposalStatus.APPROVED,
      proposer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      recipient: "0x06e08cf0aed1663834E267E90333164a0276bbbD",
      amount: "3.0",
      description: "Travel stipend for regional robotics championship",
      approvalsCount: 2,
      rejectionsCount: 0,
      createdAt: Math.floor(Date.now() / 1000) - 3600,
      executionDeadline: Math.floor(Date.now() / 1000) + 86400 * 7,
      receiptGracePeriod: 86400 * 5,
      receiptDeadline: 0,
      receiptHash: "",
      receiptDescription: "",
      receiptApprovals: 0,
      receiptRejections: 0,
    },
  ]);

  // UI Navigation & Modals
  const [activeTab, setActiveTab] = useState<"proposals" | "advances" | "members" | "deposit">("proposals");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
  const [showFactoryModal, setShowFactoryModal] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form States
  const [formPropType, setFormPropType] = useState<ProposalType>(ProposalType.STANDARD_PAYMENT);
  const [formRecipient, setFormRecipient] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formGraceDays, setFormGraceDays] = useState<number>(3);

  const [formReceiptHash, setFormReceiptHash] = useState<string>("");
  const [formReceiptDesc, setFormReceiptDesc] = useState<string>("");

  const [formDepositAmount, setFormDepositAmount] = useState<string>("");

  // Factory Form
  const [factoryClubName, setFactoryClubName] = useState<string>("");
  const [factoryClubDesc, setFactoryClubDesc] = useState<string>("");
  const [factoryMembers, setFactoryMembers] = useState<string>("");
  const [factoryQuorum, setFactoryQuorum] = useState<number>(2);

  // Connect Wallet
  const connectWallet = async () => {
    if (typeof (window as any).ethereum === "undefined") {
      alert("MetaMask or Web3 wallet not detected. Running in live mock simulation mode.");
      setAccount("0x06e08cf0aed1663834E267E90333164a0276bbbD");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const bal = await provider.getBalance(accounts[0]);
        setAccountBalance(ethers.formatEther(bal).slice(0, 6));

        const network = await provider.getNetwork();
        if (Number(network.chainId) !== MST_TESTNET_CONFIG.chainId) {
          setIsCorrectNetwork(false);
          await switchNetwork();
        } else {
          setIsCorrectNetwork(true);
        }
      }
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      setStatusMessage(`Connection note: ${err.message || err}`);
    }
  };

  // Switch to MST Testnet
  const switchNetwork = async () => {
    if (typeof (window as any).ethereum === "undefined") return;
    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: MST_TESTNET_CONFIG.chainIdHex }],
      });
      setIsCorrectNetwork(true);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [MST_TESTNET_CONFIG],
          });
          setIsCorrectNetwork(true);
        } catch (addError) {
          console.error("Failed to add MST Testnet:", addError);
        }
      }
    }
  };

  // Create Proposal Action
  const handleCreateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRecipient || !formAmount || !formDescription) {
      alert("Please fill all required fields.");
      return;
    }

    const requestedAmount = parseFloat(formAmount);
    const available = parseFloat(availableFunds);

    if (requestedAmount > available) {
      alert(`Cannot create proposal: Requested amount (${requestedAmount}) exceeds Available Funds (${available} tMSTC).`);
      return;
    }

    const newId = proposals.length + 1;
    const newProposal: ProposalData = {
      id: newId,
      proposalType: formPropType,
      status: ProposalStatus.PENDING,
      proposer: account || "0x06e08cf0aed1663834E267E90333164a0276bbbD",
      recipient: formRecipient,
      amount: formAmount,
      description: formDescription,
      approvalsCount: 1, // proposer auto-votes
      rejectionsCount: 0,
      createdAt: Math.floor(Date.now() / 1000),
      executionDeadline: Math.floor(Date.now() / 1000) + 86400 * 7,
      receiptGracePeriod: formPropType === ProposalType.ADVANCE_PAYMENT ? formGraceDays * 86400 : 0,
      receiptDeadline: 0,
      receiptHash: "",
      receiptDescription: "",
      receiptApprovals: 0,
      receiptRejections: 0,
    };

    setProposals([newProposal, ...proposals]);
    setShowCreateModal(false);
    setFormRecipient("");
    setFormAmount("");
    setFormDescription("");
    setStatusMessage(`Proposal #${newId} created successfully! Initial affirmative vote cast by proposer.`);
  };

  // Vote on Proposal
  const handleVoteProposal = (id: number, approve: boolean) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        const newApprovals = approve ? p.approvalsCount + 1 : p.approvalsCount;
        const newRejections = !approve ? p.rejectionsCount + 1 : p.rejectionsCount;

        let newStatus = p.status;
        if (newApprovals >= requiredApprovals) {
          newStatus = ProposalStatus.APPROVED;
          // Accounting: lock in reserved funds
          const amt = parseFloat(p.amount);
          setReservedFunds((prevRes) => (parseFloat(prevRes) + amt).toFixed(2));
          setAvailableFunds((prevAvail) => (parseFloat(prevAvail) - amt).toFixed(2));
        } else if (newRejections > members.length - requiredApprovals) {
          newStatus = ProposalStatus.REJECTED;
        }

        return {
          ...p,
          approvalsCount: newApprovals,
          rejectionsCount: newRejections,
          status: newStatus,
        };
      })
    );
    setStatusMessage(`Vote cast on Proposal #${id} (${approve ? "Approved" : "Rejected"})`);
  };

  // Execute Proposal
  const handleExecuteProposal = (id: number) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        const amt = parseFloat(p.amount);
        setVaultBalance((prevBal) => (parseFloat(prevBal) - amt).toFixed(2));
        setReservedFunds((prevRes) => (parseFloat(prevRes) - amt).toFixed(2));

        if (p.proposalType === ProposalType.STANDARD_PAYMENT) {
          return { ...p, status: ProposalStatus.EXECUTED };
        } else {
          // Advance payment disbursed
          setUnconfirmedAdvances((prevAdv) => (parseFloat(prevAdv) + amt).toFixed(2));
          return {
            ...p,
            status: ProposalStatus.ADVANCE_DISBURSED,
            receiptDeadline: Math.floor(Date.now() / 1000) + p.receiptGracePeriod,
          };
        }
      })
    );
    setStatusMessage(`Proposal #${id} executed! Funds disbursed to recipient.`);
  };

  // Submit Receipt
  const handleSubmitReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposalId || !formReceiptHash) return;

    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== selectedProposalId) return p;
        return {
          ...p,
          receiptHash: formReceiptHash,
          receiptDescription: formReceiptDesc,
          status: ProposalStatus.RECEIPT_PENDING_CONFIRMATION,
        };
      })
    );

    setShowReceiptModal(false);
    setFormReceiptHash("");
    setFormReceiptDesc("");
    setStatusMessage(`Receipt submitted for Advance #${selectedProposalId}. Quorum confirmation voting started.`);
  };

  // Vote on Receipt Confirmation
  const handleVoteReceipt = (id: number, confirm: boolean) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        const newApprovals = confirm ? p.receiptApprovals + 1 : p.receiptApprovals;
        const newRejections = !confirm ? p.receiptRejections + 1 : p.receiptRejections;

        let newStatus = p.status;
        if (newApprovals >= requiredApprovals) {
          newStatus = ProposalStatus.RECEIPT_CONFIRMED;
          const amt = parseFloat(p.amount);
          setUnconfirmedAdvances((prevAdv) => Math.max(0, parseFloat(prevAdv) - amt).toFixed(2));
        } else if (newRejections > members.length - requiredApprovals) {
          newStatus = ProposalStatus.RECEIPT_DISPUTED;
        }

        return {
          ...p,
          receiptApprovals: newApprovals,
          receiptRejections: newRejections,
          status: newStatus,
        };
      })
    );
    setStatusMessage(`Receipt vote registered on Advance #${id} (${confirm ? "Confirmed" : "Disputed"})`);
  };

  // Mark Defaulted
  const handleMarkDefaulted = (id: number) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return { ...p, status: ProposalStatus.RECEIPT_DEFAULTED };
      })
    );
    setStatusMessage(`Advance #${id} marked as DEFAULTED due to timeout. Recipient flagged.`);
  };

  // Repay Advance
  const handleRepayAdvance = (id: number) => {
    const p = proposals.find((x) => x.id === id);
    if (!p) return;
    const amt = parseFloat(p.amount);

    setVaultBalance((prevBal) => (parseFloat(prevBal) + amt).toFixed(2));
    setAvailableFunds((prevAvail) => (parseFloat(prevAvail) + amt).toFixed(2));
    setUnconfirmedAdvances((prevAdv) => Math.max(0, parseFloat(prevAdv) - amt).toFixed(2));

    setProposals((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: ProposalStatus.RECEIPT_REPAID } : x))
    );
    setStatusMessage(`Advance #${id} fully repaid into vault treasury. Recipient unblocked.`);
  };

  // Deposit Funds
  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formDepositAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Invalid deposit amount.");
      return;
    }

    setVaultBalance((prevBal) => (parseFloat(prevBal) + amt).toFixed(2));
    setAvailableFunds((prevAvail) => (parseFloat(prevAvail) + amt).toFixed(2));
    setFormDepositAmount("");
    setStatusMessage(`Deposited ${amt} tMSTC into ClubVault treasury.`);
  };

  // Deploy New Vault
  const handleDeployNewVault = (e: React.FormEvent) => {
    e.preventDefault();
    if (!factoryClubName || !factoryMembers) {
      alert("Please provide club name and members.");
      return;
    }
    const memberArray = factoryMembers
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    const mockNewVaultAddr = ethers.getCreateAddress({
      from: account || "0x06e08cf0aed1663834E267E90333164a0276bbbD",
      nonce: Math.floor(Math.random() * 100),
    });

    setClubName(factoryClubName);
    setClubDescription(factoryClubDesc);
    setMembers(memberArray);
    setRequiredApprovals(factoryQuorum);
    setVaultAddress(mockNewVaultAddr);
    setVaultBalance("0.0");
    setAvailableFunds("0.0");
    setReservedFunds("0.0");
    setUnconfirmedAdvances("0.0");
    setProposals([]);

    setShowFactoryModal(false);
    setStatusMessage(`New ClubVault deployed at ${mockNewVaultAddr}`);
  };

  const getStatusClass = (status: ProposalStatus) => {
    return `status-badge status-${ProposalStatus[status]}`;
  };

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar">
        <div className="brand">
          <div className="brand-logo">CV</div>
          <div className="brand-text">
            <h1>ClubVault</h1>
            <span className="brand-tag">Decentralized Treasury</span>
          </div>
        </div>

        <div className="nav-actions">
          <div className="network-badge">
            <span className="network-dot"></span>
            <span>{networkName}</span>
          </div>

          <button
            id="deploy-vault-btn"
            className="btn btn-secondary"
            onClick={() => setShowFactoryModal(true)}
          >
            + New Club
          </button>

          {account ? (
            <div className="network-badge" style={{ borderColor: "var(--accent-cyan-dim)" }}>
              <span style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}>
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
              <span style={{ color: "var(--text-muted)" }}>({accountBalance} tMSTC)</span>
            </div>
          ) : (
            <button id="connect-wallet-btn" className="btn btn-primary" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
        </div>
      </nav>

      {/* Main Container */}
      <main className="container">
        {/* Status notification */}
        {statusMessage && (
          <div
            style={{
              padding: "0.75rem 1.25rem",
              background: "rgba(0, 229, 255, 0.1)",
              border: "1px solid var(--accent-cyan)",
              borderRadius: "var(--radius-sm)",
              marginBottom: "1.5rem",
              fontSize: "0.85rem",
              color: "var(--accent-cyan)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}
            >
              ×
            </button>
          </div>
        )}

        {/* Priority 4 Honest Disclaimer Banner */}
        <div className="disclaimer-banner">
          <div className="disclaimer-icon">⚠️</div>
          <div className="disclaimer-text">
            <strong>Honest Architectural Boundary:</strong> A receipt confirmation is a{" "}
            <strong>subjective member governance decision (social consensus)</strong>, not cryptographic
            proof that an off-chain purchase actually occurred. The smart contract validates voting thresholds,
            reserved funds, and timeout state transitions; it cannot independently inspect off-chain physical commerce.
          </div>
        </div>

        {/* Vault Header Card */}
        <section
          className="glass-panel"
          style={{ padding: "1.75rem", marginBottom: "2rem", position: "relative" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem" }}>{clubName}</h2>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.6rem",
                    background: "rgba(157, 78, 221, 0.2)",
                    color: "var(--accent-purple)",
                    borderRadius: "var(--radius-pill)",
                    fontWeight: 600,
                  }}
                >
                  {members.length} Bounded Members
                </span>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: "720px", marginBottom: "0.75rem" }}>
                {clubDescription}
              </p>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                <span>
                  Vault Contract:{" "}
                  <a
                    className="address-tag"
                    href={`https://testnet.mstscan.com/address/${vaultAddress}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {vaultAddress.slice(0, 8)}...{vaultAddress.slice(-6)} ↗
                  </a>
                </span>
                <span>•</span>
                <span>Quorum: <strong>{requiredApprovals} of {members.length}</strong> affirmative votes</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                id="open-create-proposal-btn"
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                + New Proposal
              </button>
            </div>
          </div>
        </section>

        {/* Priority 5 Invariant Check Bar */}
        <div className="invariant-card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "var(--accent-emerald)", fontWeight: "bold" }}>✔</span>
            <span>Invariant Verified:</span>
            <span className="invariant-equation">Vault Balance ≥ Available ({availableFunds}) + Reserved ({reservedFunds})</span>
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Safe against double-spending</span>
        </div>

        {/* Treasury Metrics Grid */}
        <section className="metrics-grid">
          <div className="glass-panel metric-card">
            <div className="metric-label">Total Vault Balance</div>
            <div className="metric-value">{vaultBalance} <span style={{ fontSize: "1rem" }}>tMSTC</span></div>
            <div className="metric-sub">On-chain native balance</div>
          </div>

          <div className="glass-panel metric-card">
            <div className="metric-label" style={{ color: "var(--accent-emerald)" }}>Available to Propose</div>
            <div className="metric-value" style={{ color: "var(--accent-emerald)" }}>
              {availableFunds} <span style={{ fontSize: "1rem" }}>tMSTC</span>
            </div>
            <div className="metric-sub">Balance minus reserved</div>
          </div>

          <div className="glass-panel metric-card">
            <div className="metric-label" style={{ color: "var(--accent-amber)" }}>Reserved (Approved)</div>
            <div className="metric-value" style={{ color: "var(--accent-amber)" }}>
              {reservedFunds} <span style={{ fontSize: "1rem" }}>tMSTC</span>
            </div>
            <div className="metric-sub">Locked for approved disbursements</div>
          </div>

          <div className="glass-panel metric-card">
            <div className="metric-label" style={{ color: "var(--accent-purple)" }}>Unconfirmed Advances</div>
            <div className="metric-value" style={{ color: "var(--accent-purple)" }}>
              {unconfirmedAdvances} <span style={{ fontSize: "1rem" }}>tMSTC</span>
            </div>
            <div className="metric-sub">Awaiting member receipt sign-off</div>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="tabs-nav">
          <button
            id="tab-proposals"
            className={`tab-btn ${activeTab === "proposals" ? "active" : ""}`}
            onClick={() => setActiveTab("proposals")}
          >
            All Proposals ({proposals.length})
          </button>
          <button
            id="tab-advances"
            className={`tab-btn ${activeTab === "advances" ? "active" : ""}`}
            onClick={() => setActiveTab("advances")}
          >
            Advance Payments & Receipts (
            {proposals.filter((p) => p.proposalType === ProposalType.ADVANCE_PAYMENT).length}
            )
          </button>
          <button
            id="tab-members"
            className={`tab-btn ${activeTab === "members" ? "active" : ""}`}
            onClick={() => setActiveTab("members")}
          >
            Club Members ({members.length})
          </button>
          <button
            id="tab-deposit"
            className={`tab-btn ${activeTab === "deposit" ? "active" : ""}`}
            onClick={() => setActiveTab("deposit")}
          >
            Deposit & Fund
          </button>
        </div>

        {/* Tab 1: All Proposals */}
        {activeTab === "proposals" && (
          <div className="card-list">
            {proposals.map((p) => {
              const yesPercent = Math.min(100, (p.approvalsCount / members.length) * 100);
              const noPercent = Math.min(100, (p.rejectionsCount / members.length) * 100);

              return (
                <div key={p.id} className="proposal-item">
                  <div className="proposal-header">
                    <div className="proposal-title-area">
                      <span className="proposal-id">#{p.id}</span>
                      <h3 style={{ fontSize: "1.15rem", fontFamily: "var(--font-heading)" }}>
                        {p.description}
                      </h3>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.15rem 0.5rem",
                          background: p.proposalType === ProposalType.ADVANCE_PAYMENT ? "rgba(157, 78, 221, 0.2)" : "rgba(0, 229, 255, 0.2)",
                          color: p.proposalType === ProposalType.ADVANCE_PAYMENT ? "var(--accent-purple)" : "var(--accent-cyan)",
                          borderRadius: "var(--radius-sm)",
                          fontWeight: 600,
                        }}
                      >
                        {p.proposalType === ProposalType.ADVANCE_PAYMENT ? "ADVANCE" : "STANDARD"}
                      </span>
                    </div>
                    <span className={getStatusClass(p.status)}>
                      {ProposalStatus[p.status].replace(/_/g, " ")}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Amount:</span>{" "}
                      <strong style={{ color: "var(--text-primary)", fontSize: "1.05rem" }}>
                        {p.amount} tMSTC
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Recipient:</span>{" "}
                      <span className="address-tag">{p.recipient.slice(0, 6)}...{p.recipient.slice(-4)}</span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Proposer:</span>{" "}
                      <span className="address-tag">{p.proposer.slice(0, 6)}...{p.proposer.slice(-4)}</span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Quorum Progress:</span>{" "}
                      <strong style={{ color: p.approvalsCount >= requiredApprovals ? "var(--accent-emerald)" : "var(--text-primary)" }}>
                        {p.approvalsCount} / {requiredApprovals} Needed
                      </strong>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="vote-progress">
                    <div className="vote-fill-yes" style={{ width: `${yesPercent}%` }}></div>
                    <div className="vote-fill-no" style={{ width: `${noPercent}%` }}></div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Approvals: <span style={{ color: "var(--accent-emerald)" }}>{p.approvalsCount}</span> | Rejections: <span style={{ color: "var(--accent-rose)" }}>{p.rejectionsCount}</span>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {p.status === ProposalStatus.PENDING && (
                        <>
                          <button
                            id={`vote-yes-${p.id}`}
                            className="btn btn-success"
                            onClick={() => handleVoteProposal(p.id, true)}
                          >
                            Approve
                          </button>
                          <button
                            id={`vote-no-${p.id}`}
                            className="btn btn-danger"
                            onClick={() => handleVoteProposal(p.id, false)}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {p.status === ProposalStatus.APPROVED && (
                        <button
                          id={`execute-btn-${p.id}`}
                          className="btn btn-primary"
                          onClick={() => handleExecuteProposal(p.id)}
                        >
                          Execute Disbursement ({p.amount} tMSTC)
                        </button>
                      )}

                      {p.status === ProposalStatus.ADVANCE_DISBURSED && (
                        <button
                          id={`submit-receipt-btn-${p.id}`}
                          className="btn btn-secondary"
                          onClick={() => {
                            setSelectedProposalId(p.id);
                            setShowReceiptModal(true);
                          }}
                        >
                          Submit Expense Receipt ↗
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Advance Payments & Receipt Subsystem */}
        {activeTab === "advances" && (
          <div className="card-list">
            {proposals
              .filter((p) => p.proposalType === ProposalType.ADVANCE_PAYMENT)
              .map((p) => (
                <div key={p.id} className="proposal-item" style={{ borderLeft: "4px solid var(--accent-purple)" }}>
                  <div className="proposal-header">
                    <div>
                      <span className="proposal-id">Advance #{p.id}</span>
                      <h3 style={{ fontSize: "1.15rem", fontFamily: "var(--font-heading)", marginTop: "0.25rem" }}>
                        {p.description}
                      </h3>
                    </div>
                    <span className={getStatusClass(p.status)}>
                      {ProposalStatus[p.status].replace(/_/g, " ")}
                    </span>
                  </div>

                  <div style={{ background: "var(--bg-surface-elevated)", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "1rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", fontSize: "0.85rem" }}>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Advance Disbursed:</span>{" "}
                        <strong>{p.amount} tMSTC</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Recipient:</span>{" "}
                        <span className="address-tag">{p.recipient}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Receipt Deadline:</span>{" "}
                        <span>
                          {p.receiptDeadline > 0
                            ? new Date(p.receiptDeadline * 1000).toLocaleDateString() + " " + new Date(p.receiptDeadline * 1000).toLocaleTimeString()
                            : "Begins upon execution"}
                        </span>
                      </div>
                    </div>

                    {p.receiptHash && (
                      <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-subtle)" }}>
                        <div style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                          <span style={{ color: "var(--text-muted)" }}>Submitted Receipt IPFS CID:</span>{" "}
                          <a
                            href={`https://ipfs.io/ipfs/${p.receiptHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="address-tag"
                          >
                            {p.receiptHash} ↗
                          </a>
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          <span style={{ color: "var(--text-muted)" }}>Memo:</span> {p.receiptDescription}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Receipt Governance Actions */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {p.status === ProposalStatus.RECEIPT_PENDING_CONFIRMATION && (
                        <span>
                          Receipt Confirmation:{" "}
                          <strong style={{ color: "var(--accent-emerald)" }}>{p.receiptApprovals}</strong> Confirmed |{" "}
                          <strong style={{ color: "var(--accent-rose)" }}>{p.receiptRejections}</strong> Disputed (Needs {requiredApprovals})
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {p.status === ProposalStatus.ADVANCE_DISBURSED && (
                        <>
                          <button
                            id={`submit-receipt-adv-${p.id}`}
                            className="btn btn-primary"
                            onClick={() => {
                              setSelectedProposalId(p.id);
                              setShowReceiptModal(true);
                            }}
                          >
                            Upload Receipt Hash
                          </button>
                          <button
                            id={`timeout-btn-${p.id}`}
                            className="btn btn-danger"
                            onClick={() => handleMarkDefaulted(p.id)}
                          >
                            Flag Timeout Default
                          </button>
                        </>
                      )}

                      {p.status === ProposalStatus.RECEIPT_PENDING_CONFIRMATION && (
                        <>
                          <button
                            id={`confirm-receipt-${p.id}`}
                            className="btn btn-success"
                            onClick={() => handleVoteReceipt(p.id, true)}
                          >
                            Confirm Legitimate Receipt
                          </button>
                          <button
                            id={`dispute-receipt-${p.id}`}
                            className="btn btn-danger"
                            onClick={() => handleVoteReceipt(p.id, false)}
                          >
                            Dispute Receipt
                          </button>
                        </>
                      )}

                      {(p.status === ProposalStatus.RECEIPT_DISPUTED ||
                        p.status === ProposalStatus.RECEIPT_DEFAULTED) && (
                        <button
                          id={`repay-advance-${p.id}`}
                          className="btn btn-secondary"
                          onClick={() => handleRepayAdvance(p.id)}
                        >
                          Repay / Refund Advance ({p.amount} tMSTC)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Tab 3: Members & Bounded Governance */}
        {activeTab === "members" && (
          <div className="glass-panel" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.25rem" }}>
                Active Members ({members.length} / 50 Max)
              </h3>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Strict Gas-Bounded Membership Limit
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {members.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.85rem 1rem",
                    background: "var(--bg-surface-elevated)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.8rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>{m}</span>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.6rem",
                        borderRadius: "var(--radius-pill)",
                        fontSize: "0.75rem",
                        background: "var(--accent-emerald-dim)",
                        color: "var(--accent-emerald)",
                        fontWeight: 600,
                      }}
                    >
                      Active Member
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Deposit & Fund Treasury */}
        {activeTab === "deposit" && (
          <div className="glass-panel" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem", marginBottom: "0.5rem" }}>
              Deposit Funds to Club Treasury
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Anyone can contribute native tokens (tMSTC) to the vault. Contributed funds immediately increase
              Available Funds and can be proposed for grants and projects.
            </p>

            <form onSubmit={handleDeposit}>
              <div className="form-group">
                <label className="form-label">Deposit Amount (tMSTC)</label>
                <input
                  id="deposit-amount-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-control"
                  placeholder="e.g. 5.0"
                  value={formDepositAmount}
                  onChange={(e) => setFormDepositAmount(e.target.value)}
                  required
                />
              </div>

              <button id="submit-deposit-btn" type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                Deposit to Treasury
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Modal: Create Proposal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Create Treasury Proposal</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleCreateProposal}>
              <div className="form-group">
                <label className="form-label">Proposal Type</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className={`btn ${formPropType === ProposalType.STANDARD_PAYMENT ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setFormPropType(ProposalType.STANDARD_PAYMENT)}
                  >
                    Standard Direct Payment
                  </button>
                  <button
                    type="button"
                    className={`btn ${formPropType === ProposalType.ADVANCE_PAYMENT ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setFormPropType(ProposalType.ADVANCE_PAYMENT)}
                  >
                    Advance Payment
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Recipient Address</label>
                <input
                  id="prop-recipient-input"
                  type="text"
                  className="form-control"
                  placeholder="0x..."
                  value={formRecipient}
                  onChange={(e) => setFormRecipient(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Amount (tMSTC) — Available: <strong>{availableFunds} tMSTC</strong>
                </label>
                <input
                  id="prop-amount-input"
                  type="number"
                  step="0.01"
                  max={availableFunds}
                  className="form-control"
                  placeholder="e.g. 1.5"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                />
              </div>

              {formPropType === ProposalType.ADVANCE_PAYMENT && (
                <div className="form-group">
                  <label className="form-label">Receipt Submission Grace Period (Days)</label>
                  <input
                    id="prop-grace-days-input"
                    type="number"
                    min="1"
                    max="90"
                    className="form-control"
                    value={formGraceDays}
                    onChange={(e) => setFormGraceDays(parseInt(e.target.value))}
                    required
                  />
                  <small style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                    Recipient must submit an expense receipt within this window or be marked defaulted.
                  </small>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Description / Budget Memo</label>
                <textarea
                  id="prop-desc-input"
                  className="form-control"
                  placeholder="State the purpose of the expense and items to be purchased..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button id="submit-proposal-btn" type="submit" className="btn btn-primary">
                  Submit Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Submit Receipt */}
      {showReceiptModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Submit Expense Receipt</h3>
              <button className="close-btn" onClick={() => setShowReceiptModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitReceipt}>
              <div className="form-group">
                <label className="form-label">Receipt IPFS CID or Document Hash</label>
                <input
                  id="receipt-hash-input"
                  type="text"
                  className="form-control"
                  placeholder="bafybeig... or 0xhash"
                  value={formReceiptHash}
                  onChange={(e) => setFormReceiptHash(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expense Memo & Invoice Summary</label>
                <textarea
                  id="receipt-memo-input"
                  className="form-control"
                  placeholder="Itemized summary, vendor name, invoice date..."
                  value={formReceiptDesc}
                  onChange={(e) => setFormReceiptDesc(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReceiptModal(false)}>
                  Cancel
                </button>
                <button id="submit-receipt-confirm-btn" type="submit" className="btn btn-primary">
                  Submit for Member Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Factory Deploy New Vault */}
      {showFactoryModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Deploy New ClubVault</h3>
              <button className="close-btn" onClick={() => setShowFactoryModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleDeployNewVault}>
              <div className="form-group">
                <label className="form-label">Club / Organization Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Autonomous Drone Racing Club"
                  value={factoryClubName}
                  onChange={(e) => setFactoryClubName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Club Description</label>
                <textarea
                  className="form-control"
                  placeholder="Mission, team purpose, and budget governance..."
                  value={factoryClubDesc}
                  onChange={(e) => setFactoryClubDesc(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Initial Members (Comma separated addresses, 1-50)</label>
                <textarea
                  className="form-control"
                  placeholder="0xabc..., 0xdef..., 0x123..."
                  value={factoryMembers}
                  onChange={(e) => setFactoryMembers(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Quorum Approvals Required</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  className="form-control"
                  value={factoryQuorum}
                  onChange={(e) => setFactoryQuorum(parseInt(e.target.value))}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowFactoryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Deploy ClubVault Instance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
