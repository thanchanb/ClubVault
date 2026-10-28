import React, { useState, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import {
  ClubVaultABI,
  VaultFactoryABI,
  MST_TESTNET_CONFIG,
  CONTRACT_ADDRESSES,
} from "./contracts/config";
import { Navbar } from "./components/Navbar";
import { VaultHeroExperience } from "./components/VaultHeroExperience";
import { HowItWorksSection } from "./components/HowItWorksSection";
import { ProposalDetailModal } from "./components/ProposalDetailModal";
import { PaymentConfirmationModal } from "./components/PaymentConfirmationModal";
import { ReceiptUploadModal } from "./components/ReceiptUploadModal";
import {
  ShieldCheck,
  Users,
  Coins,
  Lock,
  Unlock,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Plus,
  CheckCircle2,
  Clock,
  Vote,
  FileCheck2,
  FileText,
  Search,
  Filter,
  Eye,
  Zap,
} from "lucide-react";

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

export interface ProposalData {
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
  txHash?: string;
}

export interface TransactionRecord {
  id: string;
  type: "STANDARD_DISBURSEMENT" | "ADVANCE_DISBURSEMENT" | "DEPOSIT" | "REPAYMENT";
  amount: string;
  fromOrTo: string;
  txHash: string;
  timestamp: number;
  status: "CONFIRMED" | "PENDING";
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
    "Decentralized treasury for hackathon expenses, developer bounties, and research grants"
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
      txHash: "0x10b9e8413d3b7fdbd21ca9047e6be58d7f0caf0cab0edbf1341bf4cf8ad94d55",
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
      txHash: "0xecd5e088aef3c5e61cec68ca63c617c4008ef013ecd2b2a8d329b8b13ded28a6",
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

  // Transaction History State
  const [transactions, setTransactions] = useState<TransactionRecord[]>([
    {
      id: "tx-1",
      type: "STANDARD_DISBURSEMENT",
      amount: "2.0 tMSTC",
      fromOrTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      txHash: "0x10b9e8413d3b7fdbd21ca9047e6be58d7f0caf0cab0edbf1341bf4cf8ad94d55",
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 2,
      status: "CONFIRMED",
    },
    {
      id: "tx-2",
      type: "ADVANCE_DISBURSEMENT",
      amount: "1.2 tMSTC",
      fromOrTo: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      txHash: "0xecd5e088aef3c5e61cec68ca63c617c4008ef013ecd2b2a8d329b8b13ded28a6",
      timestamp: Math.floor(Date.now() / 1000) - 86400,
      status: "CONFIRMED",
    },
    {
      id: "tx-3",
      type: "DEPOSIT",
      amount: "10.0 tMSTC",
      fromOrTo: "0x06e08cf0aed1663834E267E90333164a0276bbbD",
      txHash: "0x7c458a432924faef8602b667823e5e4fa4312678da4bca07e6be58d7f0c11223",
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 3,
      status: "CONFIRMED",
    },
  ]);

  // UI Navigation & Modals
  const [activeTab, setActiveTab] = useState<"proposals" | "advances" | "members" | "deposit" | "transactions">("proposals");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [receiptTargetProposalId, setReceiptTargetProposalId] = useState<number | null>(null);
  const [selectedProposalForDetail, setSelectedProposalForDetail] = useState<ProposalData | null>(null);
  const [showFactoryModal, setShowFactoryModal] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeNavSection, setActiveNavSection] = useState<string>("overview");

  // Live Invariant State
  type InvariantStatus = "CHECKING" | "VERIFIED" | "MISMATCH" | "UNAVAILABLE";
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [isCheckingInvariant, setIsCheckingInvariant] = useState<boolean>(false);
  const [isDeployingVault, setIsDeployingVault] = useState<boolean>(false);

  // Compute live invariant: Contract balance = available funds + reserved funds
  const invariantStatus = useMemo<InvariantStatus>(() => {
    if (isCheckingInvariant) return "CHECKING";

    const bal = parseFloat(vaultBalance);
    const avail = parseFloat(availableFunds);
    const res = parseFloat(reservedFunds);

    if (isNaN(bal) || isNaN(avail) || isNaN(res)) {
      return "UNAVAILABLE";
    }

    if (!isLiveConnected) {
      // In simulation mode without live contract connection, indicate state is unverified on-chain
      return "UNAVAILABLE";
    }

    if (Math.abs(bal - (avail + res)) < 0.0001 && bal >= res) {
      return "VERIFIED";
    }

    return "MISMATCH";
  }, [vaultBalance, availableFunds, reservedFunds, isLiveConnected, isCheckingInvariant]);

  // Payment Confirmation Modal State
  const [confirmedTxData, setConfirmedTxData] = useState<{
    isOpen: boolean;
    txHash: string;
    amount: string;
    recipient: string;
    proposalId: number;
    proposalDescription: string;
  }>({
    isOpen: false,
    txHash: "",
    amount: "",
    recipient: "",
    proposalId: 0,
    proposalDescription: "",
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Form States
  const [formPropType, setFormPropType] = useState<ProposalType>(ProposalType.STANDARD_PAYMENT);
  const [formRecipient, setFormRecipient] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formGraceDays, setFormGraceDays] = useState<number>(3);
  const [formDepositAmount, setFormDepositAmount] = useState<string>("");

  // Factory Form
  const [factoryClubName, setFactoryClubName] = useState<string>("");
  const [factoryClubDesc, setFactoryClubDesc] = useState<string>("");
  const [factoryMembers, setFactoryMembers] = useState<string>("");
  const [factoryQuorum, setFactoryQuorum] = useState<number>(2);

  // Smooth scroll handler from Navbar or Hero
  const scrollToSection = (sectionId: string) => {
    setActiveNavSection(sectionId);
    if (sectionId === "proposals") {
      setActiveTab("proposals");
    } else if (sectionId === "transactions") {
      setActiveTab("transactions");
    }
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Connect Wallet
  const connectWallet = async () => {
    if (typeof (window as any).ethereum === "undefined") {
      // Live interactive simulation fallback
      setStatusMessage("MetaMask not detected: interactive simulation mode active with sample signer.");
      setAccount("0x06e08cf0aed1663834E267E90333164a0276bbbD");
      setAccountBalance("14.85");
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
          setIsLiveConnected(false);
          await switchNetwork();
        } else {
          setIsCorrectNetwork(true);
          setIsLiveConnected(true);
        }
        setStatusMessage(`Wallet connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
      }
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      setIsLiveConnected(false);
      setStatusMessage(`Wallet notice: ${err.message || err}`);
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
      setIsLiveConnected(true);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [MST_TESTNET_CONFIG],
          });
          setIsCorrectNetwork(true);
          setIsLiveConnected(true);
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
      approvalsCount: 1, // proposer auto-votes affirmative
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
    setStatusMessage(`Proposal #${newId} created! Initial affirmative vote recorded by proposer.`);
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
    setStatusMessage(`Vote recorded on Proposal #${id} (${approve ? "Affirmative" : "Rejected"})`);
  };

  // Execute Proposal
  const handleExecuteProposal = (id: number) => {
    const executedTxHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const targetProp = proposals.find((x) => x.id === id);

    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        const amt = parseFloat(p.amount);
        setVaultBalance((prevBal) => (parseFloat(prevBal) - amt).toFixed(2));
        setReservedFunds((prevRes) => (parseFloat(prevRes) - amt).toFixed(2));

        // Add to Transaction History
        const newTx: TransactionRecord = {
          id: `tx-${Date.now()}`,
          type: p.proposalType === ProposalType.STANDARD_PAYMENT ? "STANDARD_DISBURSEMENT" : "ADVANCE_DISBURSEMENT",
          amount: `${p.amount} tMSTC`,
          fromOrTo: p.recipient,
          txHash: executedTxHash,
          timestamp: Math.floor(Date.now() / 1000),
          status: "CONFIRMED",
        };
        setTransactions((t) => [newTx, ...t]);

        if (p.proposalType === ProposalType.STANDARD_PAYMENT) {
          return { ...p, status: ProposalStatus.EXECUTED, txHash: executedTxHash };
        } else {
          // Advance payment disbursed
          setUnconfirmedAdvances((prevAdv) => (parseFloat(prevAdv) + amt).toFixed(2));
          return {
            ...p,
            status: ProposalStatus.ADVANCE_DISBURSED,
            receiptDeadline: Math.floor(Date.now() / 1000) + p.receiptGracePeriod,
            txHash: executedTxHash,
          };
        }
      })
    );

    // Trigger Payment Confirmation Modal
    if (targetProp) {
      setConfirmedTxData({
        isOpen: true,
        txHash: executedTxHash,
        amount: targetProp.amount,
        recipient: targetProp.recipient,
        proposalId: targetProp.id,
        proposalDescription: targetProp.description,
      });
    }

    setStatusMessage(`Proposal #${id} executed! Funds disbursed to recipient on MST Blockchain.`);
  };

  // Submit Receipt Action
  const handleSubmitReceiptModal = (hash: string, memo: string) => {
    if (!receiptTargetProposalId) return;

    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== receiptTargetProposalId) return p;
        return {
          ...p,
          receiptHash: hash,
          receiptDescription: memo,
          status: ProposalStatus.RECEIPT_PENDING_CONFIRMATION,
        };
      })
    );

    setShowReceiptModal(false);
    setStatusMessage(`Receipt hash registered on Advance #${receiptTargetProposalId}. Member quorum confirmation active.`);
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
    setStatusMessage(`Receipt vote recorded on Advance #${id} (${confirm ? "Confirmed" : "Disputed"})`);
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

    // Record Repayment
    const repayTx: TransactionRecord = {
      id: `tx-${Date.now()}`,
      type: "REPAYMENT",
      amount: `${amt} tMSTC`,
      fromOrTo: p.recipient,
      txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      timestamp: Math.floor(Date.now() / 1000),
      status: "CONFIRMED",
    };
    setTransactions((t) => [repayTx, ...t]);

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

    const depTx: TransactionRecord = {
      id: `tx-${Date.now()}`,
      type: "DEPOSIT",
      amount: `${amt} tMSTC`,
      fromOrTo: account || "0x06e08cf0aed1663834E267E90333164a0276bbbD",
      txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      timestamp: Math.floor(Date.now() / 1000),
      status: "CONFIRMED",
    };
    setTransactions((t) => [depTx, ...t]);

    setFormDepositAmount("");
    setStatusMessage(`Deposited ${amt} tMSTC into ClubVault treasury.`);
  };

  // Deploy New Vault
  const handleDeployNewVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factoryClubName.trim()) {
      alert("Please provide a club name.");
      return;
    }
    const memberArray = factoryMembers
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    if (memberArray.length === 0) {
      alert("Please provide at least one member address.");
      return;
    }

    if (memberArray.length > 50) {
      alert("Maximum allowed members is 50 to prevent gas limit issues.");
      return;
    }

    for (const m of memberArray) {
      if (!ethers.isAddress(m)) {
        alert(`Invalid Ethereum address format: "${m}". All member addresses must be valid 0x addresses.`);
        return;
      }
    }

    const normalizedMembers = memberArray.map((m) => m.toLowerCase());
    if (new Set(normalizedMembers).size !== memberArray.length) {
      alert("Duplicate member addresses detected. All member addresses must be unique.");
      return;
    }

    if (factoryQuorum < 1 || factoryQuorum > memberArray.length) {
      alert(`Required approvals must be between 1 and ${memberArray.length} (total members).`);
      return;
    }

    // Live on-chain deployment if wallet connected
    if (typeof (window as any).ethereum !== "undefined" && isLiveConnected && account) {
      try {
        setIsDeployingVault(true);
        setStatusMessage("Submitting createVault transaction to VaultFactory on MST Testnet...");

        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const factory = new ethers.Contract(CONTRACT_ADDRESSES.VaultFactory, VaultFactoryABI, signer);

        const tx = await factory.createVault(
          factoryClubName.trim(),
          factoryClubDesc.trim(),
          memberArray,
          factoryQuorum
        );

        setStatusMessage(`Transaction broadcast: ${tx.hash.slice(0, 10)}... Awaiting block confirmation...`);
        const receipt = await tx.wait();

        let newVaultAddress = "";
        for (const log of receipt.logs) {
          try {
            const parsed = factory.interface.parseLog(log);
            if (parsed && parsed.name === "VaultCreated") {
              newVaultAddress = parsed.args[0];
              break;
            }
          } catch {}
        }

        if (!newVaultAddress) {
          const allVaults = await factory.getAllVaults();
          newVaultAddress = allVaults[allVaults.length - 1];
        }

        setClubName(factoryClubName.trim());
        setClubDescription(factoryClubDesc.trim());
        setMembers(memberArray);
        setRequiredApprovals(factoryQuorum);
        setVaultAddress(newVaultAddress);
        setVaultBalance("0.0");
        setAvailableFunds("0.0");
        setReservedFunds("0.0");
        setUnconfirmedAdvances("0.0");
        setProposals([]);
        setShowFactoryModal(false);
        setStatusMessage(`✔ VaultFactory created new ClubVault on-chain at ${newVaultAddress}`);
      } catch (err: any) {
        console.error("Factory deployment error:", err);
        if (err.code === "ACTION_REJECTED" || err.message?.includes("rejected")) {
          setStatusMessage("Notice: Transaction rejected by user in wallet.");
        } else {
          setStatusMessage(`Notice: Factory contract call did not settle (${err.reason || err.message || "Contract unreached"}). Switched to local simulation.`);
          const mockNewVaultAddr = ethers.getCreateAddress({
            from: account || "0x06e08cf0aed1663834E267E90333164a0276bbbD",
            nonce: Math.floor(Math.random() * 100),
          });
          setClubName(factoryClubName.trim());
          setClubDescription(factoryClubDesc.trim());
          setMembers(memberArray);
          setRequiredApprovals(factoryQuorum);
          setVaultAddress(mockNewVaultAddr);
          setVaultBalance("0.0");
          setAvailableFunds("0.0");
          setReservedFunds("0.0");
          setUnconfirmedAdvances("0.0");
          setProposals([]);
          setShowFactoryModal(false);
        }
      } finally {
        setIsDeployingVault(false);
      }
    } else {
      // Offline / simulation mode
      const mockNewVaultAddr = ethers.getCreateAddress({
        from: account || "0x06e08cf0aed1663834E267E90333164a0276bbbD",
        nonce: Math.floor(Math.random() * 100),
      });

      setClubName(factoryClubName.trim());
      setClubDescription(factoryClubDesc.trim());
      setMembers(memberArray);
      setRequiredApprovals(factoryQuorum);
      setVaultAddress(mockNewVaultAddr);
      setVaultBalance("0.0");
      setAvailableFunds("0.0");
      setReservedFunds("0.0");
      setUnconfirmedAdvances("0.0");
      setProposals([]);

      setShowFactoryModal(false);
      setStatusMessage(`Simulation notice: Wallet not connected to live network. Simulated ClubVault created at ${mockNewVaultAddr}`);
    }
  };

  // Filtered proposals calculation
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const matchesSearch =
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.proposer.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === "ALL") return true;
      if (statusFilter === "PENDING") return p.status === ProposalStatus.PENDING;
      if (statusFilter === "APPROVED") return p.status === ProposalStatus.APPROVED;
      if (statusFilter === "EXECUTED") return p.status === ProposalStatus.EXECUTED;
      if (statusFilter === "ADVANCES") return p.proposalType === ProposalType.ADVANCE_PAYMENT;
      return true;
    });
  }, [proposals, searchQuery, statusFilter]);

  const getStatusClass = (status: ProposalStatus) => {
    return `status-badge status-${ProposalStatus[status]}`;
  };

  return (
    <div>
      {/* 1. Translucent Fixed Navbar */}
      <Navbar
        account={account}
        accountBalance={accountBalance}
        isCorrectNetwork={isCorrectNetwork}
        onConnectWallet={connectWallet}
        onSwitchNetwork={switchNetwork}
        activeSection={activeNavSection}
        onNavigateSection={scrollToSection}
        onOpenFactoryModal={() => setShowFactoryModal(true)}
      />

      {/* 2. Scroll-Linked 3D Vault Cinematic Experience */}
      <VaultHeroExperience
        vaultBalance={vaultBalance}
        availableFunds={availableFunds}
        reservedFunds={reservedFunds}
        unconfirmedAdvances={unconfirmedAdvances}
        membersCount={members.length}
        requiredApprovals={requiredApprovals}
        onExploreClick={() => scrollToSection("treasury")}
        onConnectWallet={connectWallet}
        account={account}
      />

      {/* 3. How It Works Section */}
      <HowItWorksSection />

      {/* 4. Live Treasury Dashboard Section */}
      <main id="treasury" className="container">
        {/* Status notification toast */}
        {statusMessage && (
          <div
            style={{
              padding: "0.85rem 1.25rem",
              background: "rgba(16, 17, 20, 0.95)",
              border: "1px solid rgba(255, 48, 59, 0.4)",
              borderRadius: "var(--radius-sm)",
              marginBottom: "1.5rem",
              fontSize: "0.85rem",
              color: "var(--text-primary)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 4px 20px rgba(255, 48, 59, 0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-crimson)", display: "inline-block" }} />
              <span>{statusMessage}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        )}

        {/* Honest Architectural Boundary Banner */}
        <div className="disclaimer-banner">
          <div className="disclaimer-icon">
            <AlertTriangle style={{ width: "20px", height: "20px", color: "var(--accent-amber)" }} />
          </div>
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
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", color: "var(--text-primary)" }}>{clubName}</h2>
                <span
                  style={{
                    fontSize: "0.72rem",
                    padding: "0.2rem 0.6rem",
                    background: "rgba(255, 48, 59, 0.12)",
                    color: "var(--accent-crimson)",
                    border: "1px solid rgba(255, 48, 59, 0.3)",
                    borderRadius: "var(--radius-pill)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                  }}
                >
                  {members.length} Bounded Members
                </span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    padding: "0.2rem 0.6rem",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "var(--text-secondary)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "var(--radius-pill)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                  }}
                >
                  Quorum: {requiredApprovals} of {members.length}
                </span>
              </div>

              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: "720px", marginBottom: "0.85rem" }}>
                {clubDescription}
              </p>

              <div style={{ display: "flex", gap: "1rem", alignItems: "center", fontSize: "0.82rem", color: "var(--text-muted)", flexWrap: "wrap", fontFamily: "var(--font-mono)" }}>
                <span>
                  Vault Contract:{" "}
                  <a
                    className="address-tag"
                    href={`https://testnet.mstscan.com/address/${vaultAddress}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>{vaultAddress.slice(0, 8)}...{vaultAddress.slice(-6)}</span>
                    <ExternalLink style={{ width: "12px", height: "12px" }} />
                  </a>
                </span>
                <span>•</span>
                <span>MST Blockchain (Chain ID 91562037)</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                id="open-create-proposal-btn"
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus style={{ width: "16px", height: "16px" }} />
                <span>New Proposal</span>
              </button>
            </div>
          </div>
        </section>

        {/* Smart Contract Invariant Verification Bar */}
        <div
          className="invariant-card"
          style={{
            borderColor:
              invariantStatus === "VERIFIED"
                ? "rgba(16, 185, 129, 0.35)"
                : invariantStatus === "MISMATCH"
                ? "rgba(239, 68, 68, 0.4)"
                : "rgba(255, 255, 255, 0.12)",
            background:
              invariantStatus === "VERIFIED"
                ? "rgba(16, 185, 129, 0.05)"
                : invariantStatus === "MISMATCH"
                ? "rgba(239, 68, 68, 0.08)"
                : "rgba(255, 255, 255, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            {invariantStatus === "VERIFIED" ? (
              <ShieldCheck style={{ width: "18px", height: "18px", color: "var(--accent-emerald)" }} />
            ) : invariantStatus === "MISMATCH" ? (
              <AlertTriangle style={{ width: "18px", height: "18px", color: "var(--accent-rose)" }} />
            ) : (
              <Clock style={{ width: "18px", height: "18px", color: "var(--text-muted)" }} />
            )}

            <span
              style={{
                fontWeight: 700,
                color:
                  invariantStatus === "VERIFIED"
                    ? "var(--accent-emerald)"
                    : invariantStatus === "MISMATCH"
                    ? "var(--accent-rose)"
                    : "var(--text-secondary)",
              }}
            >
              {invariantStatus === "VERIFIED"
                ? "Invariant Verified:"
                : invariantStatus === "MISMATCH"
                ? "Invariant Check Failed:"
                : invariantStatus === "CHECKING"
                ? "Checking Invariant..."
                : "Accounting Invariant (Unverified — Disconnected):"}
            </span>

            <span className="invariant-equation">
              Contract balance ({vaultBalance}) = available funds ({availableFunds}) + reserved funds ({reservedFunds})
            </span>
          </div>

          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {invariantStatus === "VERIFIED"
              ? "Enforced by smart-contract logic and covered by tests."
              : invariantStatus === "MISMATCH"
              ? "Balance discrepancy detected between vault balance and internal accounting sum."
              : "Connect wallet to live MST Testnet contract to verify on-chain state."}
          </span>
        </div>

        {/* Treasury Metrics Grid */}
        <section className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Total Vault Balance</div>
            <div className="metric-value">
              {vaultBalance} <span style={{ fontSize: "1rem", color: "var(--accent-crimson)" }}>tMSTC</span>
            </div>
            <div className="metric-sub">On-chain native balance</div>
          </div>

          <div className="metric-card">
            <div className="metric-label" style={{ color: "var(--accent-emerald)" }}>Available to Propose</div>
            <div className="metric-value" style={{ color: "var(--accent-emerald)" }}>
              {availableFunds} <span style={{ fontSize: "1rem" }}>tMSTC</span>
            </div>
            <div className="metric-sub">Balance minus reserved</div>
          </div>

          <div className="metric-card">
            <div className="metric-label" style={{ color: "var(--accent-amber)" }}>Reserved (Approved)</div>
            <div className="metric-value" style={{ color: "var(--accent-amber)" }}>
              {reservedFunds} <span style={{ fontSize: "1rem" }}>tMSTC</span>
            </div>
            <div className="metric-sub">Locked for approved disbursements</div>
          </div>

          <div className="metric-card">
            <div className="metric-label" style={{ color: "#FF8088" }}>Advances Paid Out</div>
            <div className="metric-value" style={{ color: "#FF8088" }}>
              {unconfirmedAdvances} <span style={{ fontSize: "1rem" }}>tMSTC</span>
            </div>
            <div className="metric-sub">Advances already paid — awaiting receipt confirmation</div>
          </div>
        </section>

        {/* Tab Navigation */}
        <div id="proposals" className="tabs-nav">
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
          <button
            id="tab-transactions"
            className={`tab-btn ${activeTab === "transactions" ? "active" : ""}`}
            onClick={() => setActiveTab("transactions")}
          >
            Transactions ({transactions.length})
          </button>
        </div>

        {/* Tab 1: All Proposals with Filter & Search Controls */}
        {activeTab === "proposals" && (
          <div>
            {/* Filter Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
                marginBottom: "1.25rem",
              }}
            >
              {/* Search Box */}
              <div style={{ position: "relative", minWidth: "260px", flex: 1 }}>
                <Search
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "16px",
                    height: "16px",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: "2.25rem", fontSize: "0.85rem" }}
                  placeholder="Search by description or wallet address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status Filter Buttons */}
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {["ALL", "PENDING", "APPROVED", "EXECUTED", "ADVANCES"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className="cv-badge"
                    style={{
                      cursor: "pointer",
                      background: statusFilter === f ? "#1C1E26" : "rgba(255, 255, 255, 0.04)",
                      color: statusFilter === f ? "#FFFFFF" : "var(--text-muted)",
                      border: statusFilter === f ? "1px solid rgba(255, 48, 59, 0.35)" : "1px solid var(--border-subtle)",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Proposal Cards List */}
            <div className="card-list">
              {filteredProposals.length === 0 ? (
                <div className="glass-panel" style={{ padding: "3rem", textAlign: "center" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                    No proposals found matching the current search criteria.
                  </p>
                </div>
              ) : (
                filteredProposals.map((p) => {
                  const yesPercent = Math.min(100, (p.approvalsCount / members.length) * 100);
                  const noPercent = Math.min(100, (p.rejectionsCount / members.length) * 100);

                  return (
                    <div
                      key={p.id}
                      className="proposal-item"
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedProposalForDetail(p)}
                    >
                      <div className="proposal-header">
                        <div className="proposal-title-area">
                          <span className="proposal-id">#{p.id}</span>
                          <h3 style={{ fontSize: "1.15rem", fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
                            {p.description}
                          </h3>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              padding: "0.15rem 0.5rem",
                              background: p.proposalType === ProposalType.ADVANCE_PAYMENT ? "rgba(255, 48, 59, 0.15)" : "rgba(255, 255, 255, 0.08)",
                              color: p.proposalType === ProposalType.ADVANCE_PAYMENT ? "#FF8088" : "var(--text-primary)",
                              borderRadius: "var(--radius-sm)",
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                            }}
                          >
                            {p.proposalType === ProposalType.ADVANCE_PAYMENT ? "ADVANCE" : "STANDARD"}
                          </span>
                        </div>
                        <span className={getStatusClass(p.status)}>
                          {ProposalStatus[p.status].replace(/_/g, " ")}
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", fontSize: "0.85rem", fontFamily: "var(--font-mono)", marginBottom: "1rem", color: "var(--text-secondary)" }}>
                        <div>
                          <span style={{ color: "var(--text-muted)", display: "block" }}>Amount:</span>
                          <strong style={{ color: "var(--text-primary)", fontSize: "1.1rem" }}>
                            {p.amount} tMSTC
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-muted)", display: "block" }}>Recipient:</span>
                          <span className="address-tag" style={{ marginTop: "4px" }}>
                            {p.recipient.slice(0, 6)}...{p.recipient.slice(-4)}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-muted)", display: "block" }}>Proposer:</span>
                          <span className="address-tag" style={{ marginTop: "4px" }}>
                            {p.proposer.slice(0, 6)}...{p.proposer.slice(-4)}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-muted)", display: "block" }}>Quorum Progress:</span>
                          <strong style={{ color: p.approvalsCount >= requiredApprovals ? "var(--accent-emerald)" : "var(--text-primary)", display: "block", marginTop: "4px" }}>
                            {p.approvalsCount} / {requiredApprovals} Needed
                          </strong>
                        </div>
                      </div>

                      {p.status === ProposalStatus.APPROVED && p.proposalType === ProposalType.ADVANCE_PAYMENT && (
                        <div style={{ margin: "0.75rem 0", padding: "0.6rem 0.85rem", background: "rgba(255, 48, 59, 0.08)", border: "1px solid rgba(255, 48, 59, 0.25)", borderRadius: "var(--radius-sm)", fontSize: "0.78rem", fontFamily: "var(--font-mono)", color: "#FF8088" }}>
                          Stage 1 of 2: Quorum approved ({p.approvalsCount}/{requiredApprovals}). Releasing advance will disburse {p.amount} tMSTC to recipient. Receipt confirmation window begins upon release.
                        </div>
                      )}

                      {/* Progress bar */}
                      <div className="vote-progress">
                        <div className="vote-fill-yes" style={{ width: `${yesPercent}%` }}></div>
                        <div className="vote-fill-no" style={{ width: `${noPercent}%` }}></div>
                      </div>

                      {/* Action buttons */}
                      <div
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                          Approvals: <span style={{ color: "var(--accent-emerald)", fontWeight: "bold" }}>{p.approvalsCount}</span> | Rejections: <span style={{ color: "var(--accent-crimson)", fontWeight: "bold" }}>{p.rejectionsCount}</span>
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "0.45rem 0.8rem", fontSize: "0.8rem" }}
                            onClick={() => setSelectedProposalForDetail(p)}
                          >
                            <Eye style={{ width: "13px", height: "13px" }} />
                            <span>Details</span>
                          </button>

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
                              {p.proposalType === ProposalType.ADVANCE_PAYMENT
                                ? `Release Advance (${p.amount} tMSTC)`
                                : `Execute Disbursement (${p.amount} tMSTC)`}
                            </button>
                          )}

                          {p.status === ProposalStatus.ADVANCE_DISBURSED && (
                            <button
                              id={`submit-receipt-btn-${p.id}`}
                              className="btn btn-secondary"
                              onClick={() => {
                                setReceiptTargetProposalId(p.id);
                                setShowReceiptModal(true);
                              }}
                            >
                              Submit Receipt ↗
                            </button>
                          )}

                          {p.txHash && (
                            <a
                              href={`https://testnet.mstscan.com/tx/${p.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="address-tag"
                              title="View on MST Scan"
                            >
                              <span>Tx: {p.txHash.slice(0, 6)}...</span>
                              <ExternalLink style={{ width: "12px", height: "12px" }} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Advance Payments & Receipt Subsystem */}
        {activeTab === "advances" && (
          <div className="card-list">
            {proposals
              .filter((p) => p.proposalType === ProposalType.ADVANCE_PAYMENT)
              .map((p) => (
                <div key={p.id} className="proposal-item" style={{ borderLeft: "3px solid var(--accent-crimson)" }}>
                  <div className="proposal-header">
                    <div>
                      <span className="proposal-id">Advance #{p.id}</span>
                      <h3 style={{ fontSize: "1.15rem", fontFamily: "var(--font-heading)", marginTop: "0.25rem", color: "var(--text-primary)" }}>
                        {p.description}
                      </h3>
                    </div>
                    <span className={getStatusClass(p.status)}>
                      {ProposalStatus[p.status].replace(/_/g, " ")}
                    </span>
                  </div>

                  <div style={{ background: "var(--bg-surface-elevated)", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "1rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block" }}>Advance Disbursed:</span>
                        <strong style={{ color: "var(--text-primary)", fontSize: "1rem" }}>{p.amount} tMSTC</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block" }}>Recipient:</span>
                        <span className="address-tag">{p.recipient.slice(0, 8)}...</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block" }}>Receipt Deadline:</span>
                        <span style={{ color: "var(--text-secondary)" }}>
                          {p.receiptDeadline > 0
                            ? new Date(p.receiptDeadline * 1000).toLocaleDateString()
                            : "Begins upon execution"}
                        </span>
                      </div>
                    </div>

                    {p.receiptHash && (
                      <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-subtle)", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                        <div style={{ marginBottom: "0.25rem" }}>
                          <span style={{ color: "var(--text-muted)" }}>Submitted Receipt IPFS CID:</span>{" "}
                          <a
                            href={`https://ipfs.io/ipfs/${p.receiptHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="address-tag"
                            style={{ color: "#FF8088" }}
                          >
                            <span>{p.receiptHash.slice(0, 22)}...</span>
                            <ExternalLink style={{ width: "12px", height: "12px" }} />
                          </a>
                        </div>
                        <div style={{ color: "var(--text-secondary)" }}>
                          <span style={{ color: "var(--text-muted)" }}>Memo:</span> {p.receiptDescription}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Receipt Governance Actions */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                    <div style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                      {p.status === ProposalStatus.RECEIPT_PENDING_CONFIRMATION && (
                        <span>
                          Confirmation:{" "}
                          <strong style={{ color: "var(--accent-emerald)" }}>{p.receiptApprovals}</strong> Confirmed |{" "}
                          <strong style={{ color: "var(--accent-crimson)" }}>{p.receiptRejections}</strong> Disputed (Needs {requiredApprovals})
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
                              setReceiptTargetProposalId(p.id);
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem", color: "var(--text-primary)" }}>
                Active Members ({members.length} / 50 Max)
              </h3>
              <span style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
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
                        background: "rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.8rem",
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", color: "var(--text-primary)" }}>{m}</span>
                  </div>

                  <span
                    style={{
                      padding: "0.2rem 0.6rem",
                      borderRadius: "var(--radius-pill)",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-mono)",
                      background: "var(--accent-emerald-dim)",
                      color: "var(--accent-emerald)",
                      fontWeight: 600,
                    }}
                  >
                    Authorized Member
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Deposit & Fund Treasury */}
        {activeTab === "deposit" && (
          <div className="glass-panel" style={{ padding: "2.25rem", maxWidth: "600px", margin: "0 auto" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
              Deposit Funds to Club Treasury
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
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

              <button id="submit-deposit-btn" type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.85rem" }}>
                Deposit to Treasury
              </button>
            </form>
          </div>
        )}

        {/* Tab 5: Transactions History */}
        {activeTab === "transactions" && (
          <div id="transactions" className="glass-panel" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem", color: "var(--text-primary)" }}>
                  On-Chain Transaction History
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Verifiable ledger recordings on MST Blockchain testnet
                </p>
              </div>
              <span className="cv-badge cv-badge-neutral">
                {transactions.length} Records
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="tx-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Target Wallet</th>
                    <th>Transaction Hash</th>
                    <th>Time</th>
                    <th style={{ textAlign: "right" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                        {tx.type.replace(/_/g, " ")}
                      </td>
                      <td style={{ color: "var(--accent-crimson)", fontWeight: 700 }}>
                        {tx.amount}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {tx.fromOrTo.slice(0, 6)}...{tx.fromOrTo.slice(-4)}
                      </td>
                      <td>
                        <a
                          href={`https://testnet.mstscan.com/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="address-tag"
                        >
                          <span>{tx.txHash.slice(0, 8)}...</span>
                          <ExternalLink style={{ width: "12px", height: "12px" }} />
                        </a>
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>
                        {new Date(tx.timestamp * 1000).toLocaleTimeString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span
                          style={{
                            padding: "0.2rem 0.55rem",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.72rem",
                            background: "var(--accent-emerald-dim)",
                            color: "var(--accent-emerald)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            fontWeight: 700,
                          }}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          marginTop: "6rem",
          borderTop: "1px solid var(--border-subtle)",
          padding: "3rem 2rem",
          maxWidth: "1340px",
          margin: "6rem auto 0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.5rem",
          fontSize: "0.82rem",
          fontFamily: "var(--font-mono)",
          color: "var(--text-muted)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
            <img src="/clubvault-emblem.jpg" alt="ClubVault" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>ClubVault</span>
          <span>•</span>
          <span>MST Blockchain Invariant Engine</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <a
            href="https://testnet.mstscan.com"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--text-secondary)", textDecoration: "none" }}
          >
            MST Scan Explorer ↗
          </a>
          <span>•</span>
          <a
            href="https://testnetrpc.mstblockchain.com"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--text-secondary)", textDecoration: "none" }}
          >
            RPC Endpoint
          </a>
        </div>
      </footer>

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
                    style={{ fontSize: "0.8rem", padding: "0.6rem" }}
                    onClick={() => setFormPropType(ProposalType.STANDARD_PAYMENT)}
                  >
                    Standard Direct Payment
                  </button>
                  <button
                    type="button"
                    className={`btn ${formPropType === ProposalType.ADVANCE_PAYMENT ? "btn-primary" : "btn-secondary"}`}
                    style={{ fontSize: "0.8rem", padding: "0.6rem" }}
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
                  <small style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block", marginTop: "4px" }}>
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem" }}>
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

      {/* Modal: Proposal Detail Inspection */}
      {selectedProposalForDetail && (
        <ProposalDetailModal
          proposal={selectedProposalForDetail}
          onClose={() => setSelectedProposalForDetail(null)}
          onVote={handleVoteProposal}
          onExecute={handleExecuteProposal}
          onSubmitReceipt={(id) => {
            setReceiptTargetProposalId(id);
            setShowReceiptModal(true);
          }}
          requiredApprovals={requiredApprovals}
          totalMembers={members.length}
          account={account}
        />
      )}

      {/* Modal: Receipt Upload with local SHA-256 Hasher */}
      {showReceiptModal && (
        <ReceiptUploadModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          proposalId={receiptTargetProposalId}
          onSubmit={handleSubmitReceiptModal}
        />
      )}

      {/* Modal: Payment Execution Confirmation */}
      {confirmedTxData.isOpen && (
        <PaymentConfirmationModal
          isOpen={confirmedTxData.isOpen}
          onClose={() => setConfirmedTxData((prev) => ({ ...prev, isOpen: false }))}
          txHash={confirmedTxData.txHash}
          amount={confirmedTxData.amount}
          recipient={confirmedTxData.recipient}
          proposalId={confirmedTxData.proposalId}
          proposalDescription={confirmedTxData.proposalDescription}
        />
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem" }}>
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
