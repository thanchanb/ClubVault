import React from "react";
import { CheckCircle2, ExternalLink, X, ShieldCheck, Copy, Check } from "lucide-react";

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  txHash: string;
  amount: string;
  recipient: string;
  proposalId: number;
  proposalDescription: string;
}

export const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
  isOpen,
  onClose,
  txHash,
  amount,
  recipient,
  proposalId,
  proposalDescription,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const copyTxHash = () => {
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "540px", textAlign: "center" }}>
        {/* Success Icon with Glow */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.15)",
              border: "2px solid #10B981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 30px rgba(16, 185, 129, 0.4)",
            }}
          >
            <CheckCircle2 style={{ width: "36px", height: "36px", color: "#10B981" }} />
          </div>
        </div>

        <h3 style={{ fontSize: "1.5rem", fontFamily: "var(--font-heading)", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
          Disbursement Confirmed
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          Payment executed according to smart-contract quorum approval rules.
        </p>

        {/* Disbursed Amount Card */}
        <div
          style={{
            padding: "1.25rem",
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            marginBottom: "1.5rem",
            textAlign: "left",
            fontFamily: "var(--font-mono)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: "0.85rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Proposal</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>#{proposalId} — {proposalDescription}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: "0.85rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Amount Disbursed</span>
            <strong style={{ color: "var(--accent-crimson)", fontSize: "1.1rem" }}>{amount} tMSTC</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: "0.85rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Recipient</span>
            <span className="address-tag">{recipient.slice(0, 10)}...{recipient.slice(-6)}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Network</span>
            <span style={{ color: "#10B981" }}>MST Blockchain Testnet (91562037)</span>
          </div>
        </div>

        {/* Transaction Hash Card with Copy & Explorer Link */}
        <div
          style={{
            padding: "1rem",
            background: "#08090C",
            border: "1px solid rgba(255, 48, 59, 0.3)",
            borderRadius: "var(--radius-sm)",
            marginBottom: "1.75rem",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              TRANSACTION HASH
            </span>
            <button
              onClick={copyTxHash}
              style={{
                background: "transparent",
                border: "none",
                color: copied ? "#10B981" : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                fontFamily: "var(--font-mono)",
              }}
            >
              {copied ? <Check style={{ width: "12px", height: "12px" }} /> : <Copy style={{ width: "12px", height: "12px" }} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.8rem",
              color: "var(--text-primary)",
              wordBreak: "break-all",
              lineHeight: 1.4,
            }}
          >
            {txHash}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <a
            href={`https://testnet.mstscan.com/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            <span>View on MST Scan</span>
            <ExternalLink style={{ width: "14px", height: "14px" }} />
          </a>

          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
