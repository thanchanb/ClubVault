import React, { useState, useEffect } from "react";
import {
  Check,
  Copy,
  LogOut,
  ExternalLink,
  RefreshCw,
  X,
  Radio,
  AlertTriangle,
  Download,
} from "lucide-react";
import { motion } from "framer-motion";
import { MST_TESTNET_CONFIG } from "../contracts/config";
import {
  isBridgeKeyInstalled,
  connectRealBridgeKey,
  switchOrAddMSTTestnet,
} from "../utils/wallet";

export interface BridgeKeyAccount {
  id: string;
  address: string;
  name: string;
  role: string;
  badge: string;
  balance: string;
  quorumWeight: string;
  isMultisig: boolean;
}

interface BridgeKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (account: string, balance: string) => void;
  onDisconnect: () => void;
  currentAccount: string | null;
  currentBalance: string;
  isCorrectNetwork: boolean;
  onSwitchNetwork: () => void;
}

// Authentic BridgeKey Stylized 'B' Logo component
export const BridgeKeyLogo: React.FC<{ size?: number; color?: string; style?: React.CSSProperties }> = ({
  size = 32,
  color = "#5840FF",
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block", ...style }}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 8C12 5.79086 13.7909 4 16 4H26C31.5228 4 36 8.47715 36 14C36 17.5134 34.1804 20.6033 31.4273 22.399C35.2635 24.1952 38 28.1691 38 32.8C38 39.5379 32.5379 45 25.8 45H16C13.7909 45 12 43.2091 12 41V8ZM21 12H25C26.6569 12 28 13.3431 28 15C28 16.6569 26.6569 18 25 18H21V12ZM21 26H26C28.2091 26 30 27.7909 30 30C30 32.2091 28.2091 34 26 34H21V26Z"
      fill={color}
    />
    <circle cx="21" cy="19" r="2.5" fill="#FFFFFF" />
    <circle cx="21" cy="30" r="2.5" fill="#FFFFFF" />
  </svg>
);

export const BridgeKeyModal: React.FC<BridgeKeyModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  onDisconnect,
  currentAccount,
  currentBalance,
  isCorrectNetwork,
  onSwitchNetwork,
}) => {
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasExtension, setHasExtension] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Re-check extension availability whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setHasExtension(isBridgeKeyInstalled());
      setErrorMsg(null);
      const interval = setInterval(() => {
        if (isBridgeKeyInstalled()) {
          setHasExtension(true);
          clearInterval(interval);
        }
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Real Wallet Connection Handler
  const handleRealConnect = async (targetWallet: "bridgekey" | "metamask" | "rabby" | "auto" = "auto") => {
    setIsConnecting(true);
    setErrorMsg(null);

    try {
      const result = await connectRealBridgeKey(targetWallet);
      onConnect(result.account, result.balance);

      // If on wrong network, prompt to switch
      if (!result.isCorrectNetwork) {
        await switchOrAddMSTTestnet();
      }

      onClose();
    } catch (err: any) {
      console.warn("Wallet connection error:", err);
      if (err.code === 4001 || err.action === "reject" || err.message?.includes("rejected")) {
        setErrorMsg("Connection request was rejected in your wallet window.");
      } else {
        setErrorMsg(err.message || "Failed to connect wallet.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <motion.div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        style={{
          maxWidth: "460px",
          width: "92%",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <BridgeKeyLogo size={32} color="var(--accent-crimson)" />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                  BridgeKey Wallet
                </span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "0.15rem 0.45rem",
                    borderRadius: "var(--radius-pill)",
                    background: "rgba(255, 48, 59, 0.15)",
                    color: "var(--accent-crimson)",
                    letterSpacing: "0.5px",
                  }}
                >
                  MST NATIVE
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Official Web3 Gateway for MST Blockchain
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: "0.4rem", borderRadius: "var(--radius-pill)", width: "32px", height: "32px" }}
            aria-label="Close"
          >
            <X style={{ width: "16px", height: "16px" }} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: "1.5rem" }}>
          {/* ALREADY CONNECTED VIEW */}
          {currentAccount ? (
            <div>
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  marginBottom: "1.25rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: "#10B981",
                        boxShadow: "0 0 10px #10B981",
                      }}
                    />
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      BridgeKey Connected
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      padding: "0.2rem 0.5rem",
                      borderRadius: "var(--radius-pill)",
                      background: isCorrectNetwork ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                      color: isCorrectNetwork ? "#10B981" : "#F59E0B",
                    }}
                  >
                    {isCorrectNetwork ? "MST Testnet" : "Wrong Network"}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.6rem 0.8rem",
                    background: "var(--bg-surface)",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.85rem",
                    color: "var(--text-primary)",
                    marginBottom: "0.75rem",
                  }}
                >
                  <span title={currentAccount}>
                    {currentAccount.slice(0, 10)}...{currentAccount.slice(-8)}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <button
                      onClick={() => copyToClipboard(currentAccount)}
                      className="btn btn-secondary"
                      style={{ padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
                      title="Copy Address"
                    >
                      {copied ? <Check style={{ width: "12px", height: "12px", color: "#10B981" }} /> : <Copy style={{ width: "12px", height: "12px" }} />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                    <a
                      href={`https://testnet.mstscan.com/address/${currentAccount}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
                      title="View on MSTScan"
                    >
                      <ExternalLink style={{ width: "12px", height: "12px" }} />
                    </a>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>On-Chain Balance:</span>
                  <span style={{ fontWeight: 700, color: "var(--accent-crimson)", fontSize: "1.05rem" }}>
                    {currentBalance} tMSTC
                  </span>
                </div>
              </div>

              {!isCorrectNetwork && (
                <div
                  style={{
                    padding: "0.85rem",
                    background: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "1.25rem",
                    fontSize: "0.82rem",
                    color: "#F59E0B",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <AlertTriangle style={{ width: "18px", height: "18px", flexShrink: 0 }} />
                    <span>Wallet is not on MST Testnet (Chain ID 91562037).</span>
                  </div>
                  <button
                    onClick={onSwitchNetwork}
                    className="btn btn-primary"
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem", whiteSpace: "nowrap" }}
                  >
                    Switch
                  </button>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => {
                    onDisconnect();
                    onClose();
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: "0.65rem 1rem", borderColor: "rgba(255, 48, 59, 0.4)", color: "var(--accent-crimson)" }}
                >
                  <LogOut style={{ width: "16px", height: "16px" }} />
                  <span>Disconnect Wallet</span>
                </button>
                <button
                  onClick={onClose}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: "0.65rem 1rem" }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* DISCONNECTED VIEW */
            <div>
              {errorMsg && (
                <div
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(255, 48, 59, 0.12)",
                    border: "1px solid rgba(255, 48, 59, 0.3)",
                    color: "var(--accent-crimson)",
                    fontSize: "0.82rem",
                    marginBottom: "1.25rem",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.6rem",
                  }}
                >
                  <AlertTriangle style={{ width: "16px", height: "16px", flexShrink: 0, marginTop: "2px" }} />
                  <div>{errorMsg}</div>
                </div>
              )}

              {/* Genuine BridgeKey Provider Available */}
              {hasExtension ? (
                <div>
                  <div
                    style={{
                      padding: "1rem",
                      borderRadius: "var(--radius-md)",
                      background: "rgba(88, 64, 255, 0.08)",
                      border: "1px solid rgba(88, 64, 255, 0.2)",
                      marginBottom: "1.25rem",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ display: "inline-flex", padding: "0.6rem", borderRadius: "50%", background: "rgba(88, 64, 255, 0.15)", marginBottom: "0.5rem" }}>
                      <Radio style={{ width: "24px", height: "24px", color: "var(--accent-crimson)" }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                      BridgeKey Wallet Detected
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Click below to request real account authorization from your browser extension.
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    <button
                      id="btn-connect-bridgekey"
                      onClick={() => handleRealConnect("bridgekey")}
                      disabled={isConnecting}
                      className="btn btn-primary"
                      style={{
                        width: "100%",
                        padding: "0.85rem 1.25rem",
                        fontSize: "0.95rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.6rem",
                        boxShadow: "0 4px 20px rgba(255, 48, 59, 0.25)",
                      }}
                    >
                      {isConnecting ? (
                        <>
                          <RefreshCw style={{ width: "18px", height: "18px", animation: "spin 1s linear infinite" }} />
                          <span>Awaiting Authorization in Extension...</span>
                        </>
                      ) : (
                        <>
                          <BridgeKeyLogo size={20} color="#FFFFFF" />
                          <span>Connect BridgeKey</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.75rem" }}>
                    Your password is never requested by ClubVault. Authentication happens safely in your extension.
                  </div>
                </div>
              ) : (
                /* No Extension Injected */
                <div>
                  <div
                    style={{
                      padding: "1.25rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      marginBottom: "1.25rem",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ display: "inline-flex", padding: "0.75rem", borderRadius: "50%", background: "rgba(245, 158, 11, 0.12)", marginBottom: "0.75rem" }}>
                      <Download style={{ width: "26px", height: "26px", color: "var(--accent-amber)" }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                      BridgeKey Wallet Extension Required
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "1rem" }}>
                      ClubVault requires the genuine BridgeKey browser extension to sign transactions and verify multi-member treasury governance on the MST Blockchain.
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <a
                        href="https://bridgekey.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ padding: "0.65rem 1rem", fontSize: "0.85rem", textDecoration: "none" }}
                      >
                        <ExternalLink style={{ width: "15px", height: "15px" }} />
                        <span>Download Official BridgeKey Wallet</span>
                      </a>
                      <button
                        onClick={() => setHasExtension(isBridgeKeyInstalled())}
                        className="btn btn-secondary"
                        style={{ padding: "0.5rem 1rem", fontSize: "0.82rem" }}
                      >
                        <RefreshCw style={{ width: "14px", height: "14px" }} />
                        <span>Refresh / Re-check Extension</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
