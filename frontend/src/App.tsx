import React, { useState, useEffect, useMemo, useRef } from "react";
import { ethers } from "ethers";
import {
  ClubVaultABI,
  VaultFactoryABI,
  MST_TESTNET_CONFIG,
  MST_MAINNET_CONFIG,
  CONTRACT_ADDRESSES,
  getMstRpcProvider,
} from "./contracts/config";
import {
  getBridgeKeyProvider,
  getBrowserSigner,
  switchOrAddMSTTestnet,
  switchOrAddMSTMainnet,
  parseWalletError,
  waitForInjectedProvider,
  queryActiveWalletAccount,
  connectRealBridgeKey,
  fetchWalletBalance,
} from "./utils/wallet";
import { Navbar } from "./components/Navbar";
import { VaultHeroExperience } from "./components/VaultHeroExperience";
import { HowItWorksSection } from "./components/HowItWorksSection";
import { ProposalDetailModal } from "./components/ProposalDetailModal";
import { PaymentConfirmationModal } from "./components/PaymentConfirmationModal";
import { ExecutionConfirmationModal } from "./components/ExecutionConfirmationModal";
import { ReceiptUploadModal } from "./components/ReceiptUploadModal";
import { TemplateSelectorModal, TEMPLATES } from "./components/TemplateSelectorModal";
import { BridgeKeyModal } from "./components/BridgeKeyModal";
import { GaslessVoteModal } from "./components/GaslessVoteModal";
import { MainnetDeploymentModal } from "./components/MainnetDeploymentModal";
import { ActionInbox } from "./components/ActionInbox";
import { PublicFooter } from "./components/PublicFooter";
import { PricingView } from "./views/PricingView";
import { DocsView } from "./views/DocsView";
import { SecurityView } from "./views/SecurityView";
import { FAQView } from "./views/FAQView";
import { ContactView } from "./views/ContactView";
import {
  ShieldCheck,
  Users,
  Coins,
  Lock,
  Unlock,
  AlertTriangle,
  ArrowRight,
  ArrowDownLeft,
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
  Download,
  LayoutDashboard,
  GraduationCap,
  Building,
  Compass,
  Trophy,
  HeartHandshake,
  Settings,
  RefreshCw,
  Loader2,
  X,
  Fuel,
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
  hasCurrentUserVoted?: boolean;
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

export type WalletConnectionStatus =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "WRONG_NETWORK"
  | "ERROR";

export const App: React.FC = () => {
  // Authoritative Wallet Lifecycle State: starts strictly DISCONNECTED on boot and reload
  const [walletStatus, setWalletStatus] = useState<WalletConnectionStatus>("DISCONNECTED");
  const [account, setAccount] = useState<string | null>(null);
  const [accountBalance, setAccountBalance] = useState<string>("0.00");
  const [currentChainId, setCurrentChainId] = useState<number>(MST_MAINNET_CONFIG.chainId);
  const [networkName, setNetworkName] = useState<string>("MST Mainnet (4646)");
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(true);
  const isConnectedByUserRef = useRef<boolean>(false);
  const currencySymbol = currentChainId === MST_MAINNET_CONFIG.chainId ? "MSTC" : "tMSTC";

  // On page load/refresh: silently auto-reconnect if wallet is already unlocked (no popup shown)
  useEffect(() => {
    const tryAutoReconnect = async () => {
      try {
        const provider = getBridgeKeyProvider();
        if (!provider) {
          setWalletStatus("DISCONNECTED");
          return;
        }

        // eth_accounts is a silent, no-popup read — returns [] if wallet is locked/disconnected
        const accounts: string[] = await provider.request({ method: "eth_accounts" });
        if (!accounts || accounts.length === 0) {
          setWalletStatus("DISCONNECTED");
          return;
        }

        const checksumAccount = ethers.getAddress(accounts[0]);
        const chainIdHex: string = await provider.request({ method: "eth_chainId" });
        const chainId = parseInt(chainIdHex, 16);
        const isMst = chainId === MST_TESTNET_CONFIG.chainId || chainId === MST_MAINNET_CONFIG.chainId;

        isConnectedByUserRef.current = true;
        setAccount(checksumAccount);
        setIsCorrectNetwork(isMst);
        setIsLiveConnected(isMst);
        setWalletStatus(isMst ? "CONNECTED" : "WRONG_NETWORK");

        if (isMst) {
          setCurrentChainId(chainId);
          setNetworkName(chainId === MST_MAINNET_CONFIG.chainId ? "MST Mainnet (4646)" : "MST Testnet (91562037)");

          // Restore last selected vault from localStorage, or fall back to default
          const savedVault = localStorage.getItem("clubvault_last_vault");
          const defaultVault =
            chainId === MST_MAINNET_CONFIG.chainId
              ? "0x9a81aED1b3D2d4c85A0ea8FC6129D17b2fFed339"
              : "0x8442bF7dE2d0FF9aF4136a83Cf20BE559b6Fb5C9";
          const targetVault = savedVault || defaultVault;
          setVaultAddress(targetVault);

          // Reload all proposals & vault metrics from the blockchain
          syncOnChainVault(targetVault);

          // Fetch wallet balance asynchronously in background
          fetchWalletBalance(provider, checksumAccount, chainId)
            .then((b) => { if (isConnectedByUserRef.current) setAccountBalance(b); })
            .catch(() => {});
        }
      } catch {
        setWalletStatus("DISCONNECTED");
      }
    };

    tryAutoReconnect();
  }, []);

  // Vault State: Default to the verified Genesis Vault on MST Mainnet (Chain ID 4646)
  const [vaultAddress, setVaultAddress] = useState<string>(
    CONTRACT_ADDRESSES.GenesisVaultV2 ||
    CONTRACT_ADDRESSES.GenesisVault ||
    "0x9a81aED1b3D2d4c85A0ea8FC6129D17b2fFed339"
  );
  const [clubName, setClubName] = useState<string>("Web3 Builders Club");
  const [clubDescription, setClubDescription] = useState<string>(
    "MST Mainnet Production Treasury Vault (2-of-2 Multisig)"
  );
  const [members, setMembers] = useState<string[]>([
    "0x06e08cf0aed1663834E267E90333164a0276bbbD",
    "0xF09192ed618C49e9f9A439D97d798F8c600A38a8",
  ]);
  const [requiredApprovals, setRequiredApprovals] = useState<number>(2);

  // On-Chain Contract Deployment & Transaction Stages
  const [isContractDeployedOnChain, setIsContractDeployedOnChain] = useState<boolean>(false);
  const [isSyncingContract, setIsSyncingContract] = useState<boolean>(false);
  const isSyncingVaultRef = useRef<boolean>(false);
  const [txStage, setTxStage] = useState<
    "idle" | "requesting" | "signing" | "broadcasting" | "confirming" | "success" | "error"
  >("idle");
  const [txStageMessage, setTxStageMessage] = useState<string>("");
  const [activeTxHash, setActiveTxHash] = useState<string | null>(null);
  const [votingProposalId, setVotingProposalId] = useState<number | null>(null);
  const [coSigningProposalId, setCoSigningProposalId] = useState<number | null>(null);
  const [userVotedProposalIds, setUserVotedProposalIds] = useState<number[]>([]);

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

  // Transaction History State: isolated between live on-chain verified records and demo simulation
  const [liveTransactions, setLiveTransactions] = useState<TransactionRecord[]>([]);
  const [demoTransactions, setDemoTransactions] = useState<TransactionRecord[]>([
    {
      id: "tx-1",
      type: "STANDARD_DISBURSEMENT",
      amount: "2.0 tMSTC",
      fromOrTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      txHash: "DEMO-TX-0x10b9e8413d3b7fdbd21ca9047e6be58d7f0caf0cab0edbf1341bf4cf8ad94d55",
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 2,
      status: "CONFIRMED",
    },
    {
      id: "tx-2",
      type: "ADVANCE_DISBURSEMENT",
      amount: "1.2 tMSTC",
      fromOrTo: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      txHash: "DEMO-TX-0xecd5e088aef3c5e61cec68ca63c617c4008ef013ecd2b2a8d329b8b13ded28a6",
      timestamp: Math.floor(Date.now() / 1000) - 86400,
      status: "CONFIRMED",
    },
    {
      id: "tx-3",
      type: "DEPOSIT",
      amount: "10.0 tMSTC",
      fromOrTo: "0x06e08cf0aed1663834E267E90333164a0276bbbD",
      txHash: "DEMO-TX-0x7c458a432924faef8602b667823e5e4fa4312678da4bca07e6be58d7f0c11223",
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 3,
      status: "CONFIRMED",
    },
  ]);
  const [isSyncingTransactions, setIsSyncingTransactions] = useState<boolean>(false);
  const [transactionsSyncError, setTransactionsSyncError] = useState<string | null>(null);

  // Derived transactions list: in live mode, strictly only verified on-chain and live-session transactions
  const displayedTransactions = isContractDeployedOnChain ? liveTransactions : demoTransactions;

  // UI Navigation & Modals
  const [activeTab, setActiveTab] = useState<"proposals" | "advances" | "members" | "deposit" | "transactions">("proposals");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [receiptTargetProposalId, setReceiptTargetProposalId] = useState<number | null>(null);
  const [selectedProposalForDetail, setSelectedProposalForDetail] = useState<ProposalData | null>(null);
  const [executionConfirmProposal, setExecutionConfirmProposal] = useState<ProposalData | null>(null);
  const [gaslessVoteProposal, setGaslessVoteProposal] = useState<ProposalData | null>(null);
  const [isExtensionReloadRequired, setIsExtensionReloadRequired] = useState<boolean>(false);
  const [showFactoryModal, setShowFactoryModal] = useState<boolean>(false);
  const [showBridgeKeyModal, setShowBridgeKeyModal] = useState<boolean>(false);
  const [showMainnetModal, setShowMainnetModal] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeNavSection, setActiveNavSection] = useState<string>("overview");
  const [isRefreshingData, setIsRefreshingData] = useState<boolean>(false);

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
  const [depositInputError, setDepositInputError] = useState<string | null>(null);

  // Routing & Theme State
  type RouteName = "home" | "pricing" | "docs" | "security" | "faq" | "contact";

  const getRouteFromHash = (): RouteName => {
    const hash = window.location.hash.toLowerCase();
    if (hash.startsWith("#pricing")) return "pricing";
    if (hash.startsWith("#docs")) return "docs";
    if (hash.startsWith("#security")) return "security";
    if (hash.startsWith("#faq")) return "faq";
    if (hash.startsWith("#contact")) return "contact";
    return "home";
  };

  const [currentRoute, setCurrentRoute] = useState<RouteName>(getRouteFromHash);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("cv-theme");
    return saved === "dark" || saved === "light" ? saved : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("cv-theme", theme);
  }, [theme]);

  // Synchronize hash, active section scrolling, and tabs on hashchange / reload
  useEffect(() => {
    const syncRouteAndScroll = (isHashChange = false) => {
      const hash = window.location.hash.toLowerCase();
      if (hash.startsWith("#pricing")) {
        setCurrentRoute("pricing");
        window.scrollTo({ top: 0 });
      } else if (hash.startsWith("#docs")) {
        setCurrentRoute("docs");
        window.scrollTo({ top: 0 });
      } else if (hash.startsWith("#security")) {
        setCurrentRoute("security");
        window.scrollTo({ top: 0 });
      } else if (hash.startsWith("#faq")) {
        setCurrentRoute("faq");
        window.scrollTo({ top: 0 });
      } else if (hash.startsWith("#contact")) {
        setCurrentRoute("contact");
        window.scrollTo({ top: 0 });
      } else {
        setCurrentRoute("home");

        // On initial page load or browser reload: always start at the Hero Overview page at the top (Photo 2)
        if (!isHashChange) {
          setActiveNavSection("overview");
          setActiveTab("proposals");
          if (hash.includes("treasury") || hash.includes("app") || hash.includes("home") || hash.includes("overview") || hash === "") {
            try {
              window.history.replaceState(null, "", window.location.pathname + window.location.search);
            } catch {}
          }
          window.scrollTo(0, 0);
          requestAnimationFrame(() => window.scrollTo(0, 0));
          setTimeout(() => window.scrollTo(0, 0), 60);
          setTimeout(() => window.scrollTo(0, 0), 160);
          setTimeout(() => window.scrollTo(0, 0), 320);
          setTimeout(() => window.scrollTo(0, 0), 500);
          return;
        }

        if (hash.includes("proposals")) {
          setActiveTab("proposals");
          setTimeout(() => {
            const el = document.getElementById("proposals");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }, 150);
        } else if (hash.includes("transactions")) {
          setActiveTab("transactions");
          setTimeout(() => {
            const el = document.getElementById("transactions");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }, 150);
        } else if (hash.includes("app") || hash.includes("treasury")) {
          setTimeout(() => {
            const el = document.getElementById("treasury-dashboard") || document.getElementById("treasury");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }, 150);
        } else if (hash === "" || hash.includes("home") || hash.includes("overview")) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    };

    syncRouteAndScroll(false);
    const handleHashChange = () => syncRouteAndScroll(true);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigateToRoute = (route: string) => {
    if (route === "home" || route === "overview") {
      setCurrentRoute("home");
      window.location.hash = "#home";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (route === "app" || route === "treasury") {
      setCurrentRoute("home");
      setTimeout(() => {
        const el = document.getElementById("treasury-dashboard") || document.getElementById("treasury");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } else {
      const r = route as RouteName;
      setCurrentRoute(r);
      window.location.hash = `#${r}`;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Factory Form (Defaults)
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

    if (currentRoute !== "home") {
      setCurrentRoute("home");
      window.location.hash = sectionId === "overview" ? "#home" : `#${sectionId}`;
    }

    setTimeout(() => {
      const targetId = sectionId === "overview" ? "home" : (sectionId === "treasury" ? "treasury-dashboard" : sectionId);
      const el = document.getElementById(targetId) || document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else if (sectionId === "overview") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 60);
  };

  // Export Ledger to CSV (Section 14 Audit Trail)
  const exportLedgerToCSV = () => {
    const isLive = isContractDeployedOnChain;
    const activeTxs = isLive ? liveTransactions : demoTransactions;
    const activeProps = proposals;

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
      `# Vault Contract: ${vaultAddress}`,
      `# Export Timestamp: ${new Date().toISOString()}`,
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
        `"${p.proposalType === ProposalType.ADVANCE_PAYMENT ? "ADVANCE_PROPOSAL" : "STANDARD_PROPOSAL"}"`,
        `"${p.amount} tMSTC"`,
        `"${p.recipient}"`,
        `"${p.description.replace(/"/g, '""')}"`,
        `"${ProposalStatus[p.status]}"`,
        `"${p.txHash || "PENDING"}"`,
        `"${p.receiptHash || ""}"`,
      ]);
    });

    const csvContent = [
      ...metadataRows,
      "",
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ClubVault_${isLive ? "MST_Testnet" : "Demo"}_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMessage(
      `Ledger CSV exported successfully (${rows.length} ${isLive ? "verified on-chain records" : "simulated records"}).`
    );
  };

  // Directly connect genuine BridgeKey extension wallet (prompts real extension popup)
  const connectWallet = async () => {
    // Avoid multiple simultaneous connection requests
    if (walletStatus === "CONNECTING") {
      return;
    }

    setWalletStatus("CONNECTING");

    try {
      const provider = getBridgeKeyProvider() || (await waitForInjectedProvider(500));
      if (!provider) {
        setWalletStatus("ERROR");
        setStatusMessage("BridgeKey wallet extension not detected. Please make sure BridgeKey is installed.");
        setShowBridgeKeyModal(true);
        return;
      }

      // Directly prompt genuine BridgeKey extension popup (prompts user password & account unlock)
      const res = await connectRealBridgeKey("bridgekey");

      // Validate address with ethers.isAddress
      if (!res.account || !ethers.isAddress(res.account)) {
        throw new Error("Invalid Ethereum address returned from BridgeKey wallet.");
      }

      const checksumAccount = ethers.getAddress(res.account);

      // Validate active chain ID: supports both MST Testnet (91562037) and MST Mainnet (4646)
      const chainId = res.chainIdNum || (res.chainId ? parseInt(res.chainId, 16) : 0);
      const isMst = chainId === MST_TESTNET_CONFIG.chainId || chainId === MST_MAINNET_CONFIG.chainId;

      // IMMEDIATELY update UI state — zero delay, zero blocking on RPC
      isConnectedByUserRef.current = true;
      setAccount(checksumAccount);
      setIsCorrectNetwork(isMst);
      setIsLiveConnected(isMst);
      setWalletStatus(isMst ? "CONNECTED" : "WRONG_NETWORK");
      setShowBridgeKeyModal(false);

      if (isMst) {
        setCurrentChainId(chainId);
        setNetworkName(chainId === MST_MAINNET_CONFIG.chainId ? "MST Mainnet (4646)" : "MST Testnet (91562037)");
        setStatusMessage("Wallet Connected Successfully!");

        const defaultVault = chainId === MST_MAINNET_CONFIG.chainId
          ? "0x9a81aED1b3D2d4c85A0ea8FC6129D17b2fFed339"
          : "0x8442bF7dE2d0FF9aF4136a83Cf20BE559b6Fb5C9";
        const savedVault = localStorage.getItem("clubvault_last_vault");
        const targetVault = savedVault || defaultVault;
        try { localStorage.setItem("clubvault_last_vault", targetVault); } catch {}
        setVaultAddress(targetVault);
        syncOnChainVault(targetVault);
      } else {
        setStatusMessage("Notice: Connected wallet is not on MST Network (Testnet 91562037 or Mainnet 4646).");
      }

      // Fetch live balance asynchronously in background without delaying UI
      fetchWalletBalance(res.provider || provider, checksumAccount, chainId)
        .then((b) => {
          if (isConnectedByUserRef.current) {
            setAccountBalance(b);
          }
        })
        .catch(() => {});
    } catch (err: any) {
      console.warn("BridgeKey connect error:", err);
      const parsed = parseWalletError(err);
      if (parsed.isUserReject) {
        // Required rejection behavior: keep disconnected, friendly cancellation message
        isConnectedByUserRef.current = false;
        setAccount(null);
        setAccountBalance("0.00");
        setWalletStatus("DISCONNECTED");
        setIsLiveConnected(false);
        setStatusMessage("Wallet connection was cancelled.");
      } else if (parsed.isExtensionReload) {
        setWalletStatus("ERROR");
        setIsExtensionReloadRequired(true);
      } else {
        setWalletStatus("ERROR");
        setStatusMessage(`BridgeKey Error: ${parsed.message}`);
        setShowBridgeKeyModal(true);
      }
    } finally {
      // Ensure state is never trapped in CONNECTING
      setWalletStatus((prev) => (prev === "CONNECTING" ? "DISCONNECTED" : prev));
    }
  };

  // Handle BridgeKey Wallet Session Connection from Modal
  const handleBridgeKeyConnect = (selectedAccount: string, balance: string) => {
    if (!selectedAccount || !ethers.isAddress(selectedAccount)) {
      setWalletStatus("ERROR");
      setStatusMessage("Invalid account address returned from wallet.");
      return;
    }
    const checksum = ethers.getAddress(selectedAccount);
    isConnectedByUserRef.current = true;
    setAccount(checksum);
    setAccountBalance(balance);
    if (!isCorrectNetwork) {
      setWalletStatus("WRONG_NETWORK");
      setIsLiveConnected(false);
    } else {
      setWalletStatus("CONNECTED");
      setIsLiveConnected(true);
      setStatusMessage("Wallet Connected Successfully!");
    }
    setShowBridgeKeyModal(false);
  };

  // Handle BridgeKey Disconnection
  const handleBridgeKeyDisconnect = () => {
    isConnectedByUserRef.current = false;
    try {
      localStorage.removeItem("clubvault_connected_account");
      localStorage.removeItem("clubvault_connected_balance");
      localStorage.removeItem("clubvault_preferred_wallet");
      sessionStorage.removeItem("clubvault_connected_account");
      sessionStorage.removeItem("clubvault_connected_balance");
      sessionStorage.removeItem("clubvault_preferred_wallet");
    } catch {}
    setAccount(null);
    setAccountBalance("0.00");
    setWalletStatus("DISCONNECTED");
    setIsCorrectNetwork(true);
    setIsLiveConnected(false);
    setShowBridgeKeyModal(false);
    setStatusMessage("BridgeKey wallet session disconnected.");
  };

  // Listen to genuine BridgeKey/EVM extension events during active session
  useEffect(() => {
    let isMounted = true;
    let activeProvider: any = null;

    // Stable references for proper cleanup and duplicate event prevention
    const handleAccountsChanged = (accounts: string[]) => {
      if (!isMounted) return;
      // Guard: Do not auto-connect on boot if user hasn't explicitly connected in this session
      if (!isConnectedByUserRef.current) {
        return;
      }
      if (!accounts || accounts.length === 0) {
        handleBridgeKeyDisconnect();
      } else {
        const raw = accounts[0];
        if (!ethers.isAddress(raw)) {
          handleBridgeKeyDisconnect();
          return;
        }
        const newAddr = ethers.getAddress(raw);
        setAccount(newAddr);
        setWalletStatus(isCorrectNetwork ? "CONNECTED" : "WRONG_NETWORK");
        setStatusMessage(`Active account switched to ${newAddr.slice(0, 6)}...${newAddr.slice(-4)}`);

        // Fetch balance asynchronously in background
        if (activeProvider) {
          fetchWalletBalance(activeProvider, newAddr, currentChainId)
            .then((bal) => {
              if (isMounted) setAccountBalance(bal);
            })
            .catch(() => {});
        }
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      if (!isMounted) return;
      if (!isConnectedByUserRef.current) return;
      const chainIdNum = typeof chainIdHex === "string" ? parseInt(chainIdHex, 16) : Number(chainIdHex);
      const isCorrect = chainIdNum === MST_TESTNET_CONFIG.chainId || chainIdNum === MST_MAINNET_CONFIG.chainId;
      setIsCorrectNetwork(isCorrect);
      setCurrentChainId(chainIdNum);
      if (!isCorrect) {
        setWalletStatus("WRONG_NETWORK");
        setStatusMessage("Notice: Wallet network changed away from MST Network. Transactions are disabled.");
      } else {
        setWalletStatus("CONNECTED");
        setNetworkName(chainIdNum === MST_MAINNET_CONFIG.chainId ? "MST Mainnet (4646)" : "MST Testnet (91562037)");
        setStatusMessage(
          chainIdNum === MST_MAINNET_CONFIG.chainId
            ? "✔ Connected to MST Mainnet (Chain ID 4646)."
            : "✔ Connected to MST Testnet (Chain ID 91562037)."
        );
      }
    };

    const initWalletListeners = async () => {
      try {
        const provider = getBridgeKeyProvider() || (window as any).ethereum || (await waitForInjectedProvider(1000));
        if (!provider || !isMounted) return;
        activeProvider = provider;

        provider.on?.("accountsChanged", handleAccountsChanged);
        provider.on?.("chainChanged", handleChainChanged);
      } catch (err: any) {
        console.warn("Wallet listener setup:", err);
      }
    };

    initWalletListeners();

    return () => {
      isMounted = false;
      if (activeProvider) {
        activeProvider.removeListener?.("accountsChanged", handleAccountsChanged);
        activeProvider.off?.("accountsChanged", handleAccountsChanged);
        activeProvider.removeListener?.("chainChanged", handleChainChanged);
        activeProvider.off?.("chainChanged", handleChainChanged);
      }
    };
  }, []);

  // Transaction Pre-Flight Safety Verification (Section 4)
  const verifyTxPreflight = (targetVault: string, actionName: string): boolean => {
    if (walletStatus !== "CONNECTED" || !account || !isConnectedByUserRef.current) {
      setStatusMessage(`Cannot ${actionName}: Please connect your BridgeKey wallet first.`);
      setShowBridgeKeyModal(true);
      return false;
    }
    if (!ethers.isAddress(account)) {
      setStatusMessage(`Cannot ${actionName}: Active wallet account is invalid.`);
      return false;
    }
    if (!isCorrectNetwork) {
      setStatusMessage(`Cannot ${actionName}: Wallet is not connected to ${currentChainId === 4646 ? "MST Mainnet (Chain ID 4646)" : "MST Testnet (Chain ID 91562037)"}.`);
      return false;
    }
    if (!targetVault || !ethers.isAddress(targetVault)) {
      setStatusMessage(`Cannot ${actionName}: Target vault contract address is invalid.`);
      return false;
    }
    return true;
  };

  // Switch to MST Testnet
  const switchNetwork = async () => {
    const success = await switchOrAddMSTTestnet();
    if (success) {
      setIsCorrectNetwork(true);
      setIsLiveConnected(true);
      setCurrentChainId(MST_TESTNET_CONFIG.chainId);
      setNetworkName("MST Testnet (91562037)");
      const testnetVault = "0x8442bF7dE2d0FF9aF4136a83Cf20BE559b6Fb5C9";
      setVaultAddress(testnetVault);
      syncOnChainVault(testnetVault);
      setStatusMessage("✔ Switched network to MST Testnet.");
    } else {
      setStatusMessage("Could not switch to MST Testnet. Please approve in your BridgeKey wallet.");
    }
  };

  // Switch to MST Mainnet
  const switchToMainnet = async () => {
    const success = await switchOrAddMSTMainnet();
    if (success) {
      setIsCorrectNetwork(true);
      setIsLiveConnected(true);
      setCurrentChainId(MST_MAINNET_CONFIG.chainId);
      setNetworkName("MST Mainnet (4646)");
      const mainnetVault = "0x9a81aED1b3D2d4c85A0ea8FC6129D17b2fFed339";
      setVaultAddress(mainnetVault);
      syncOnChainVault(mainnetVault);
      setStatusMessage("✔ Switched network to MST Mainnet.");
    } else {
      setStatusMessage("Could not switch to MST Mainnet. Please approve in your BridgeKey wallet.");
    }
  };

  // Helper to obtain signer and contract from detected BridgeKey / EVM wallet
  const getActiveContract = async (contractAddr: string, abi: any) => {
    const browser = await getBrowserSigner();
    if (!browser) return null;
    return new ethers.Contract(contractAddr, abi, browser.signer);
  };

  // Synchronize on-chain state from MST contract
  const syncOnChainVault = async (targetAddr?: string) => {
    const addr = targetAddr || vaultAddress;
    if (!addr || !ethers.isAddress(addr)) {
      setIsContractDeployedOnChain(false);
      return;
    }

    if (isSyncingVaultRef.current) return;
    isSyncingVaultRef.current = true;

    try {
      setIsSyncingContract(true);
      const rpc = getMstRpcProvider(currentChainId);
      const code = await rpc.getCode(addr);

      if (!code || code === "0x" || code.length <= 2) {
        setIsContractDeployedOnChain(false);
        setIsSyncingContract(false);
        return;
      }

      setIsContractDeployedOnChain(true);
      const vault = new ethers.Contract(addr, ClubVaultABI, rpc);

      const [cName, cDesc, cMembers, cQuorum, cAvail, cRes, cUnconf, cCount, bal] =
        await Promise.all([
          vault.clubName(),
          vault.clubDescription(),
          vault.getMembers(),
          vault.requiredApprovals(),
          vault.availableFunds(),
          vault.reservedFunds(),
          vault.totalUnconfirmedAdvances(),
          vault.proposalCount(),
          rpc.getBalance(addr),
        ]);

      setClubName(cName);
      setClubDescription(cDesc);
      setMembers(cMembers);
      setRequiredApprovals(Number(cQuorum));
      setVaultBalance(ethers.formatEther(bal));
      setAvailableFunds(ethers.formatEther(cAvail));
      setReservedFunds(ethers.formatEther(cRes));
      setUnconfirmedAdvances(ethers.formatEther(cUnconf));

      const count = Number(cCount);
      const loaded: ProposalData[] = [];
      for (let i = 1; i <= count; i++) {
        const p = await vault.getProposal(i);
        let hasVoted = false;
        if (account && ethers.isAddress(account)) {
          try {
            hasVoted = await vault.hasVotedOnProposal(i, account);
          } catch {
            hasVoted = Boolean(p.proposer && p.proposer.toLowerCase() === account.toLowerCase());
          }
        } else {
          hasVoted = false;
        }
        loaded.push({
          id: Number(p.id),
          proposalType: Number(p.proposalType),
          status: Number(p.status),
          proposer: p.proposer,
          recipient: p.recipient,
          amount: ethers.formatEther(p.amount),
          description: p.description,
          approvalsCount: Number(p.approvalsCount),
          rejectionsCount: Number(p.rejectionsCount),
          createdAt: Number(p.createdAt),
          executionDeadline: Number(p.executionDeadline),
          receiptGracePeriod: Number(p.receiptGracePeriod),
          receiptDeadline: Number(p.receiptDeadline),
          receiptHash: p.receiptHash,
          receiptDescription: p.receiptDescription,
          receiptApprovals: Number(p.receiptApprovals),
          receiptRejections: Number(p.receiptRejections),
          hasCurrentUserVoted: hasVoted,
        });
      }
      // Always synchronize state: if count is 0, proposals list becomes empty to clear demo mock data
      setProposals(loaded.reverse());

      // Query on-chain event logs for verifiable transaction history
      setIsSyncingTransactions(true);
      setTransactionsSyncError(null);
      try {
        const depFilter = vault.filters.FundsDeposited();
        const disbFilter = vault.filters.FundsDisbursed();
        const repFilter = vault.filters.AdvanceRepaid();

        const currSymbol = currentChainId === 4646 ? "MSTC" : "tMSTC";
        // Genesis deployment block per chain (MST Mainnet: 21785565, MST Testnet: 6671400)
        const fromBlock = currentChainId === 4646 ? 21785565 : 6671400;
        const [depLogs, disbLogs, repLogs] = await Promise.all([
          vault.queryFilter(depFilter, fromBlock, "latest"),
          vault.queryFilter(disbFilter, fromBlock, "latest"),
          vault.queryFilter(repFilter, fromBlock, "latest"),
        ]);

        const blockCache: Record<number, number> = {};
        const getBlockTimestamp = async (bNum: number) => {
          if (blockCache[bNum]) return blockCache[bNum];
          return Math.floor(Date.now() / 1000);
        };

        const onChainTxs: TransactionRecord[] = [];

        for (const log of depLogs) {
          try {
            const parsed = vault.interface.parseLog(log);
            if (parsed) {
              const ts = await getBlockTimestamp(log.blockNumber);
              onChainTxs.push({
                id: `onchain-dep-${log.transactionHash}-${log.index}`,
                type: "DEPOSIT",
                amount: `${ethers.formatEther(parsed.args[1])} ${currSymbol}`,
                fromOrTo: parsed.args[0],
                txHash: log.transactionHash,
                timestamp: ts,
                status: "CONFIRMED",
              });
            }
          } catch {}
        }

        for (const log of disbLogs) {
          try {
            const parsed = vault.interface.parseLog(log);
            if (parsed) {
              const ts = await getBlockTimestamp(log.blockNumber);
              const pType = Number(parsed.args[3]);
              onChainTxs.push({
                id: `onchain-disb-${log.transactionHash}-${log.index}`,
                type: pType === ProposalType.STANDARD_PAYMENT ? "STANDARD_DISBURSEMENT" : "ADVANCE_DISBURSEMENT",
                amount: `${ethers.formatEther(parsed.args[2])} ${currSymbol}`,
                fromOrTo: parsed.args[1],
                txHash: log.transactionHash,
                timestamp: ts,
                status: "CONFIRMED",
              });
            }
          } catch {}
        }

        for (const log of repLogs) {
          try {
            const parsed = vault.interface.parseLog(log);
            if (parsed) {
              const ts = await getBlockTimestamp(log.blockNumber);
              onChainTxs.push({
                id: `onchain-rep-${log.transactionHash}-${log.index}`,
                type: "REPAYMENT",
                amount: `${ethers.formatEther(parsed.args[2])} ${currSymbol}`,
                fromOrTo: parsed.args[1],
                txHash: log.transactionHash,
                timestamp: ts,
                status: "CONFIRMED",
              });
            }
          } catch {}
        }

        // Merge with session liveTransactions (avoiding duplicate transaction hashes)
        setLiveTransactions((prevSessionTxs) => {
          const merged = [...onChainTxs];
          const seenHashes = new Set(onChainTxs.map((x) => x.txHash.toLowerCase()));
          for (const stx of prevSessionTxs) {
            if (stx.txHash && !seenHashes.has(stx.txHash.toLowerCase())) {
              merged.push(stx);
              seenHashes.add(stx.txHash.toLowerCase());
            }
          }
          return merged.sort((a, b) => b.timestamp - a.timestamp);
        });
      } catch (eventErr: any) {
        console.warn("Could not query on-chain transaction events:", eventErr);
        setTransactionsSyncError(eventErr?.shortMessage || eventErr?.message || "Failed to query on-chain events via RPC");
      } finally {
        setIsSyncingTransactions(false);
      }
    } catch (err) {
      console.warn("Could not query on-chain contract:", err);
      setIsContractDeployedOnChain(false);
      setIsSyncingTransactions(false);
    } finally {
      isSyncingVaultRef.current = false;
      setIsSyncingContract(false);
    }
  };

  // Auto-dismiss transient status notifications after 4.5 seconds
  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    syncOnChainVault();
    const interval = setInterval(() => {
      syncOnChainVault();
    }, 25000);
    return () => clearInterval(interval);
  }, [vaultAddress]);

  // Refresh on-chain data, reload vault state, proposals, balances, transactions, and return to Overview
  const handleRefreshAll = async () => {
    setIsRefreshingData(true);
    setStatusMessage("Refreshing on-chain vault data from MST Blockchain...");
    try {
      isSyncingVaultRef.current = false;
      if (account) {
        const activeProvider = getBridgeKeyProvider() || (window as any).ethereum;
        if (activeProvider) {
          fetchWalletBalance(activeProvider, account, currentChainId)
            .then((b) => setAccountBalance(b))
            .catch(() => {});
        }
      }
      await syncOnChainVault();
      setStatusMessage("✔ Vault data refreshed successfully from MST Blockchain!");
    } catch (err: any) {
      console.warn("Refresh error:", err);
      setStatusMessage("Vault data refreshed.");
    } finally {
      setIsRefreshingData(false);
    }

    // Automatically return user to main Overview/Dashboard page and scroll to top (Photo 2)
    setCurrentRoute("home");
    setActiveNavSection("overview");
    setActiveTab("proposals");
    if (typeof window !== "undefined") {
      try {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch {}
      window.location.hash = "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Create Proposal Action
  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRecipient || !formAmount || !formDescription) {
      setTxStage("error");
      setTxStageMessage("Please fill all required proposal fields.");
      return;
    }

    const requestedAmount = parseFloat(formAmount);
    const available = parseFloat(availableFunds || "0");

    if (available <= 0) {
      setTxStage("error");
      setTxStageMessage(`Vault treasury has 0 ${currencySymbol} available. Please deposit funds into the vault before creating a payout proposal.`);
      return;
    }

    if (requestedAmount > available) {
      setTxStage("error");
      setTxStageMessage(`Cannot create proposal: Requested amount (${requestedAmount}) exceeds Available Funds (${available} ${currencySymbol}).`);
      return;
    }

    if (isContractDeployedOnChain && account) {
      if (!verifyTxPreflight(vaultAddress, "create proposal")) {
        return;
      }
      try {
        setTxStage("requesting");
        setTxStageMessage("1/5: Requesting proposal creation transaction in wallet...");
        const vault = await getActiveContract(vaultAddress, ClubVaultABI);
        if (!vault) throw new Error("BridgeKey wallet provider not available.");

        setTxStage("signing");
        setTxStageMessage("2/5: Awaiting wallet signature to create proposal...");
        const execSecs = 7 * 86400;
        const graceSecs = formPropType === ProposalType.ADVANCE_PAYMENT ? formGraceDays * 86400 : 0;
        const tx = await vault.createProposal(
          formPropType,
          formRecipient,
          ethers.parseEther(formAmount),
          formDescription,
          execSecs,
          graceSecs
        );

        setTxStage("broadcasting");
        setActiveTxHash(tx.hash);
        setTxStageMessage(`3/5: Broadcast to MST Testnet! Tx: ${tx.hash.slice(0, 10)}...`);

        setTxStage("confirming");
        setTxStageMessage("4/5: Awaiting block confirmation on MST Blockchain...");
        await tx.wait();

        setTxStage("success");
        setTxStageMessage("5/5: Proposal recorded on MST Blockchain!");
        setShowCreateModal(false);
        setFormRecipient("");
        setFormAmount("");
        setFormDescription("");
        setStatusMessage("Proposal created and confirmed on MST Testnet!");
        await syncOnChainVault();
      } catch (err: any) {
        console.error("Create proposal failed:", err);
        const parsed = parseWalletError(err);
        setTxStage("error");
        if (parsed.isExtensionReload) {
          setIsExtensionReloadRequired(true);
          setTxStageMessage("BridgeKey extension was reloaded. Please refresh this page to reconnect.");
        } else if (parsed.isUserReject) {
          setTxStageMessage("Proposal creation was rejected in wallet.");
        } else {
          setTxStageMessage(`Failed: ${parsed.message}`);
        }
      }
      return;
    }

    // Demo simulation fallback
    const newId = proposals.length + 1;
    const newProposal: ProposalData = {
      id: newId,
      proposalType: formPropType,
      status: ProposalStatus.PENDING,
      proposer: account || "0xF09192ed618C49e9f9A439D97d798F8c600A38a8",
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
    setStatusMessage(`[Demo Simulation] Proposal #${newId} created. Initial affirmative vote recorded.`);
  };

  // 1-Click Co-Sign as Member 2 (0x06e0...bbbD) for single-user live demonstration
  const handleCoSignVote = async (id: number, approve: boolean = true) => {
    setCoSigningProposalId(id);
    setTxStage("requesting");
    setTxStageMessage("1/3: Requesting Member 2 (0x06e0...bbbD) co-sign...");
    try {
      const res = await fetch("/api/cosign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: id,
          vaultAddress: vaultAddress,
          approve,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Co-sign API error");
      }
      setTxStage("confirming");
      setTxStageMessage("2/3: Member 2 on-chain vote confirmed! Updating vault quorum...");
      await syncOnChainVault();
      setTxStage("success");
      setTxStageMessage("3/3: Quorum reached (2/2)! Proposal is now APPROVED and ready for execution.");
      setStatusMessage(`Member 2 successfully co-signed Proposal #${id}! Quorum satisfied.`);
    } catch {
      try {
        setTxStageMessage("2/3: Broadcasting Member 2 vote via MST RPC node...");
        const net = ethers.Network.from({ name: "mst-testnet", chainId: 91562037 });
        const provider = new ethers.JsonRpcProvider("https://testnetrpc.mstblockchain.com", net, { staticNetwork: net });
        const wallet = new ethers.Wallet("0xfcbe55265833744a17fd5bdc3c7da81a74dc12a3c846f99a2031f5e291e5c5c3", provider);
        const abi = [
          "function voteProposal(uint256, bool) external",
          "function hasVotedOnProposal(uint256, address) view returns (bool)"
        ];
        const vault = new ethers.Contract(vaultAddress, abi, wallet);
        const already = await vault.hasVotedOnProposal(id, wallet.address);
        if (!already) {
          const tx = await vault.voteProposal(id, approve);
          await tx.wait(1);
        }
        await syncOnChainVault();
        setTxStage("success");
        setTxStageMessage("3/3: Quorum reached (2/2)! Proposal is now APPROVED and ready for execution.");
        setStatusMessage(`Member 2 successfully co-signed Proposal #${id}! Quorum satisfied.`);
      } catch (fallbackErr: any) {
        setTxStage("error");
        setTxStageMessage(fallbackErr.message || "Failed to co-sign as Member 2.");
      }
    } finally {
      setCoSigningProposalId(null);
    }
  };

  // Vote on Proposal
  const handleVoteProposal = async (id: number, approve: boolean) => {
    // 1. In-memory pre-vote guard using existing proposal state
    const existingProp = proposals.find((p) => p.id === id);
    if (existingProp) {
      const isProposer = Boolean(account && existingProp.proposer && existingProp.proposer.toLowerCase() === account.toLowerCase());
      const hasVoted = Boolean(isProposer || existingProp.hasCurrentUserVoted || userVotedProposalIds.includes(id));
      if (hasVoted) {
        if (isProposer) {
          const proceedCoSign = window.confirm(
            "Your vote as Proposer is already recorded on-chain (1/2 Approvals).\n\nWould you like to Co-Sign as Member 2 (0x06e0...bbbD) right now to satisfy quorum (2/2) and approve the proposal?"
          );
          if (proceedCoSign) {
            await handleCoSignVote(id, approve);
            return;
          }
        }
        setTxStage("error");
        setTxStageMessage(
          isProposer
            ? "Your vote was already auto-cast as proposer. Click '⚡ Co-Sign as Member 2' to reach 2/2 approvals!"
            : "You have already voted on this proposal. Awaiting other member approvals."
        );
        return;
      }
      if (existingProp.status === ProposalStatus.APPROVED) {
        setTxStage("error");
        setTxStageMessage("Quorum Reached — This proposal is approved and ready for execution.");
        return;
      }
      if (existingProp.status === ProposalStatus.EXECUTED) {
        setTxStage("error");
        setTxStageMessage("This proposal has already been executed.");
        return;
      }
      if (existingProp.status !== ProposalStatus.PENDING) {
        setTxStage("error");
        setTxStageMessage("Voting is closed for this proposal.");
        return;
      }
    }

    const hasOnChainAddress = ethers.isAddress(vaultAddress);
    if (isContractDeployedOnChain || hasOnChainAddress) {
      if (!verifyTxPreflight(vaultAddress, "submit vote")) {
        return;
      }
      setVotingProposalId(id);
      try {
        setTxStage("requesting");
        setTxStageMessage(`1/5: Requesting vote (${approve ? "Approve" : "Reject"}) in BridgeKey wallet...`);
        const vault = await getActiveContract(vaultAddress, ClubVaultABI);
        if (!vault) throw new Error("BridgeKey wallet provider not available. Please ensure BridgeKey is unlocked.");

        // 2. Authoritative live on-chain status verification before requesting wallet signature
        try {
          if (account && (await vault.hasVotedOnProposal(id, account))) {
            setTxStage("error");
            setTxStageMessage("Your vote is already recorded on-chain. Second member approval is required to reach quorum.");
            return;
          }
          const onChainProp = await vault.getProposal(id);
          const onChainStatus = Number(onChainProp.status);
          if (onChainStatus === ProposalStatus.APPROVED) {
            setTxStage("error");
            setTxStageMessage("Quorum Reached — This proposal is approved and ready for execution.");
            return;
          }
          if (onChainStatus === ProposalStatus.EXECUTED) {
            setTxStage("error");
            setTxStageMessage("This proposal has already been executed.");
            return;
          }
          if (onChainStatus !== ProposalStatus.PENDING) {
            setTxStage("error");
            setTxStageMessage("Voting is closed for this proposal.");
            return;
          }
        } catch (checkErr: any) {
          if (checkErr?.message?.includes("quorum") || checkErr?.message?.includes("recorded")) {
            return;
          }
          setTxStage("error");
          setTxStageMessage("Unable to verify proposal status. Please refresh and try again.");
          return;
        }

        setTxStage("signing");
        setTxStageMessage(`2/5: Awaiting wallet confirmation in BridgeKey to vote on Proposal #${id}... (Click BridgeKey icon in toolbar)`);
        const tx = await vault.voteProposal(id, approve);

        setTxStage("broadcasting");
        setActiveTxHash(tx.hash);
        setTxStageMessage(`3/5: Vote broadcast! Tx: ${tx.hash.slice(0, 10)}...`);

        setTxStage("confirming");
        setTxStageMessage("4/5: Awaiting block confirmation on MST Blockchain...");
        await tx.wait();

        setUserVotedProposalIds((prev) => [...prev, id]);
        setTxStage("success");
        setTxStageMessage("5/5: Vote recorded on-chain on MST Testnet!");
        setStatusMessage(`Vote recorded on Proposal #${id} on MST Testnet.`);
        await syncOnChainVault();
      } catch (err: any) {
        console.error("Vote failed:", err);
        const parsed = parseWalletError(err);
        setTxStage("error");
        if (parsed.isExtensionReload) {
          setIsExtensionReloadRequired(true);
          setTxStageMessage("BridgeKey extension was reloaded. Please refresh this page to reconnect.");
        } else if (parsed.isUserReject) {
          setTxStageMessage("Vote rejected in BridgeKey wallet.");
        } else {
          setTxStageMessage(parsed.message);
        }
      } finally {
        setVotingProposalId(null);
      }
      return;
    }

    // Demo simulation fallback
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        const newApprovals = approve ? p.approvalsCount + 1 : p.approvalsCount;
        const newRejections = !approve ? p.rejectionsCount + 1 : p.rejectionsCount;

        let newStatus = p.status;
        if (newApprovals >= requiredApprovals) {
          newStatus = ProposalStatus.APPROVED;
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
    setStatusMessage(`[Demo Simulation] Vote recorded on Proposal #${id} (${approve ? "Affirmative" : "Rejected"})`);
    setVotingProposalId(null);
  };

  // Execute Proposal - Opens Pre-Flight Verification Summary
  const handleExecuteProposal = (id: number) => {
    const targetProp = proposals.find((x) => x.id === id);
    if (!targetProp) return;
    setExecutionConfirmProposal(targetProp);
  };

  // Called when user confirms pre-flight verification summary
  const proceedExecuteProposal = async (targetProp: ProposalData) => {
    setExecutionConfirmProposal(null);
    const id = targetProp.id;
    const hasOnChainAddress = ethers.isAddress(vaultAddress);
    if (isContractDeployedOnChain || hasOnChainAddress) {
      if (!verifyTxPreflight(vaultAddress, "execute disbursement")) {
        return;
      }
      try {
        setTxStage("requesting");
        setTxStageMessage(`1/5: Requesting payment disbursement in BridgeKey for Proposal #${id} (executeProposal selector: 0x0d61b519)...`);
        const vault = await getActiveContract(vaultAddress, ClubVaultABI);
        if (!vault) throw new Error("BridgeKey wallet provider not available. Please ensure BridgeKey is unlocked.");

        setTxStage("signing");
        setTxStageMessage(`2/5: Awaiting wallet signature to execute Proposal #${id}...`);
        const tx = await vault.executeProposal(id);

        setTxStage("broadcasting");
        setActiveTxHash(tx.hash);
        setTxStageMessage(`3/5: Broadcast! Tx: ${tx.hash.slice(0, 10)}...`);

        setTxStage("confirming");
        setTxStageMessage("4/5: Awaiting block confirmation on MST Blockchain...");
        const receipt = await tx.wait();

        setTxStage("success");
        setTxStageMessage("5/5: Proposal executed & funds disbursed on MST Testnet!");

        const executedTxHash = receipt.hash || tx.hash;

        const newTx: TransactionRecord = {
          id: `tx-${Date.now()}`,
          type: targetProp.proposalType === ProposalType.STANDARD_PAYMENT ? "STANDARD_DISBURSEMENT" : "ADVANCE_DISBURSEMENT",
          amount: `${targetProp.amount} tMSTC`,
          fromOrTo: targetProp.recipient,
          txHash: executedTxHash,
          timestamp: Math.floor(Date.now() / 1000),
          status: "CONFIRMED",
        };
        setLiveTransactions((t) => [newTx, ...t.filter((x) => x.txHash !== newTx.txHash)]);

        setConfirmedTxData({
          isOpen: true,
          txHash: executedTxHash,
          amount: targetProp.amount,
          recipient: targetProp.recipient,
          proposalId: targetProp.id,
          proposalDescription: targetProp.description,
        });

        setStatusMessage(`Proposal #${id} executed! Funds disbursed on MST Blockchain.`);
        await syncOnChainVault();
      } catch (err: any) {
        console.error("Execution failed:", err);
        const parsed = parseWalletError(err);
        setTxStage("error");
        if (parsed.isExtensionReload) {
          setIsExtensionReloadRequired(true);
          setTxStageMessage("BridgeKey extension was reloaded. Please refresh this page to reconnect.");
        } else if (parsed.isUserReject) {
          setTxStageMessage("Execution transaction was rejected in wallet.");
        } else {
          setTxStageMessage(`Execution failed: ${parsed.message}`);
        }
      }
      return;
    }

    // Demo simulation fallback
    const executedTxHash = "DEMO-EXEC-" + id + "-" + Date.now().toString(16);
    const amt = parseFloat(targetProp.amount);
    setVaultBalance((prevBal) => (parseFloat(prevBal) - amt).toFixed(2));
    setReservedFunds((prevRes) => (parseFloat(prevRes) - amt).toFixed(2));

    const newTx: TransactionRecord = {
      id: `tx-${Date.now()}`,
      type: targetProp.proposalType === ProposalType.STANDARD_PAYMENT ? "STANDARD_DISBURSEMENT" : "ADVANCE_DISBURSEMENT",
      amount: `${targetProp.amount} tMSTC`,
      fromOrTo: targetProp.recipient,
      txHash: executedTxHash,
      timestamp: Math.floor(Date.now() / 1000),
      status: "CONFIRMED",
    };
    setDemoTransactions((t) => [newTx, ...t]);

    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (p.proposalType === ProposalType.STANDARD_PAYMENT) {
          return { ...p, status: ProposalStatus.EXECUTED };
        } else {
          return {
            ...p,
            status: ProposalStatus.ADVANCE_DISBURSED,
            receiptDeadline: Math.floor(Date.now() / 1000) + p.receiptGracePeriod,
          };
        }
      })
    );

    setConfirmedTxData({
      isOpen: true,
      txHash: executedTxHash,
      amount: targetProp.amount,
      recipient: targetProp.recipient,
      proposalId: targetProp.id,
      proposalDescription: targetProp.description,
    });

    setStatusMessage(`[Demo Simulation] Proposal #${id} executed. Funds simulated as disbursed.`);
  };



  // Submit Receipt Action
  const handleSubmitReceiptModal = async (hash: string, memo: string) => {
    if (!receiptTargetProposalId) return;

    if (isContractDeployedOnChain && account) {
      if (!verifyTxPreflight(vaultAddress, "register receipt")) {
        return;
      }
      try {
        setTxStage("requesting");
        setTxStageMessage("1/5: Requesting receipt registration in wallet...");
        const vault = await getActiveContract(vaultAddress, ClubVaultABI);
        if (!vault) throw new Error("BridgeKey wallet provider not available.");

        setTxStage("signing");
        setTxStageMessage("2/5: Awaiting wallet signature to register receipt digest...");
        const tx = await vault.submitReceipt(receiptTargetProposalId, hash, memo);

        setTxStage("broadcasting");
        setActiveTxHash(tx.hash);
        setTxStageMessage(`3/5: Receipt broadcast! Tx: ${tx.hash.slice(0, 10)}...`);

        setTxStage("confirming");
        setTxStageMessage("4/5: Awaiting block confirmation...");
        await tx.wait();

        setTxStage("success");
        setTxStageMessage("5/5: Receipt hash registered on-chain!");
        setShowReceiptModal(false);
        setStatusMessage(`Receipt registered for Advance #${receiptTargetProposalId} on MST Testnet.`);
        await syncOnChainVault();
      } catch (err: any) {
        console.error("Submit receipt failed:", err);
        const parsed = parseWalletError(err);
        setTxStage("error");
        if (parsed.isExtensionReload) {
          setIsExtensionReloadRequired(true);
          setTxStageMessage("BridgeKey extension was reloaded. Please refresh this page to reconnect.");
        } else if (parsed.isUserReject) {
          setTxStageMessage("Receipt submission was rejected in wallet.");
        } else {
          setTxStageMessage(`Submission failed: ${parsed.message}`);
        }
      }
      return;
    }

    // Demo fallback
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
    setStatusMessage(`[Demo Simulation] Receipt hash registered on Advance #${receiptTargetProposalId}.`);
  };

  // Vote on Receipt Confirmation
  const handleVoteReceipt = async (id: number, confirm: boolean) => {
    if (isContractDeployedOnChain && account) {
      if (!verifyTxPreflight(vaultAddress, "review receipt")) {
        return;
      }
      try {
        setTxStage("requesting");
        setTxStageMessage("1/5: Requesting receipt review vote in wallet...");
        const vault = await getActiveContract(vaultAddress, ClubVaultABI);
        if (!vault) throw new Error("BridgeKey wallet provider not available.");

        setTxStage("signing");
        setTxStageMessage("2/5: Awaiting wallet signature for receipt confirmation...");
        const reason = confirm ? "Receipt confirmed by member" : "Receipt rejected/disputed by member";
        const tx = await vault.voteOnReceipt(id, confirm, reason);

        setTxStage("broadcasting");
        setActiveTxHash(tx.hash);
        setTxStageMessage(`3/5: Broadcast! Tx: ${tx.hash.slice(0, 10)}...`);

        setTxStage("confirming");
        setTxStageMessage("4/5: Awaiting confirmation...");
        await tx.wait();

        setTxStage("success");
        setTxStageMessage("5/5: Receipt vote recorded on-chain!");
        setStatusMessage(`Receipt vote on Advance #${id} recorded on MST Testnet.`);
        await syncOnChainVault();
      } catch (err: any) {
        console.error("Vote receipt failed:", err);
        const parsed = parseWalletError(err);
        setTxStage("error");
        if (parsed.isExtensionReload) {
          setIsExtensionReloadRequired(true);
          setTxStageMessage("BridgeKey extension was reloaded. Please refresh this page to reconnect.");
        } else if (parsed.isUserReject) {
          setTxStageMessage("Receipt vote rejected in wallet.");
        } else {
          setTxStageMessage(`Receipt vote failed: ${parsed.message}`);
        }
      }
      return;
    }

    // Demo fallback
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

    setStatusMessage(`[Demo Simulation] Receipt vote recorded on Advance #${id} (${confirm ? "Confirmed" : "Disputed"})`);
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
  const handleRepayAdvance = async (id: number) => {
    const p = proposals.find((x) => x.id === id);
    if (!p) return;
    const amt = parseFloat(p.amount);

    if (isContractDeployedOnChain && account) {
      if (!verifyTxPreflight(vaultAddress, "refund advance")) {
        return;
      }
      try {
        setTxStage("requesting");
        setTxStageMessage("1/5: Requesting advance refund transaction in wallet...");
        const vault = await getActiveContract(vaultAddress, ClubVaultABI);
        if (!vault) throw new Error("BridgeKey wallet provider not available.");

        setTxStage("signing");
        setTxStageMessage(`2/5: Awaiting signature for refund of ${amt} tMSTC...`);
        const tx = await vault.repayAdvance(id, { value: ethers.parseEther(p.amount) });

        setTxStage("broadcasting");
        setActiveTxHash(tx.hash);
        setTxStageMessage(`3/5: Broadcast! Tx: ${tx.hash.slice(0, 10)}...`);

        setTxStage("confirming");
        setTxStageMessage("4/5: Awaiting block confirmation...");
        const receipt = await tx.wait();

        setTxStage("success");
        setTxStageMessage("5/5: Advance refunded to vault treasury!");

        const repayTx: TransactionRecord = {
          id: `tx-${Date.now()}`,
          type: "REPAYMENT",
          amount: `${amt} tMSTC`,
          fromOrTo: p.recipient,
          txHash: receipt.hash || tx.hash,
          timestamp: Math.floor(Date.now() / 1000),
          status: "CONFIRMED",
        };
        setLiveTransactions((t) => [repayTx, ...t.filter((x) => x.txHash !== repayTx.txHash)]);
        setStatusMessage(`Advance #${id} refunded on MST Testnet.`);
        await syncOnChainVault();
      } catch (err: any) {
        console.error("Repayment failed:", err);
        const parsed = parseWalletError(err);
        setTxStage("error");
        if (parsed.isExtensionReload) {
          setIsExtensionReloadRequired(true);
          setTxStageMessage("BridgeKey extension was reloaded. Please refresh this page to reconnect.");
        } else if (parsed.isUserReject) {
          setTxStageMessage("Repayment rejected in wallet.");
        } else {
          setTxStageMessage(`Repayment failed: ${parsed.message}`);
        }
      }
      return;
    }

    // Demo fallback
    setVaultBalance((prevBal) => (parseFloat(prevBal) - amt).toFixed(2));
    setAvailableFunds((prevAvail) => (parseFloat(prevAvail) + amt).toFixed(2));
    setUnconfirmedAdvances((prevAdv) => Math.max(0, parseFloat(prevAdv) - amt).toFixed(2));

    setProposals((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: ProposalStatus.RECEIPT_REPAID } : x))
    );

    const repayTx: TransactionRecord = {
      id: `tx-${Date.now()}`,
      type: "REPAYMENT",
      amount: `${amt} tMSTC`,
      fromOrTo: p.recipient,
      txHash: "DEMO-TX-REPAY-" + id + "-" + Date.now().toString(16),
      timestamp: Math.floor(Date.now() / 1000),
      status: "CONFIRMED",
    };
    setDemoTransactions((t) => [repayTx, ...t]);

    setStatusMessage(`[Demo Simulation] Advance #${id} fully repaid into vault treasury.`);
  };

  // Strict Deposit Input Validator
  const validateDepositInput = (raw: string): { isValid: boolean; parsedWei?: bigint; error?: string } => {
    const trimmed = raw ? raw.trim() : "";
    if (!trimmed) {
      return { isValid: false, error: "Please enter a deposit amount." };
    }
    // Must be a valid non-negative decimal string (rejects signs, letters, double decimals, etc.)
    if (!/^\d+(\.\d+)?$/.test(trimmed)) {
      return { isValid: false, error: "Amount must be a valid positive number with no negative signs or symbols." };
    }
    try {
      const wei = ethers.parseEther(trimmed);
      if (wei <= 0n) {
        return { isValid: false, error: "Deposit amount must be strictly greater than zero." };
      }

      // Check against connected wallet balance if connected
      if (account && accountBalance) {
        const balNum = parseFloat(accountBalance);
        const enterNum = parseFloat(trimmed);
        if (balNum > 0 && enterNum > balNum) {
          return {
            isValid: false,
            error: `Entered amount (${trimmed} ${currencySymbol}) exceeds your wallet balance (${accountBalance} ${currencySymbol}). Please enter a lower amount.`,
          };
        }
      }

      return { isValid: true, parsedWei: wei };
    } catch {
      return { isValid: false, error: "Invalid decimal precision (maximum 18 decimal places supported)." };
    }
  };

  // Deposit Funds
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateDepositInput(formDepositAmount);
    if (!validation.isValid || !validation.parsedWei) {
      setDepositInputError(validation.error || "Invalid deposit amount.");
      setStatusMessage(`Validation Error: ${validation.error || "Invalid deposit amount."}`);
      return;
    }
    setDepositInputError(null);

    const wei = validation.parsedWei;
    const formattedAmount = formDepositAmount.trim();

    if (!account) {
      setStatusMessage(`Please connect your BridgeKey wallet to deposit ${currencySymbol} into the vault.`);
      setShowBridgeKeyModal(true);
      return;
    }

    let targetVault = vaultAddress;
    if (currentChainId === 4646 && targetVault.toLowerCase() !== "0x9a81aed1b3d2d4c85a0ea8fc6129d17b2ffed339") {
      targetVault = "0x9a81aED1b3D2d4c85A0ea8FC6129D17b2fFed339";
      setVaultAddress(targetVault);
      await syncOnChainVault(targetVault);
    } else if (currentChainId === 91562037 && targetVault.toLowerCase() === "0x9a81aed1b3d2d4c85a0ea8fc6129d17b2ffed339") {
      targetVault = "0x8442bF7dE2d0FF9aF4136a83Cf20BE559b6Fb5C9";
      setVaultAddress(targetVault);
      await syncOnChainVault(targetVault);
    }

    if (!verifyTxPreflight(targetVault, "deposit funds")) {
      return;
    }

    try {
      setTxStage("requesting");
      setTxStageMessage(`1/5: Requesting deposit of ${formattedAmount} ${currencySymbol} in your BridgeKey wallet...`);
      const vault = await getActiveContract(targetVault, ClubVaultABI);
      if (!vault) throw new Error("BridgeKey wallet provider not available.");

      setTxStage("signing");
      setTxStageMessage(`2/5: Awaiting wallet signature for deposit of ${formattedAmount} ${currencySymbol} to ${targetVault}...`);
      const tx = await vault.deposit({ value: wei });

      setTxStage("broadcasting");
      setActiveTxHash(tx.hash);
      setTxStageMessage(`3/5: Broadcast to ${networkName}! Tx: ${tx.hash.slice(0, 10)}... (Awaiting confirmation)`);

      setTxStage("confirming");
      setTxStageMessage("4/5: Awaiting block confirmation on MST Blockchain...");
      const receipt = await tx.wait();

      setTxStage("success");
      setTxStageMessage(`5/5: Deposit confirmed on ${networkName}! (Block ${receipt.blockNumber || "mined"})`);

      const depTx: TransactionRecord = {
        id: `tx-${Date.now()}`,
        type: "DEPOSIT",
        amount: `${formattedAmount} ${currencySymbol}`,
        fromOrTo: account,
        txHash: receipt.hash || tx.hash,
        timestamp: Math.floor(Date.now() / 1000),
        status: "CONFIRMED",
      };
      setLiveTransactions((t) => [depTx, ...t.filter((x) => x.txHash !== depTx.txHash)]);
      // Only clear input after confirmed on-chain transaction outcome
      setFormDepositAmount("");
      setStatusMessage(`Deposited ${formattedAmount} ${currencySymbol} successfully on ${networkName}!`);
      await syncOnChainVault(targetVault);
    } catch (err: any) {
      console.error("Deposit failed:", err);
      const parsed = parseWalletError(err);
      setTxStage("error");
      if (parsed.isExtensionReload) {
        setIsExtensionReloadRequired(true);
        setTxStageMessage("BridgeKey extension was reloaded in the background. Please refresh this page to reconnect.");
        setStatusMessage("Notice: BridgeKey extension was updated in the background. Please refresh this page.");
      } else if (parsed.isUserReject) {
        setTxStageMessage("Deposit transaction was rejected by user in BridgeKey wallet.");
        setStatusMessage("Notice: Deposit was cancelled in your wallet. The entered amount has been preserved.");
      } else {
        setTxStageMessage(`Deposit failed: ${parsed.message}`);
        setStatusMessage(`Deposit transaction failed: ${parsed.message}`);
      }
    }
    return;

    // Demo fallback
    const amtNumber = Number(formattedAmount);
    setVaultBalance((prevBal) => (parseFloat(prevBal) + amtNumber).toFixed(2));
    setAvailableFunds((prevAvail) => (parseFloat(prevAvail) + amtNumber).toFixed(2));

    const depTx: TransactionRecord = {
      id: `tx-${Date.now()}`,
      type: "DEPOSIT",
      amount: `${formattedAmount} tMSTC`,
      fromOrTo: account || "0xF09192ed618C49e9f9A439D97d798F8c600A38a8",
      txHash: "DEMO-TX-DEP-" + Date.now().toString(16),
      timestamp: Math.floor(Date.now() / 1000),
      status: "CONFIRMED",
    };
    setDemoTransactions((t) => [depTx, ...t]);

    setFormDepositAmount("");
    setStatusMessage(`[Demo Simulation] Deposited ${formattedAmount} tMSTC into ClubVault.`);
  };

  // Expire Proposal Action (Releases reserved funds after execution deadline)
  const handleExpireProposal = async (id: number) => {
    if (isContractDeployedOnChain && account) {
      try {
        setTxStage("requesting");
        setTxStageMessage("1/5: Requesting proposal expiration transaction...");
        const vault = await getActiveContract(vaultAddress, ClubVaultABI);
        if (!vault) throw new Error("BridgeKey wallet provider not available.");

        setTxStage("signing");
        setTxStageMessage(`2/5: Awaiting wallet signature to expire Proposal #${id}...`);
        const tx = await vault.markProposalExpired(id);

        setTxStage("broadcasting");
        setActiveTxHash(tx.hash);
        setTxStageMessage(`3/5: Broadcast! Tx: ${tx.hash.slice(0, 10)}...`);

        setTxStage("confirming");
        setTxStageMessage("4/5: Awaiting confirmation...");
        await tx.wait();

        setTxStage("success");
        setTxStageMessage("5/5: Proposal marked expired & reserved funds released!");
        setStatusMessage(`Proposal #${id} expired and funds released on MST Testnet.`);
        await syncOnChainVault();
      } catch (err: any) {
        console.error("Mark expired failed:", err);
        setTxStage("error");
        setTxStageMessage(err.code === 4001 || err.action === "reject" ? "Action rejected in wallet." : `Failed: ${err.message || "Contract error"}`);
      }
      return;
    }

    // Demo simulation fallback
    const targetProp = proposals.find((x) => x.id === id);
    if (!targetProp) return;
    const amt = parseFloat(targetProp.amount);
    setReservedFunds((prevRes) => Math.max(0, parseFloat(prevRes) - amt).toFixed(2));
    setAvailableFunds((prevAvail) => (parseFloat(prevAvail) + amt).toFixed(2));
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: ProposalStatus.REJECTED } : p))
    );
    setStatusMessage(`[Demo Simulation] Proposal #${id} marked as expired and reserved funds released.`);
  };

  // Deploy New Vault using Organization Template or Custom Config
  const handleDeployWithTemplate = async (
    tplName: string,
    tplDesc: string,
    memberArray: string[],
    quorum: number
  ) => {
    if (!tplName.trim()) {
      alert("Please provide a club name.");
      return;
    }
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
    if (quorum < 1 || quorum > memberArray.length) {
      alert(`Required approvals must be between 1 and ${memberArray.length} (total members).`);
      return;
    }

    if (
      isLiveConnected &&
      account &&
      CONTRACT_ADDRESSES.VaultFactory
    ) {
      try {
        setIsDeployingVault(true);
        setStatusMessage("Submitting createVault transaction to VaultFactory on MST Testnet...");

        const factory = await getActiveContract(CONTRACT_ADDRESSES.VaultFactory, VaultFactoryABI);
        if (!factory) throw new Error("BridgeKey wallet provider not available.");

        const tx = await factory.createVault(
          tplName.trim(),
          tplDesc.trim(),
          memberArray,
          quorum
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

        setClubName(tplName.trim());
        setClubDescription(tplDesc.trim());
        setMembers(memberArray);
        setRequiredApprovals(quorum);
        setVaultAddress(newVaultAddress);
        setVaultBalance("0.0");
        setAvailableFunds("0.0");
        setReservedFunds("0.0");
        setUnconfirmedAdvances("0.0");
        setProposals([]);
        setLiveTransactions([]);
        setShowFactoryModal(false);
        setStatusMessage(`✔ VaultFactory created new ClubVault on-chain at ${newVaultAddress}`);
        navigateToRoute("app");
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
          setClubName(tplName.trim());
          setClubDescription(tplDesc.trim());
          setMembers(memberArray);
          setRequiredApprovals(quorum);
          setVaultAddress(mockNewVaultAddr);
          setVaultBalance("0.0");
          setAvailableFunds("0.0");
          setReservedFunds("0.0");
          setUnconfirmedAdvances("0.0");
          setProposals([]);
          setDemoTransactions([]);
          setShowFactoryModal(false);
          navigateToRoute("app");
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

      setClubName(tplName.trim());
      setClubDescription(tplDesc.trim());
      setMembers(memberArray);
      setRequiredApprovals(quorum);
      setVaultAddress(mockNewVaultAddr);
      setVaultBalance("0.0");
      setAvailableFunds("0.0");
      setReservedFunds("0.0");
      setUnconfirmedAdvances("0.0");
      setProposals([]);
      setDemoTransactions([]);

      setShowFactoryModal(false);
      setStatusMessage(`Simulation notice: Wallet not connected to live network. Simulated ClubVault created at ${mockNewVaultAddr}`);
      navigateToRoute("app");
    }
  };

  const handleDeployNewVault = async (e: React.FormEvent) => {
    e.preventDefault();
    const memberArray = factoryMembers
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
    await handleDeployWithTemplate(factoryClubName, factoryClubDesc, memberArray, factoryQuorum);
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
        isCorrectNetwork={isCorrectNetwork && walletStatus !== "WRONG_NETWORK"}
        onConnectWallet={connectWallet}
        onOpenAccountModal={() => setShowBridgeKeyModal(true)}
        onSwitchNetwork={switchNetwork}
        isConnecting={walletStatus === "CONNECTING"}
        currencySymbol={currencySymbol}
        activeSection={activeNavSection}
        onNavigateSection={scrollToSection}
        onOpenFactoryModal={() => setShowFactoryModal(true)}
        onOpenMainnetModal={() => setShowMainnetModal(true)}
        currentRoute={currentRoute}
        onNavigateRoute={navigateToRoute}
        theme={theme}
        onToggleTheme={toggleTheme}
        onRefresh={handleRefreshAll}
        isRefreshing={isRefreshingData}
      />

      {/* Global Toast Notification for Instant Feedback */}
      {statusMessage && (
        <div
          id="clubvault-floating-toast"
          style={{
            position: "fixed",
            top: "76px",
            right: "24px",
            zIndex: 99999,
            maxWidth: "420px",
            padding: "0.85rem 1.25rem",
            backgroundColor:
              statusMessage.includes("cancelled") || statusMessage.includes("rejected")
                ? "rgba(28, 22, 18, 0.97)"
                : statusMessage.includes("successfully")
                ? "rgba(14, 28, 20, 0.97)"
                : "rgba(18, 19, 26, 0.97)",
            backdropFilter: "blur(16px)",
            border: `1.5px solid ${
              statusMessage.includes("cancelled") || statusMessage.includes("rejected")
                ? "rgba(245, 158, 11, 0.7)"
                : statusMessage.includes("successfully")
                ? "rgba(16, 185, 129, 0.7)"
                : "rgba(255, 48, 59, 0.5)"
            }`,
            borderRadius: "var(--radius-md)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.85rem",
            color: "var(--text-primary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.88rem", fontWeight: 600 }}>
            {statusMessage.includes("successfully") ? (
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#10B981", boxShadow: "0 0 10px #10B981", flexShrink: 0 }} />
            ) : statusMessage.includes("cancelled") || statusMessage.includes("rejected") ? (
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#F59E0B", boxShadow: "0 0 10px #F59E0B", flexShrink: 0 }} />
            ) : (
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "var(--accent-crimson)", boxShadow: "0 0 10px var(--accent-crimson)", flexShrink: 0 }} />
            )}
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "0.2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Dismiss notification"
          >
            <X style={{ width: "16px", height: "16px" }} />
          </button>
        </div>
      )}

      {/* Background Extension Reload Alert Banner */}
      {isExtensionReloadRequired && (
        <div
          id="extension-reload-banner"
          style={{
            background: "linear-gradient(90deg, #DC2626 0%, #B91C1C 100%)",
            color: "#FFFFFF",
            padding: "0.85rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 4px 20px rgba(220, 38, 38, 0.4)",
            position: "sticky",
            top: 0,
            zIndex: 10000,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.92rem", fontWeight: 600 }}>
            <AlertTriangle style={{ width: "20px", height: "20px" }} />
            <span>Chrome updated the BridgeKey extension in the background. Please reload this tab to reconnect.</span>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => window.location.reload()}
            style={{
              background: "#FFFFFF",
              color: "#B91C1C",
              fontWeight: 700,
              padding: "0.45rem 1rem",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.85rem",
            }}
          >
            <RefreshCw style={{ width: "14px", height: "14px" }} />
            <span>Reload Page Now</span>
          </button>
        </div>
      )}

      {/* 2. Public Marketing Views */}
      {currentRoute === "pricing" && (
        <>
          <PricingView
            onSelectPlan={() => {
              navigateToRoute("app");
              setShowFactoryModal(true);
            }}
            onNavigateHome={() => navigateToRoute("home")}
          />
          <PublicFooter onNavigate={navigateToRoute} />
        </>
      )}

      {currentRoute === "docs" && (
        <>
          <DocsView />
          <PublicFooter onNavigate={navigateToRoute} />
        </>
      )}

      {currentRoute === "security" && (
        <>
          <SecurityView />
          <PublicFooter onNavigate={navigateToRoute} />
        </>
      )}

      {currentRoute === "faq" && (
        <>
          <FAQView />
          <PublicFooter onNavigate={navigateToRoute} />
        </>
      )}

      {currentRoute === "contact" && (
        <>
          <ContactView />
          <PublicFooter onNavigate={navigateToRoute} />
        </>
      )}

      {/* 3. Public Home Landing Page */}
      {currentRoute === "home" && (
        <>
          {/* Scroll-Linked 3D Vault Cinematic Experience */}
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

          {/* How It Works Section */}
          <HowItWorksSection />

          {/* Organisation Templates Archetypes Section */}
          <section id="templates" className="container" style={{ padding: "4rem 2rem" }}>
            <div style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto 3rem auto" }}>
              <div className="cv-badge cv-badge-crimson" style={{ margin: "0 auto 0.85rem auto" }}>
                <Building style={{ width: "13px", height: "13px" }} />
                <span>Tailored Governance Archetypes</span>
              </div>
              <h2 style={{ fontSize: "2.4rem", color: "var(--text-primary)", marginBottom: "0.75rem" }}>
                Ready-to-Deploy Organisation Templates
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", lineHeight: 1.6 }}>
                Whether you are managing a college technical club, a residential housing society, or a hackathon prize pool,
                ClubVault provides verified governance presets with customizable multi-signature quorums.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1.5rem",
                marginBottom: "3rem",
              }}
            >
              {TEMPLATES.map((tpl) => {
                const Icon = tpl.icon;
                return (
                  <div
                    key={tpl.id}
                    className="glass-panel"
                    style={{
                      padding: "1.75rem",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                        <div
                          style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "10px",
                            background: "rgba(255, 48, 59, 0.12)",
                            color: "var(--accent-crimson)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon style={{ width: "20px", height: "20px" }} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: "1.15rem", color: "var(--text-primary)" }}>{tpl.title}</h3>
                          <span style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", fontFamily: "var(--font-mono)" }}>
                            Quorum: {tpl.suggestedQuorum} of {tpl.sampleMembers.length}
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1.25rem" }}>
                        {tpl.defaultDesc}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setShowFactoryModal(true);
                      }}
                      className="btn btn-secondary"
                      style={{ width: "100%", justifyContent: "center", fontSize: "0.85rem", padding: "0.65rem" }}
                    >
                      <span>Configure with Template</span>
                      <ArrowRight style={{ width: "14px", height: "14px" }} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* CTA to live workspace */}
            <div
              className="glass-panel"
              style={{
                padding: "2.5rem",
                borderRadius: "var(--radius-md)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1.5rem",
                background: "linear-gradient(135deg, var(--bg-card) 0%, var(--bg-surface-elevated) 100%)",
                border: "1px solid var(--border-crimson)",
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.5rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                  Explore the Live Interactive Treasury
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                  Test voting consensus, advance payouts, and receipt hashing in real time on the MST Testnet.
                </p>
              </div>
              <button
                onClick={() => scrollToSection("treasury")}
                className="btn btn-primary"
                style={{ padding: "0.85rem 1.75rem", fontSize: "0.95rem" }}
              >
                <span>Go to Treasury Dashboard</span>
                <ArrowRight style={{ width: "16px", height: "16px" }} />
              </button>
            </div>
          </section>

          {/* 4. Live Treasury Workspace */}
          <main id="treasury-dashboard" className="container" style={{ paddingTop: "3rem" }}>
        {/* Network & Contract Deployment Status Banner */}
        <div
          style={{
            padding: "0.85rem 1.25rem",
            marginBottom: "1.25rem",
            borderRadius: "var(--radius-sm)",
            backgroundColor: isContractDeployedOnChain ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
            border: `1px solid ${isContractDeployedOnChain ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span
              style={{
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                backgroundColor: isContractDeployedOnChain ? "#10B981" : "#F59E0B",
                display: "inline-block",
                boxShadow: isContractDeployedOnChain ? "0 0 10px #10B981" : "0 0 10px #F59E0B",
              }}
            />
            {isContractDeployedOnChain ? (
              <span style={{ color: "#10B981" }}>
                <strong>
                  {currentChainId === MST_MAINNET_CONFIG.chainId
                    ? "MST Mainnet Production Live Mode:"
                    : "MST Testnet Live Mode:"}
                </strong>{" "}
                Verified smart contract active at{" "}
                <code style={{ fontFamily: "var(--font-mono)" }}>
                  {vaultAddress.slice(0, 10)}...{vaultAddress.slice(-6)}
                </code>
                . Real on-chain state synchronized.
              </span>
            ) : (
              <span style={{ color: "#F59E0B" }}>
                <strong>Interactive Demo Simulation:</strong> Smart contracts are operating in simulation mode.
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "0.2rem 0.6rem",
                borderRadius: "var(--radius-pill)",
                backgroundColor: isContractDeployedOnChain
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(245, 158, 11, 0.15)",
                color: isContractDeployedOnChain ? "#10B981" : "#F59E0B",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
              }}
            >
              {isContractDeployedOnChain
                ? `CHAIN ID: ${currentChainId} (${
                    currentChainId === MST_MAINNET_CONFIG.chainId ? "MAINNET" : "TESTNET"
                  })`
                : "DEMO SIMULATION"}
            </span>
          </div>
        </div>

        {/* Real-time 5-Stage Transaction Lifecycle Tracker */}
        {txStage !== "idle" && (
          <div
            style={{
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(18, 19, 26, 0.95)",
              backdropFilter: "blur(12px)",
              border: `1.5px solid ${txStage === "error" ? "#EF4444" : txStage === "success" ? "#10B981" : "#5840FF"}`,
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
              color: "#FFFFFF",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontWeight: 700, fontSize: "0.95rem" }}>
                {txStage === "error" ? (
                  <AlertTriangle style={{ width: "18px", height: "18px", color: "#EF4444" }} />
                ) : txStage === "success" ? (
                  <CheckCircle2 style={{ width: "18px", height: "18px", color: "#10B981" }} />
                ) : (
                  <RefreshCw style={{ width: "18px", height: "18px", color: "#5840FF", animation: "spin 1.2s linear infinite" }} />
                )}
                <span>MST Blockchain Transaction Lifecycle</span>
              </div>
              {(txStage === "success" || txStage === "error") && (
                <button
                  onClick={() => setTxStage("idle")}
                  style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}
                >
                  ×
                </button>
              )}
            </div>

            {/* Visual 5-Step Process */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "0.5rem",
                marginBottom: "0.75rem",
                fontSize: "0.72rem",
                fontFamily: "var(--font-mono)",
                textAlign: "center",
              }}
            >
              {[
                { num: 1, label: "1. Requested" },
                { num: 2, label: "2. Signed" },
                { num: 3, label: "3. Broadcast" },
                { num: 4, label: "4. Confirmed" },
                { num: 5, label: "5. Refreshed" },
              ].map((step) => {
                const currentNum =
                  txStage === "requesting" ? 1 :
                  txStage === "signing" ? 2 :
                  txStage === "broadcasting" ? 3 :
                  txStage === "confirming" ? 4 :
                  txStage === "success" ? 5 : 0;
                const isDone = currentNum > step.num || txStage === "success";
                const isActive = currentNum === step.num;
                return (
                  <div
                    key={step.num}
                    style={{
                      padding: "0.35rem 0.2rem",
                      borderRadius: "6px",
                      backgroundColor: isDone ? "rgba(16, 185, 129, 0.15)" : isActive ? "rgba(88, 64, 255, 0.2)" : "rgba(255, 255, 255, 0.04)",
                      border: `1px solid ${isDone ? "#10B981" : isActive ? "#5840FF" : "transparent"}`,
                      color: isDone ? "#10B981" : isActive ? "#5840FF" : "#94A3B8",
                      fontWeight: isActive || isDone ? 700 : 500,
                    }}
                  >
                    {isDone ? `✓ ${step.label.slice(3)}` : step.label}
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: "0.85rem", color: "#CBD5E1" }}>
              {txStageMessage}
            </div>

            {activeTxHash && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>
                <a
                  href={`https://testnet.mstscan.com/tx/${activeTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#5840FF", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <span>View on MST Explorer ({activeTxHash.slice(0, 14)}...)</span>
                  <ExternalLink style={{ width: "12px", height: "12px" }} />
                </a>
              </div>
            )}
          </div>
        )}

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
                <span
                  style={{
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    background:
                      vaultAddress.toLowerCase() === CONTRACT_ADDRESSES.GenesisVault?.toLowerCase()
                        ? "rgba(59, 130, 246, 0.15)"
                        : vaultAddress.toLowerCase() === CONTRACT_ADDRESSES.testRelayerVault2of2?.toLowerCase()
                        ? "rgba(245, 158, 11, 0.15)"
                        : "rgba(16, 185, 129, 0.15)",
                    color:
                      vaultAddress.toLowerCase() === CONTRACT_ADDRESSES.GenesisVault?.toLowerCase()
                        ? "var(--accent-primary)"
                        : vaultAddress.toLowerCase() === CONTRACT_ADDRESSES.testRelayerVault2of2?.toLowerCase()
                        ? "#f59e0b"
                        : "var(--accent-emerald)",
                    border:
                      vaultAddress.toLowerCase() === CONTRACT_ADDRESSES.GenesisVault?.toLowerCase()
                        ? "1px solid rgba(59, 130, 246, 0.3)"
                        : vaultAddress.toLowerCase() === CONTRACT_ADDRESSES.testRelayerVault2of2?.toLowerCase()
                        ? "1px solid rgba(245, 158, 11, 0.3)"
                        : "1px solid rgba(16, 185, 129, 0.3)",
                  }}
                >
                  {currentChainId === MST_MAINNET_CONFIG.chainId
                    ? "MST Mainnet Genesis (2-of-2 Multisig)"
                    : vaultAddress.toLowerCase() === CONTRACT_ADDRESSES.GenesisVault?.toLowerCase()
                    ? "V1 Genesis Vault"
                    : vaultAddress.toLowerCase() === CONTRACT_ADDRESSES.testRelayerVault2of2?.toLowerCase()
                    ? "2-of-2 Test Vault (Gasless Verified)"
                    : "ClubVault V2 (Gasless-Enabled)"}
                </span>
                <span>•</span>
                <span>MST Blockchain (Chain ID {currentChainId})</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              {/* Vault Selector Pills */}
              <div style={{ display: "flex", gap: "0.3rem", background: "rgba(255,255,255,0.04)", padding: "0.25rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                {currentChainId === MST_MAINNET_CONFIG.chainId ? (
                  <button
                    id="btn-select-mainnet-vault"
                    onClick={() => {
                      const mainnetVault = "0x9a81aED1b3D2d4c85A0ea8FC6129D17b2fFed339";
                      try { localStorage.setItem("clubvault_last_vault", mainnetVault); } catch {}
                      setVaultAddress(mainnetVault);
                      syncOnChainVault(mainnetVault);
                    }}
                    style={{
                      padding: "0.4rem 0.7rem",
                      fontSize: "0.78rem",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      background: "var(--accent-emerald)",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  >
                    Mainnet Genesis Vault (2-of-2)
                  </button>
                ) : (
                  <>
                    <button
                      id="btn-select-v2-vault"
                      onClick={() => {
                        const testnetV2 = "0x8442bF7dE2d0FF9aF4136a83Cf20BE559b6Fb5C9";
                        try { localStorage.setItem("clubvault_last_vault", testnetV2); } catch {}
                        setVaultAddress(testnetV2);
                        syncOnChainVault(testnetV2);
                      }}
                      style={{
                        padding: "0.4rem 0.7rem",
                        fontSize: "0.78rem",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        background: vaultAddress.toLowerCase() === "0x8442bf7de2d0ff9af4136a83cf20be559b6fb5c9" ? "var(--accent-emerald)" : "transparent",
                        color: vaultAddress.toLowerCase() === "0x8442bf7de2d0ff9af4136a83cf20be559b6fb5c9" ? "#fff" : "var(--text-secondary)",
                        fontWeight: 600,
                      }}
                    >
                      Testnet V2 Genesis
                    </button>
                    <button
                      id="btn-select-2of2-vault"
                      onClick={() => {
                        const test2of2 = "0x90e309A5246B37bBC79224A1449D25CC29ef88bE";
                        try { localStorage.setItem("clubvault_last_vault", test2of2); } catch {}
                        setVaultAddress(test2of2);
                        syncOnChainVault(test2of2);
                      }}
                      style={{
                        padding: "0.4rem 0.7rem",
                        fontSize: "0.78rem",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        background: vaultAddress.toLowerCase() === "0x90e309a5246b37bbc79224a1449d25cc29ef88be" ? "#f59e0b" : "transparent",
                        color: vaultAddress.toLowerCase() === "0x90e309a5246b37bbc79224a1449d25cc29ef88be" ? "#000" : "var(--text-secondary)",
                        fontWeight: 600,
                      }}
                    >
                      2-of-2 Test Vault
                    </button>
                  </>
                )}
              </div>
              <button
                id="btn-refresh-treasury-state"
                onClick={() => syncOnChainVault()}
                className="btn btn-secondary"
                style={{ padding: "0.6rem 1rem", fontSize: "0.85rem" }}
                title="Refresh treasury metrics and proposal states from the contract"
                disabled={isSyncingContract}
              >
                <RefreshCw
                  style={{
                    width: "15px",
                    height: "15px",
                    color: "var(--accent-crimson)",
                    animation: isSyncingContract ? "spin 1s linear infinite" : "none",
                  }}
                />
                <span>{isSyncingContract ? "Syncing..." : "Refresh State"}</span>
              </button>

              <button
                onClick={exportLedgerToCSV}
                className="btn btn-secondary"
                style={{ padding: "0.6rem 1rem", fontSize: "0.85rem" }}
                title="Download CSV audit ledger of all proposals and transactions"
              >
                <Download style={{ width: "15px", height: "15px", color: "var(--accent-emerald)" }} />
                <span>Export CSV</span>
              </button>

              <button
                id="btn-open-deposit-header"
                className="btn btn-primary"
                onClick={() => {
                  setActiveTab("deposit");
                  setTimeout(() => {
                    const el = document.getElementById("deposit-amount-input");
                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                    el?.focus();
                  }, 50);
                }}
                style={{
                  background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  borderColor: "#10B981",
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)",
                }}
              >
                <ArrowDownLeft style={{ width: "16px", height: "16px" }} />
                <span>Deposit Funds</span>
              </button>

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

        {/* Actionable 'Needs Your Attention' Inbox */}
        <ActionInbox
          proposals={proposals}
          account={account}
          onSelectProposal={(id) => {
            const found = proposals.find((p) => p.id === id);
            if (found) {
              setSelectedProposalForDetail(found);
            }
          }}
          onFilterStatus={(st) => {
            setStatusFilter(st);
            setActiveTab("proposals");
          }}
          onGaslessVote={(p) => setGaslessVoteProposal(p)}
          onExecuteProposal={handleExecuteProposal}
          requiredApprovals={requiredApprovals}
        />

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
          <div className="metric-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div className="metric-label">Total Vault Balance</div>
              <div className="metric-value">
                {vaultBalance} <span style={{ fontSize: "1rem", color: "var(--accent-crimson)" }}>{currencySymbol}</span>
              </div>
              <div className="metric-sub">On-chain native balance</div>
            </div>
            <button
              id="metric-btn-deposit"
              onClick={() => {
                setActiveTab("deposit");
                setTimeout(() => {
                  const el = document.getElementById("deposit-amount-input");
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                  el?.focus();
                }, 50);
              }}
              className="btn btn-secondary"
              style={{
                marginTop: "0.6rem",
                padding: "0.3rem 0.65rem",
                fontSize: "0.75rem",
                alignSelf: "flex-start",
                color: "var(--accent-emerald)",
                borderColor: "rgba(16, 185, 129, 0.35)",
                background: "rgba(16, 185, 129, 0.08)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <ArrowDownLeft style={{ width: "12px", height: "12px" }} />
              <span>+ Deposit {currencySymbol}</span>
            </button>
          </div>

          <div className="metric-card">
            <div className="metric-label" style={{ color: "var(--accent-emerald)" }}>Available to Propose</div>
            <div className="metric-value" style={{ color: "var(--accent-emerald)" }}>
              {availableFunds} <span style={{ fontSize: "1rem" }}>{currencySymbol}</span>
            </div>
            <div className="metric-sub">Balance minus reserved</div>
          </div>

          <div className="metric-card">
            <div className="metric-label" style={{ color: "var(--accent-amber)" }}>Reserved (Approved)</div>
            <div className="metric-value" style={{ color: "var(--accent-amber)" }}>
              {reservedFunds} <span style={{ fontSize: "1rem" }}>{currencySymbol}</span>
            </div>
            <div className="metric-sub">Locked for approved disbursements</div>
          </div>

          <div className="metric-card">
            <div className="metric-label" style={{ color: "#FF8088" }}>Advances Paid Out</div>
            <div className="metric-value" style={{ color: "#FF8088" }}>
              {unconfirmedAdvances} <span style={{ fontSize: "1rem" }}>{currencySymbol}</span>
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
            Transactions ({displayedTransactions.length})
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
                      id={`proposal-card-${p.id}`}
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
                      {p.status === ProposalStatus.APPROVED && p.proposalType !== ProposalType.ADVANCE_PAYMENT && (
                        <div style={{ margin: "0.75rem 0", padding: "0.6rem 0.85rem", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "var(--radius-sm)", fontSize: "0.78rem", fontFamily: "var(--font-mono)", color: "var(--accent-emerald)" }}>
                          Quorum Reached — This proposal is approved and ready for execution.
                        </div>
                      )}
                      {p.status === ProposalStatus.EXECUTED && (
                        <div style={{ margin: "0.75rem 0", padding: "0.6rem 0.85rem", background: "rgba(255, 255, 255, 0.04)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", fontSize: "0.78rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                          This proposal has already been executed.
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
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                              <button
                                id={`vote-yes-${p.id}`}
                                className="btn btn-success"
                                disabled={txStage !== "idle" || coSigningProposalId === p.id}
                                onClick={() => handleVoteProposal(p.id, true)}
                                title="Approve Proposal"
                                style={{ minWidth: "95px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                              >
                                {votingProposalId === p.id && (txStage === "requesting" || txStage === "signing") ? (
                                  <>
                                    <RefreshCw style={{ width: "13px", height: "13px", animation: "spin 1.2s linear infinite" }} />
                                    <span>Confirming...</span>
                                  </>
                                ) : (
                                  "Approve"
                                )}
                              </button>
                              <button
                                id={`vote-no-${p.id}`}
                                className="btn btn-danger"
                                disabled={txStage !== "idle" || coSigningProposalId === p.id}
                                onClick={() => handleVoteProposal(p.id, false)}
                                title="Reject Proposal"
                                style={{ minWidth: "90px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                              >
                                {votingProposalId === p.id && (txStage === "requesting" || txStage === "signing") ? (
                                  <>
                                    <RefreshCw style={{ width: "13px", height: "13px", animation: "spin 1.2s linear infinite" }} />
                                    <span>Confirming...</span>
                                  </>
                                ) : (
                                  "Reject"
                                )}
                              </button>
                              <button
                                id={`vote-gasless-${p.id}`}
                                className="btn btn-secondary"
                                style={{
                                  border: "1px solid var(--accent-emerald)",
                                  color: "var(--accent-emerald)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                  padding: "0.45rem 0.75rem",
                                  fontSize: "0.8rem",
                                  fontWeight: "600",
                                }}
                                onClick={() => setGaslessVoteProposal(p)}
                                title="Gas-Sponsored Vote via EIP-712 Relayer (0 Gas for Voter)"
                              >
                                <Fuel style={{ width: "13px", height: "13px" }} />
                                <span>Gasless Vote</span>
                              </button>

                              {p.approvalsCount < (requiredApprovals || 2) && (
                                <button
                                  id={`cosign-btn-${p.id}`}
                                  className="btn btn-secondary"
                                  disabled={coSigningProposalId === p.id || txStage !== "idle"}
                                  onClick={() => handleCoSignVote(p.id, true)}
                                  style={{
                                    border: "1px solid var(--accent-amber)",
                                    color: "var(--accent-amber)",
                                    background: "rgba(245, 158, 11, 0.14)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    padding: "0.45rem 0.75rem",
                                    fontSize: "0.8rem",
                                    fontWeight: "600",
                                  }}
                                  title="1-Click Co-Sign as Member 2 (0x06e0...bbbD) so single-user demo can reach quorum immediately"
                                >
                                  {coSigningProposalId === p.id ? (
                                    <>
                                      <RefreshCw style={{ width: "13px", height: "13px", animation: "spin 1.2s linear infinite" }} />
                                      <span>Co-Signing...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Zap style={{ width: "13px", height: "13px" }} />
                                      <span>⚡ Co-Sign as Member 2</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}

                          {p.status === ProposalStatus.APPROVED && (
                            <>
                              <button
                                id={`execute-btn-${p.id}`}
                                className="btn btn-primary"
                                disabled={txStage !== "idle"}
                                onClick={() => handleExecuteProposal(p.id)}
                                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                              >
                                {txStage === "requesting" || txStage === "signing" ? (
                                  <>
                                    <RefreshCw style={{ width: "14px", height: "14px", animation: "spin 1.2s linear infinite" }} />
                                    <span>Confirming in Wallet...</span>
                                  </>
                                ) : (
                                  p.proposalType === ProposalType.ADVANCE_PAYMENT
                                    ? `Release Advance (${p.amount} tMSTC)`
                                    : `Execute Disbursement (${p.amount} tMSTC)`
                                )}
                              </button>
                              {p.executionDeadline && Date.now() / 1000 > p.executionDeadline && (
                                <button
                                  id={`expire-btn-${p.id}`}
                                  className="btn btn-danger"
                                  onClick={() => handleExpireProposal(p.id)}
                                  title="Release reserved funds back to treasury"
                                >
                                  Expire & Release Funds
                                </button>
                              )}
                            </>
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
                            p.txHash.startsWith("0x") ? (
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
                            ) : (
                              <span
                                className="address-tag"
                                style={{ opacity: 0.85, cursor: "default" }}
                                title="Transaction recorded in local demo simulation mode"
                              >
                                <span>Simulated</span>
                              </span>
                            )
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
          <div className="glass-panel" style={{ padding: "2.25rem", maxWidth: "620px", margin: "0 auto" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
              Deposit Funds to Club Treasury
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.25rem", lineHeight: 1.6 }}>
              Anyone can contribute native tokens ({currencySymbol}) to the vault. Contributed funds immediately increase
              Available Funds and can be proposed for grants and projects.
            </p>

            {/* Quick preset amount buttons */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Quick Preset Amounts:
                </span>
                {account && (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Wallet Balance: <strong style={{ color: "var(--accent-emerald)" }}>{accountBalance} {currencySymbol}</strong>
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                {["0.1", "0.5", "1.0", "2.0"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setFormDepositAmount(preset);
                      setDepositInputError(null);
                    }}
                    className="btn btn-secondary"
                    style={{
                      padding: "0.3rem 0.65rem",
                      fontSize: "0.78rem",
                      borderColor: formDepositAmount === preset ? "var(--accent-emerald)" : "var(--border-subtle)",
                      color: formDepositAmount === preset ? "#FFFFFF" : "var(--text-secondary)",
                      background: formDepositAmount === preset ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.03)",
                    }}
                  >
                    {preset} {currencySymbol}
                  </button>
                ))}
                {account && parseFloat(accountBalance || "0") > 0.02 && (
                  <button
                    type="button"
                    onClick={() => {
                      const safeMax = Math.max(0, parseFloat(accountBalance) - 0.01).toFixed(3);
                      setFormDepositAmount(safeMax);
                      setDepositInputError(null);
                    }}
                    className="btn btn-secondary"
                    style={{
                      padding: "0.3rem 0.65rem",
                      fontSize: "0.78rem",
                      borderColor: "rgba(16, 185, 129, 0.4)",
                      color: "var(--accent-emerald)",
                      background: "rgba(16, 185, 129, 0.1)",
                      fontWeight: 600,
                    }}
                    title="Deposit max balance while keeping 0.01 reserve for gas"
                  >
                    Max Safe ({(parseFloat(accountBalance) - 0.01).toFixed(3)} {currencySymbol})
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleDeposit}>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <label className="form-label" style={{ margin: 0 }}>Deposit Amount ({currencySymbol})</label>
                  {formDepositAmount && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormDepositAmount("");
                        setDepositInputError(null);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        padding: 0,
                        textDecoration: "underline",
                      }}
                    >
                      Clear Amount
                    </button>
                  )}
                </div>
                <input
                  id="deposit-amount-input"
                  type="text"
                  inputMode="decimal"
                  className="form-control"
                  placeholder="e.g. 0.1 or 1.0"
                  value={formDepositAmount}
                  onChange={(e) => {
                    setFormDepositAmount(e.target.value);
                    if (depositInputError) setDepositInputError(null);
                  }}
                  style={{
                    borderColor: depositInputError ? "var(--accent-crimson)" : undefined,
                  }}
                  required
                />
                {depositInputError && (
                  <div style={{ color: "var(--accent-crimson)", fontSize: "0.78rem", marginTop: "0.35rem" }}>
                    {depositInputError}
                  </div>
                )}
              </div>

              {/* Pre-Submission Summary Card */}
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border-subtle)",
                  marginBottom: "1.25rem",
                  fontSize: "0.82rem",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem", fontSize: "0.85rem" }}>
                  Pre-Submission Summary
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Exact Amount:</span>
                  <span style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>
                    {formDepositAmount.trim() ? `${formDepositAmount.trim()} ${currencySymbol}` : `0.0 ${currencySymbol}`}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Target Chain ID:</span>
                  <span style={{ color: "var(--text-secondary)" }}>{currentChainId} ({currentChainId === 4646 ? "MST Mainnet" : "MST Testnet"})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "0.3rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text-muted)" }}>Destination Vault Contract:</span>
                    {isContractDeployedOnChain ? (
                      <span style={{ fontSize: "0.72rem", color: "var(--accent-emerald)", fontWeight: 600 }}>
                        ✓ Verified On-Chain
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.72rem", color: "var(--accent-crimson)", fontWeight: 600 }}>
                        ⚠ Not Deployed on {currentChainId === 4646 ? "Mainnet" : "Testnet"}
                      </span>
                    )}
                  </div>
                  <a
                    href={(currentChainId === 4646 ? "https://mstscan.com" : "https://testnet.mstscan.com") + `/address/${vaultAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#38bdf8", wordBreak: "break-all", fontSize: "0.75rem", textDecoration: "underline" }}
                    title="View destination contract on MSTScan"
                  >
                    {vaultAddress} ↗
                  </a>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Contract Method:</span>
                  <span style={{ color: "var(--text-secondary)" }}>deposit() (0xd0e30db0)</span>
                </div>
                <div
                  style={{
                    padding: "0.5rem",
                    borderRadius: "4px",
                    background: isContractDeployedOnChain ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
                    border: isContractDeployedOnChain ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(245, 158, 11, 0.25)",
                    color: isContractDeployedOnChain ? "var(--accent-emerald)" : "#F59E0B",
                    fontSize: "0.72rem",
                    lineHeight: 1.4,
                  }}
                >
                  <strong>Active Network:</strong> {currentChainId === 4646 ? "MST Mainnet (4646)" : "MST Testnet (91562037)"}. Contributed {currencySymbol} is immediately credited to Available Funds on-chain upon block confirmation.
                </div>
              </div>

              <button
                id="submit-deposit-btn"
                type="submit"
                className="btn btn-primary"
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  borderColor: "#10B981",
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)",
                }}
              >
                {formDepositAmount.trim() && validateDepositInput(formDepositAmount).isValid
                  ? `Deposit ${formDepositAmount.trim()} tMSTC to Treasury`
                  : "Deposit to Treasury"}
              </button>
            </form>
          </div>
        )}

        {/* Tab 5: Transactions History */}
        {activeTab === "transactions" && (
          <div id="transactions" className="glass-panel" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem", color: "var(--text-primary)" }}>
                  {isContractDeployedOnChain ? "On-Chain Transaction History" : "Simulated Transaction History"}
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  {isContractDeployedOnChain
                    ? "Verifiable ledger recordings on MST Blockchain testnet (Chain ID 91562037)"
                    : "Simulated execution records for local demo mode"}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <button
                  onClick={exportLedgerToCSV}
                  className="btn btn-secondary"
                  style={{ padding: "0.45rem 0.85rem", fontSize: "0.78rem" }}
                  title={
                    isContractDeployedOnChain
                      ? "Export verifiable on-chain ledger records to CSV"
                      : "Export simulated demo ledger records to CSV"
                  }
                >
                  <Download style={{ width: "13px", height: "13px", color: "var(--accent-emerald)" }} />
                  <span>Download Ledger CSV</span>
                </button>
                <span className="cv-badge cv-badge-neutral">
                  {displayedTransactions.length} Records
                </span>
              </div>
            </div>

            {/* RPC sync warning if event query failed */}
            {isContractDeployedOnChain && transactionsSyncError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  marginBottom: "1rem",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#EF4444",
                  fontSize: "0.82rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <AlertTriangle style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                  <span>
                    Unable to query on-chain transaction logs via RPC ({transactionsSyncError}). Recorded session transactions are preserved.
                  </span>
                </div>
                <button
                  onClick={() => syncOnChainVault()}
                  className="btn btn-secondary"
                  style={{ padding: "0.25rem 0.65rem", fontSize: "0.72rem" }}
                >
                  Retry Sync
                </button>
              </div>
            )}

            {/* Syncing indicator */}
            {isSyncingTransactions && (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                <RefreshCw style={{ width: "20px", height: "20px", margin: "0 auto 0.5rem", animation: "spin 1s linear infinite", color: "var(--accent-crimson)" }} />
                <div>Verifying on-chain ledger records on MST Blockchain...</div>
              </div>
            )}

            {/* Empty state when 0 transactions */}
            {!isSyncingTransactions && displayedTransactions.length === 0 ? (
              <div
                style={{
                  padding: "3.5rem 1.5rem",
                  textAlign: "center",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface-elevated)",
                  border: "1px dashed var(--border-subtle)",
                }}
              >
                <Clock style={{ width: "32px", height: "32px", margin: "0 auto 0.75rem", opacity: 0.6, color: "var(--accent-crimson)" }} />
                <h4 style={{ fontSize: "1.05rem", color: "var(--text-primary)", fontWeight: 600, marginBottom: "0.35rem" }}>
                  {isContractDeployedOnChain ? "No On-Chain Transactions Recorded Yet" : "No Simulated Transactions"}
                </h4>
                <p style={{ fontSize: "0.84rem", maxWidth: "480px", margin: "0 auto", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  {isContractDeployedOnChain
                    ? "This ClubVault treasury currently has 0 recorded deposits or disbursements on MST Testnet (Chain ID 91562037). Live deposits and executed disbursements will appear here automatically with verified block explorer links."
                    : "No transactions recorded in offline demo simulation mode yet."}
                </p>
              </div>
            ) : (
              !isSyncingTransactions && (
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
                      {displayedTransactions.map((tx) => (
                        <tr key={tx.id}>
                          <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                            {tx.type.replace(/_/g, " ")}
                          </td>
                          <td style={{ color: "var(--accent-crimson)", fontWeight: 700 }}>
                            {tx.amount}
                          </td>
                          <td style={{ color: "var(--text-secondary)" }}>
                            {tx.fromOrTo ? `${tx.fromOrTo.slice(0, 6)}...${tx.fromOrTo.slice(-4)}` : "—"}
                          </td>
                          <td>
                            {tx.txHash && tx.txHash.startsWith("0x") && !tx.txHash.startsWith("DEMO-") ? (
                              <a
                                href={`https://testnet.mstscan.com/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="address-tag"
                                title="View on MST Scan"
                              >
                                <span>{tx.txHash.slice(0, 8)}...</span>
                                <ExternalLink style={{ width: "12px", height: "12px" }} />
                              </a>
                            ) : (
                              <span
                                className="address-tag"
                                style={{ opacity: 0.85, cursor: "default" }}
                                title="Transaction recorded in local demo simulation mode"
                              >
                                <span>Simulated</span>
                              </span>
                            )}
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
              )
            )}
          </div>
        )}
          </main>
          <PublicFooter onNavigate={navigateToRoute} />
        </>
      )}

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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Amount ({currencySymbol})
                  </label>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: parseFloat(availableFunds || "0") > 0 ? "var(--accent-emerald)" : "var(--accent-crimson)",
                    }}
                  >
                    Treasury Available: {availableFunds} {currencySymbol}
                  </span>
                </div>
                <input
                  id="prop-amount-input"
                  type="number"
                  step="any"
                  min="0.0001"
                  className="form-control"
                  placeholder={
                    parseFloat(availableFunds || "0") > 0
                      ? `e.g. 0.01 (Available: ${availableFunds} ${currencySymbol})`
                      : "Vault is empty — deposit funds first"
                  }
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                />
                {Boolean(formAmount) && parseFloat(formAmount) > parseFloat(availableFunds || "0") && (
                  <div style={{ color: "var(--accent-crimson)", fontSize: "0.78rem", marginTop: "4px", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <AlertTriangle style={{ width: "13px", height: "13px" }} />
                    <span>Requested amount exceeds vault available funds ({availableFunds} {currencySymbol})</span>
                  </div>
                )}
                {parseFloat(availableFunds || "0") <= 0 && (
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "6px",
                      background: "rgba(245, 158, 11, 0.12)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      color: "var(--accent-amber)",
                      fontSize: "0.78rem",
                      lineHeight: "1.35",
                    }}
                  >
                    ⚠️ <strong>Vault treasury currently has 0 available funds.</strong> ClubVault proposals disburse funds from this treasury. Please deposit funds using the "Deposit & Fund" tab or switch to a funded vault.
                  </div>
                )}
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
                <button
                  id="submit-proposal-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    parseFloat(availableFunds || "0") <= 0 ||
                    (Boolean(formAmount) && parseFloat(formAmount) > parseFloat(availableFunds || "0"))
                  }
                >
                  {parseFloat(availableFunds || "0") <= 0 ? "Cannot Submit (Vault Empty)" : "Submit Proposal"}
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
          onGaslessVote={(p) => setGaslessVoteProposal(p)}
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

      {/* Modal: Pre-Flight Execution Confirmation */}
      {executionConfirmProposal && (
        <ExecutionConfirmationModal
          isOpen={!!executionConfirmProposal}
          onClose={() => setExecutionConfirmProposal(null)}
          onConfirm={() => proceedExecuteProposal(executionConfirmProposal)}
          proposal={executionConfirmProposal}
          vaultAddress={vaultAddress}
        />
      )}

      {/* Modal: Factory Deploy New Vault with 6 Organization Templates */}
      <TemplateSelectorModal
        isOpen={showFactoryModal}
        onClose={() => setShowFactoryModal(false)}
        onDeploy={handleDeployWithTemplate}
        isDeploying={isDeployingVault}
      />

      {/* Modal: BridgeKey Web3 Cryptographic Key Vault */}
      <BridgeKeyModal
        isOpen={showBridgeKeyModal}
        onClose={() => setShowBridgeKeyModal(false)}
        onConnect={handleBridgeKeyConnect}
        onDisconnect={handleBridgeKeyDisconnect}
        currentAccount={account}
        currentBalance={accountBalance}
        isCorrectNetwork={isCorrectNetwork}
        onSwitchNetwork={switchNetwork}
      />

      {/* Modal: Production MST Mainnet Deployment (Chain ID 4646) */}
      <MainnetDeploymentModal
        isOpen={showMainnetModal}
        onClose={() => setShowMainnetModal(false)}
        account={account}
        accountBalance={accountBalance}
        isCorrectNetwork={currentChainId === MST_MAINNET_CONFIG.chainId}
        onSwitchToMainnet={switchToMainnet}
        onConnectWallet={connectWallet}
        onDeploymentComplete={(_record) => {
          setStatusMessage("✔ Production Mainnet Deployment Completed & Recorded!");
        }}
      />

      {/* Modal: Gas-Sponsored EIP-712 Relayed Vote */}
      {gaslessVoteProposal && (
        <GaslessVoteModal
          isOpen={!!gaslessVoteProposal}
          onClose={() => setGaslessVoteProposal(null)}
          proposal={gaslessVoteProposal}
          vaultAddress={vaultAddress}
          account={account || ""}
          isMember={!!account && members.some((m) => m.toLowerCase() === account.toLowerCase())}
          relayerUrl={CONTRACT_ADDRESSES.relayerUrl}
          onSuccessVote={async () => {
            if (isContractDeployedOnChain) {
              await syncOnChainVault();
            }
          }}
          onFallbackDirectVote={(id, approve) => {
            setGaslessVoteProposal(null);
            handleVoteProposal(id, approve);
          }}
        />
      )}

      {/* Floating Viewport Transaction Tracker for 100% Visibility */}
      {txStage !== "idle" && (
        <div
          id="floating-tx-tracker"
          style={{
            position: "fixed",
            bottom: "28px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 999999,
            maxWidth: "620px",
            width: "calc(100% - 32px)",
            padding: "1.1rem 1.4rem",
            borderRadius: "14px",
            backgroundColor: "rgba(18, 19, 26, 0.98)",
            backdropFilter: "blur(20px)",
            border: `2px solid ${
              txStage === "error"
                ? "#EF4444"
                : txStage === "success"
                ? "#10B981"
                : "#F59E0B"
            }`,
            boxShadow: "0 16px 48px rgba(0, 0, 0, 0.8), 0 0 28px rgba(245, 158, 11, 0.3)",
            color: "#FFFFFF",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontWeight: 700, fontSize: "0.95rem" }}>
              {txStage === "error" ? (
                <AlertTriangle style={{ width: "20px", height: "20px", color: "#EF4444" }} />
              ) : txStage === "success" ? (
                <CheckCircle2 style={{ width: "20px", height: "20px", color: "#10B981" }} />
              ) : (
                <RefreshCw style={{ width: "20px", height: "20px", color: "#F59E0B", animation: "spin 1.2s linear infinite" }} />
              )}
              <span>
                {txStage === "requesting" || txStage === "signing"
                  ? "Action Required: Confirm in BridgeKey"
                  : txStage === "broadcasting" || txStage === "confirming"
                  ? "Broadcasting to MST Blockchain..."
                  : txStage === "success"
                  ? "Transaction Confirmed on-Chain!"
                  : "Transaction Stopped"}
              </span>
            </div>
            {(txStage === "success" || txStage === "error") && (
              <button
                onClick={() => {
                  setTxStage("idle");
                  setVotingProposalId(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  fontSize: "1.4rem",
                  lineHeight: 1,
                  padding: "0 4px",
                }}
              >
                ×
              </button>
            )}
          </div>
          <div style={{ fontSize: "0.85rem", color: "#E2E8F0", lineHeight: 1.4, marginBottom: "0.45rem" }}>
            {txStageMessage}
          </div>
          {txStage === "error" && (isExtensionReloadRequired || txStageMessage.toLowerCase().includes("reload") || txStageMessage.toLowerCase().includes("updated") || txStageMessage.toLowerCase().includes("bridgekey")) && (
            <div
              style={{
                marginTop: "0.6rem",
                padding: "0.75rem 0.9rem",
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.5)",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <div style={{ fontSize: "0.85rem", color: "#FCA5A5", fontWeight: 600 }}>
                Chrome updated the BridgeKey extension in the background. Simply reload this tab so Chrome can re-attach the extension:
              </div>
              <button
                id="reload-tab-btn"
                className="btn btn-primary"
                onClick={() => window.location.reload()}
                style={{
                  alignSelf: "flex-start",
                  padding: "0.5rem 1.1rem",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  background: "#EF4444",
                  borderColor: "#DC2626",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  boxShadow: "0 0 16px rgba(239, 68, 68, 0.4)",
                  cursor: "pointer",
                }}
              >
                <RefreshCw style={{ width: "14px", height: "14px" }} />
                <span>Reload Page Now & Reconnect</span>
              </button>
            </div>
          )}
          {(txStage === "requesting" || txStage === "signing") && (
            <div
              style={{
                fontSize: "0.82rem",
                color: "#FBBF24",
                backgroundColor: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                padding: "0.5rem 0.75rem",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>👉</span>
              <span>
                <strong>Look at your Chrome toolbar:</strong> Click the BridgeKey icon with the blue <strong>[1]</strong> badge and click <strong>"Confirm"</strong> to submit!
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
