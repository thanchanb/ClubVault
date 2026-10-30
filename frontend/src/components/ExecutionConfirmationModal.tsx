import React, { useState } from "react";
import { Zap, ShieldCheck, AlertTriangle, X, Copy, Check, Info } from "lucide-react";
import { ProposalData, ProposalType } from "../App";

interface ExecutionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  proposal: ProposalData | null;
  vaultAddress: string;
}

export const ExecutionConfirmationModal: React.FC<ExecutionConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  proposal,
  vaultAddress,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !proposal) return null;

  const expectedSelector = "0x0d61b519";
  const expectedFunction = `executeProposal(${proposal.id})`;
  const paddedId = proposal.id.toString(16).padStart(64, "0");
  const expectedCalldata = `${expectedSelector}${paddedId}`;

  const copyCalldata = () => {
    navigator.clipboard.writeText(expectedCalldata);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "580px",
          width: "92%",
          background: "var(--bg-card)",
          borderRadius: "var(--radius-md)",
          border: "1px solid rgba(16, 185, 129, 0.35)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.45), 0 0 30px rgba(16, 185, 129, 0.15)",
          padding: "1.75rem",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.18)",
                border: "1px solid var(--accent-emerald)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-emerald)",
              }}
            >
              <ShieldCheck style={{ width: "24px", height: "24px" }} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Execution Pre-Flight Verification
              </h3>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Review transaction parameters before opening BridgeKey wallet
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X style={{ width: "20px", height: "20px" }} />
          </button>
        </div>

        {/* Verification Summary Card */}
        <div
          style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "1.1rem 1.25rem",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", rowGap: "0.65rem", fontSize: "0.86rem" }}>
            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Proposal ID:</span>
            <span style={{ fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
              #{proposal.id} ({proposal.proposalType === ProposalType.ADVANCE_PAYMENT ? "Advance Payment" : "Standard Expense"})
            </span>

            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Amount:</span>
            <span style={{ fontWeight: 700, color: "var(--accent-emerald)", fontSize: "0.95rem" }}>
              {proposal.amount} tMSTC
            </span>

            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Recipient:</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)", wordBreak: "break-all", fontSize: "0.82rem" }}>
              {proposal.recipient}
            </span>

            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Contract:</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)", wordBreak: "break-all", fontSize: "0.82rem" }}>
              {vaultAddress}
            </span>

            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Function:</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-emerald)", fontWeight: 700 }}>
              {expectedFunction}
            </span>

            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Expected Selector:</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-emerald)", fontWeight: 700 }}>
              {expectedSelector}
            </span>
          </div>

          {/* Expected Calldata */}
          <div style={{ marginTop: "0.85rem", paddingTop: "0.85rem", borderTop: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600 }}>
                Expected Calldata (36 Bytes):
              </span>
              <button
                onClick={copyCalldata}
                className="btn-icon"
                style={{
                  background: "transparent",
                  border: "none",
                  color: copied ? "var(--accent-emerald)" : "var(--text-muted)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontSize: "0.74rem",
                }}
              >
                {copied ? <Check style={{ width: "13px", height: "13px" }} /> : <Copy style={{ width: "13px", height: "13px" }} />}
                <span>{copied ? "Copied" : "Copy Calldata"}</span>
              </button>
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                background: "rgba(0, 0, 0, 0.35)",
                padding: "0.55rem 0.75rem",
                borderRadius: "6px",
                wordBreak: "break-all",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <strong style={{ color: "var(--accent-emerald)" }}>{expectedSelector}</strong>
              <span>{paddedId}</span>
            </div>
          </div>
        </div>

        {/* Safety Guidance Box */}
        <div
          style={{
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            borderRadius: "var(--radius-sm)",
            padding: "0.85rem 1rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.65rem",
          }}
        >
          <Info style={{ width: "18px", height: "18px", color: "var(--accent-emerald)", flexShrink: 0, marginTop: "2px" }} />
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
            <strong style={{ color: "var(--accent-emerald)" }}>Wallet Signature Safety Check:</strong> When BridgeKey prompts for signature, verify the method selector matches <code style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>0x0d61b519</code> (executeProposal). It should NOT show <code style={{ color: "var(--accent-crimson)" }}>0xbcfb9b61</code> (voteProposal).
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button
            id="cancel-execution-btn"
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ minWidth: "100px" }}
          >
            Cancel
          </button>
          <button
            id="confirm-execution-btn"
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              border: "none",
              color: "#FFFFFF",
              fontWeight: 700,
              boxShadow: "0 0 16px rgba(16, 185, 129, 0.35)",
            }}
          >
            <Zap style={{ width: "16px", height: "16px" }} />
            <span>Open BridgeKey to Sign</span>
          </button>
        </div>
      </div>
    </div>
  );
};
