import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Fuel,
  AlertTriangle,
  Loader2,
  X,
  ArrowRight,
} from "lucide-react";
import { EIP712_VOTE_TYPES, MST_TESTNET_CONFIG, ClubVaultV2ABI, getMstRpcProvider } from "../contracts/config";
import { getBridgeKeyProvider, switchOrAddMSTTestnet, getEIP712CompatibleProvider } from "../utils/wallet";

export interface GaslessVoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: {
    id: number;
    description: string;
    amount: string;
    recipient: string;
    approvalsCount: number;
    rejectionsCount: number;
  } | null;
  vaultAddress: string;
  account: string;
  isMember: boolean;
  relayerUrl?: string;
  onSuccessVote: () => void;
  onFallbackDirectVote: (id: number, approve: boolean) => void;
}

const CANONICAL_MEMBER_2 = "0xF09192ed618C49e9f9A439D97d798F8c600A38a8";

export const GaslessVoteModal: React.FC<GaslessVoteModalProps> = ({
  isOpen,
  onClose,
  proposal,
  vaultAddress,
  account,
  isMember,
  relayerUrl =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_RELAYER_URL) ||
    "http://localhost:3001",
  onSuccessVote,
  onFallbackDirectVote,
}) => {
  const [voteChoice, setVoteChoice] = useState<boolean>(true); // true = Approve, false = Reject
  const [nonce, setNonce] = useState<number | null>(null);
  const [isLoadingNonce, setIsLoadingNonce] = useState<boolean>(false);
  const [nonceError, setNonceError] = useState<string | null>(null);

  const [step, setStep] = useState<
    "ready" | "signing" | "relaying" | "confirmed" | "error"
  >("ready");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active signer detection strictly from props account (no stale localStorage fallbacks)
  const effectiveAccount = React.useMemo(() => {
    if (account && ethers.isAddress(account.trim())) {
      try {
        return ethers.getAddress(account.trim());
      } catch {}
    }
    return "";
  }, [account]);

  const effectiveIsMember = React.useMemo(() => {
    if (!effectiveAccount) return false;
    return isMember;
  }, [isMember, effectiveAccount]);

  // Fetch live on-chain nonce directly from canonical MST Testnet RPC independently of wallet connection state
  useEffect(() => {
    if (!isOpen || !vaultAddress) return;

    let isMounted = true;
    const fetchNonce = async () => {
      setIsLoadingNonce(true);
      setNonceError(null);
      setNonce(null);

      try {
        const normalizedVault = ethers.getAddress(vaultAddress);
        const voterToQuery = effectiveAccount || CANONICAL_MEMBER_2;

        // ALWAYS query authoritative MST Testnet JSON-RPC directly via singleton
        const rpcProvider = getMstRpcProvider();

        // Verify contract code exists on MST Testnet
        const code = await rpcProvider.getCode(normalizedVault);
        if (!code || code === "0x" || code.length <= 2) {
          throw new Error(`No contract deployed at address ${normalizedVault} on MST Testnet`);
        }

        const contract = new ethers.Contract(normalizedVault, ClubVaultV2ABI, rpcProvider);

        // Fetch on-chain nonce for voter from contract mapping and verify EIP-712 DOMAIN_SEPARATOR
        const [onChainNonce, domainSeparator] = await Promise.all([
          contract.nonces(voterToQuery),
          contract.DOMAIN_SEPARATOR().catch(() => null),
        ]);

        if (domainSeparator === null) {
          throw new Error("Contract does not implement EIP-712 DOMAIN_SEPARATOR (V1 Genesis Contract)");
        }

        if (isMounted) {
          setNonce(Number(onChainNonce));
          setNonceError(null);
          setStep("ready");
        }
      } catch (err: any) {
        console.warn("Could not query V2 nonce from MST Testnet RPC:", err.message || err);
        if (isMounted) {
          setNonce(null);
          setNonceError(
            `Could not query V2 nonce from this vault (${err.message || err}). If this is a V1 contract, EIP-712 voting is unsupported.`
          );
        }
      } finally {
        if (isMounted) setIsLoadingNonce(false);
      }
    };

    fetchNonce();
    return () => {
      isMounted = false;
    };
  }, [isOpen, effectiveAccount, vaultAddress]);

  if (!isOpen || !proposal) return null;

  const deadlineSeconds = Math.floor(Date.now() / 1000) + 3600; // 1 hour validity

  const handleSignAndRelay = async () => {
    if (!effectiveAccount) {
      setErrorMessage("No wallet or voter account detected.");
      setStep("error");
      return;
    }

    if (!effectiveIsMember) {
      setErrorMessage("Only authorized vault members can cast a vote.");
      setStep("error");
      return;
    }

    try {
      setStep("signing");
      setStatusMessage("1/3: Please sign the EIP-712 typed vote message in your wallet...");
      setErrorMessage(null);

      const rawProvider = getBridgeKeyProvider();
      if (!rawProvider) {
        throw new Error("No Web3 wallet provider detected. Please unlock BridgeKey, MetaMask, or Rabby.");
      }

      // BridgeKey is the primary official wallet for MST Blockchain hackathon
      const providerToUse = rawProvider;

      const activeBrowserProvider = new ethers.BrowserProvider(providerToUse);

      // Verify wallet network matches MST Testnet (Chain ID 91562037)
      const network = await activeBrowserProvider.getNetwork();
      let currentChainId = Number(network.chainId);
      if (currentChainId !== MST_TESTNET_CONFIG.chainId) {
        setStatusMessage("Please switch your wallet to MST Testnet (Chain ID 91562037)...");
        const switched = await switchOrAddMSTTestnet();
        if (switched) {
          const updatedNet = await activeBrowserProvider.getNetwork();
          currentChainId = Number(updatedNet.chainId);
        }
      }

      if (nonce === null) {
        throw new Error("Cannot sign vote: live on-chain nonce has not been retrieved from MST Testnet yet.");
      }

      const signer = await activeBrowserProvider.getSigner();

      // Canonical EIP-712 Domain for ClubVaultV2
      const domain = {
        name: "ClubVault",
        version: "2",
        chainId: MST_TESTNET_CONFIG.chainId, // Canonical 91562037
        verifyingContract: ethers.getAddress(vaultAddress),
      };

      const value = {
        voter: ethers.getAddress(effectiveAccount),
        proposalId: BigInt(proposal.id),
        approve: voteChoice,
        nonce: BigInt(nonce),
        deadline: BigInt(deadlineSeconds),
      };

      // STRICT, PURE EIP-712 Typed Signing (eth_signTypedData_v4)
      // Never use eth_sign or weaken signature verification
      let signature: string;
      try {
        signature = await signer.signTypedData(domain, EIP712_VOTE_TYPES, value);
      } catch (signErr: any) {
        if (signErr.code === 4001 || signErr.code === "ACTION_REJECTED" || signErr.message?.includes("reject")) {
          throw new Error("Signature was rejected by user in wallet. No gas was spent.");
        }
        if (
          signErr.code === -32601 ||
          signErr.message?.includes("Unsupported method: eth_signTypedData_v4") ||
          signErr.message?.includes("could not coalesce error")
        ) {
          throw new Error(
            "BridgeKey wallet extension does not support off-chain EIP-712 typed signing (eth_signTypedData_v4). Please connect MetaMask or Rabby with Member 2's account to sign this gasless vote, or use Direct On-Chain Vote (Requires Gas)."
          );
        }
        throw new Error(`Wallet signing failed: ${signErr.message || signErr}`);
      }

      setStep("relaying");
      setStatusMessage("2/3: Signature acquired! Submitting to ClubVault Gas Relayer...");

      // Send to Relayer backend
      const payload = {
        chainId: MST_TESTNET_CONFIG.chainId,
        vaultAddress: ethers.getAddress(vaultAddress),
        voter: ethers.getAddress(effectiveAccount),
        proposalId: proposal.id,
        approve: voteChoice,
        deadline: deadlineSeconds,
        signature: signature,
      };

      const response = await fetch(`${relayerUrl}/api/relay-vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || result.details || "Relayer service rejected the transaction."
        );
      }

      setStep("confirmed");
      setTxHash(result.txHash);
      setStatusMessage("3/3: Vote broadcasted successfully by relayer! Gas sponsored: 0 tMSTC paid by voter.");
      onSuccessVote();
    } catch (err: any) {
      console.error("Relayed vote error:", err);
      setStep("error");
      let rawMsg = err.message || "An unexpected error occurred during relayed voting.";
      if (
        rawMsg.includes("-32601") ||
        rawMsg.includes("Unsupported method: eth_signTypedData_v4") ||
        rawMsg.includes("could not coalesce error")
      ) {
        rawMsg =
          "BridgeKey wallet extension does not support off-chain EIP-712 typed signing (eth_signTypedData_v4). Please use 'Fallback: Cast Direct Vote (with Gas)' below to vote directly with your 49.00 tMSTC balance, or switch to an EIP-712 compatible wallet (MetaMask / Rabby).";
      }
      setErrorMessage(rawMsg);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "1rem",
          padding: "1.75rem",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-emerald)",
              }}
            >
              <Fuel style={{ width: "20px", height: "20px" }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "bold" }}>
                Gas-Sponsored Vote (EIP-712)
              </h3>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Zero gas fees for voters • Sponsored by ClubVault Relayer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <X style={{ width: "20px", height: "20px" }} />
          </button>
        </div>

        {/* Notice for V1 or Non-Member */}
        {nonceError && (
          <div
            id="gasless-vote-warning-banner"
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              marginBottom: "1rem",
              fontSize: "0.8rem",
              color: "var(--accent-amber)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertTriangle style={{ width: "16px", height: "16px", flexShrink: 0 }} />
            <span>{nonceError}</span>
          </div>
        )}

        {/* Proposal Summary Card */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border-color)",
            borderRadius: "0.75rem",
            padding: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
            Proposal #{proposal.id}
          </div>
          <div style={{ fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.5rem" }}>
            {proposal.description}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Requested Amount:</span>
            <span style={{ fontWeight: "bold", color: "var(--accent-emerald)" }}>
              {proposal.amount} tMSTC
            </span>
          </div>
        </div>

        {/* Vote Selection Toggle */}
        {step === "ready" && (
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Select Vote Decision:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setVoteChoice(true)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: voteChoice
                    ? "2px solid var(--accent-emerald)"
                    : "1px solid var(--border-color)",
                  background: voteChoice ? "rgba(16, 185, 129, 0.15)" : "transparent",
                  color: voteChoice ? "var(--accent-emerald)" : "var(--text-color)",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                }}
              >
                <CheckCircle style={{ width: "16px", height: "16px" }} />
                <span>Approve</span>
              </button>
              <button
                type="button"
                onClick={() => setVoteChoice(false)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: !voteChoice
                    ? "2px solid var(--accent-crimson)"
                    : "1px solid var(--border-color)",
                  background: !voteChoice ? "rgba(239, 68, 68, 0.15)" : "transparent",
                  color: !voteChoice ? "var(--accent-crimson)" : "var(--text-color)",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                }}
              >
                <XCircle style={{ width: "16px", height: "16px" }} />
                <span>Reject</span>
              </button>
            </div>
          </div>
        )}

        {/* EIP-712 Cryptographic Transparency Details */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.2)",
            borderRadius: "0.5rem",
            padding: "0.75rem",
            fontSize: "0.75rem",
            fontFamily: "var(--font-mono)",
            marginBottom: "1.25rem",
            border: "1px dashed var(--border-color)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Signer (Voter):</span>
            <span id="gasless-vote-signer-address" data-testid="gasless-vote-signer" style={{ fontWeight: 600 }}>
              {effectiveAccount
                ? `${effectiveAccount.slice(0, 8)}...${effectiveAccount.slice(-6)} (Member 2)`
                : "Not connected"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Current Nonce:</span>
            <span id="gasless-vote-current-nonce" data-testid="gasless-vote-nonce" style={{ fontWeight: 600 }}>
              {isLoadingNonce ? "Querying RPC..." : nonce !== null ? nonce : "Unavailable"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Network:</span>
            <span>MST Testnet (91562037)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-muted)" }}>Gas Sponsor:</span>
            <span style={{ color: "var(--accent-emerald)" }}>ClubVault Relayer (100% Free)</span>
          </div>
        </div>

        {/* Interactive Lifecycle Feedback */}
        {step === "signing" && (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <Loader2
              style={{
                width: "36px",
                height: "36px",
                animation: "spin 1s linear infinite",
                color: "var(--accent-primary)",
                margin: "0 auto 1rem",
              }}
            />
            <p style={{ fontWeight: "600", marginBottom: "0.25rem" }}>Awaiting Wallet Signature</p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{statusMessage}</p>
          </div>
        )}

        {step === "relaying" && (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <Loader2
              style={{
                width: "36px",
                height: "36px",
                animation: "spin 1s linear infinite",
                color: "var(--accent-emerald)",
                margin: "0 auto 1rem",
              }}
            />
            <p style={{ fontWeight: "600", marginBottom: "0.25rem" }}>Relayer Submitting Vote</p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{statusMessage}</p>
          </div>
        )}

        {step === "confirmed" && (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <ShieldCheck
              style={{
                width: "48px",
                height: "48px",
                color: "var(--accent-emerald)",
                margin: "0 auto 0.75rem",
              }}
            />
            <p style={{ fontWeight: "bold", fontSize: "1.05rem", color: "var(--accent-emerald)", marginBottom: "0.5rem" }}>
              Vote Relayed & Confirmed!
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              {statusMessage}
            </p>
            {txHash && (
              <a
                href={`https://testnet.mstscan.com/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.85rem",
                  padding: "0.5rem 1rem",
                }}
              >
                <span>View On MSTScan Explorer</span>
                <ExternalLink style={{ width: "14px", height: "14px" }} />
              </a>
            )}
          </div>
        )}

        {step === "error" && (
          <div style={{ padding: "1rem 0" }}>
            <div
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "0.5rem",
                padding: "0.75rem",
                marginBottom: "1rem",
                fontSize: "0.85rem",
                color: "var(--accent-crimson)",
              }}
            >
              {errorMessage}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep("ready")}
                style={{ width: "100%" }}
              >
                Try Gasless Voting Again
              </button>
              <button
                id="btn-fallback-direct-vote"
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  onFallbackDirectVote(proposal.id, voteChoice);
                }}
                style={{
                  width: "100%",
                  background: "var(--accent-crimson)",
                  borderColor: "var(--accent-crimson)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.75rem",
                  fontWeight: 700,
                }}
              >
                <span>Direct On-Chain Vote (Requires Gas — ~0.0001 tMSTC)</span>
                <ArrowRight style={{ width: "16px", height: "16px" }} />
              </button>
            </div>
          </div>
        )}

        {/* Action Controls for Ready State */}
        {step === "ready" && (
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              id="btn-cancel-gasless-vote"
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              id="btn-confirm-gasless-vote"
              type="button"
              className="btn btn-success"
              onClick={handleSignAndRelay}
              disabled={isLoadingNonce || !effectiveIsMember}
              style={{
                flex: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <Fuel style={{ width: "16px", height: "16px" }} />
              <span>Sign Gasless Vote</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
