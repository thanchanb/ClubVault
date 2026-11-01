import React from "react";
import { ProposalData, ProposalStatus, ProposalType } from "../App";
import {
  X,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Receipt,
  Zap,
  Vote,
  AlertTriangle,
  Fuel,
} from "lucide-react";

interface ProposalDetailModalProps {
  proposal: ProposalData | null;
  onClose: () => void;
  onVote: (id: number, approve: boolean) => void;
  onExecute: (id: number) => void;
  onSubmitReceipt: (id: number) => void;
  requiredApprovals: number;
  totalMembers: number;
  account: string | null;
  onGaslessVote?: (proposal: ProposalData) => void;
}

export const ProposalDetailModal: React.FC<ProposalDetailModalProps> = ({
  proposal,
  onClose,
  onVote,
  onExecute,
  onSubmitReceipt,
  requiredApprovals,
  totalMembers,
  account,
  onGaslessVote,
}) => {
  if (!proposal) return null;

  const isQuorumReached = proposal.approvalsCount >= requiredApprovals;
  const isPending = proposal.status === ProposalStatus.PENDING;
  const isApproved = proposal.status === ProposalStatus.APPROVED;
  const isAdvanceDisbursed = proposal.status === ProposalStatus.ADVANCE_DISBURSED;
  const isReceiptPending = proposal.status === ProposalStatus.RECEIPT_PENDING_CONFIRMATION;

  const yesPercent = Math.min(100, (proposal.approvalsCount / totalMembers) * 100);
  const noPercent = Math.min(100, (proposal.rejectionsCount / totalMembers) * 100);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "640px" }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span className="proposal-id">#{proposal.id}</span>
            <span
              style={{
                fontSize: "0.72rem",
                padding: "0.2rem 0.55rem",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                background:
                  proposal.proposalType === ProposalType.ADVANCE_PAYMENT
                    ? "rgba(255, 48, 59, 0.15)"
                    : "rgba(255, 255, 255, 0.08)",
                color:
                  proposal.proposalType === ProposalType.ADVANCE_PAYMENT
                    ? "#FF8088"
                    : "var(--text-primary)",
              }}
            >
              {proposal.proposalType === ProposalType.ADVANCE_PAYMENT ? "ADVANCE PAYMENT" : "STANDARD PAYMENT"}
            </span>
          </div>

          <button className="close-btn" onClick={onClose}>
            <X style={{ width: "20px", height: "20px" }} />
          </button>
        </div>

        {/* Title & Description */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.35rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            {proposal.description}
          </h2>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-crimson)", fontFamily: "var(--font-heading)" }}>
              {proposal.amount}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 700 }}>
              tMSTC
            </span>
          </div>
        </div>

        {/* Metadata Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            padding: "1.25rem",
            background: "var(--bg-surface-elevated)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            marginBottom: "1.5rem",
            fontFamily: "var(--font-mono)",
            fontSize: "0.82rem",
          }}
        >
          <div>
            <span style={{ color: "var(--text-muted)", display: "block" }}>Recipient Address</span>
            <span className="address-tag" style={{ marginTop: "4px" }}>
              {proposal.recipient}
            </span>
          </div>

          <div>
            <span style={{ color: "var(--text-muted)", display: "block" }}>Proposer Address</span>
            <span className="address-tag" style={{ marginTop: "4px" }}>
              {proposal.proposer}
            </span>
          </div>

          <div>
            <span style={{ color: "var(--text-muted)", display: "block" }}>Creation Timestamp</span>
            <span style={{ color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
              {new Date(proposal.createdAt * 1000).toLocaleString()}
            </span>
          </div>

          <div>
            <span style={{ color: "var(--text-muted)", display: "block" }}>Execution Deadline</span>
            <span style={{ color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
              {new Date(proposal.executionDeadline * 1000).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Voting & Quorum Status */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>
            <span style={{ color: "var(--text-muted)" }}>Quorum Approval Status</span>
            <strong style={{ color: isQuorumReached ? "var(--accent-emerald)" : "var(--accent-amber)" }}>
              {proposal.approvalsCount} / {requiredApprovals} Affirmative Votes Needed
            </strong>
          </div>

          <div className="vote-progress">
            <div className="vote-fill-yes" style={{ width: `${yesPercent}%` }} />
            <div className="vote-fill-no" style={{ width: `${noPercent}%` }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginTop: "0.35rem" }}>
            <span>Affirmative Approvals: {proposal.approvalsCount}</span>
            <span>Rejections: {proposal.rejectionsCount}</span>
          </div>
        </div>

        {/* Receipt Audit Subsystem (If Advance Payment) */}
        {proposal.proposalType === ProposalType.ADVANCE_PAYMENT && (
          <div
            style={{
              padding: "1rem 1.25rem",
              background: "#08090C",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              marginBottom: "1.5rem",
              fontSize: "0.82rem",
              fontFamily: "var(--font-mono)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#FF8088", fontWeight: 700, marginBottom: "0.5rem" }}>
              <Receipt style={{ width: "16px", height: "16px" }} />
              <span>Advance Payment & Receipt Audit Subsystem</span>
            </div>

            {proposal.receiptHash ? (
              <div>
                <div style={{ marginBottom: "0.35rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Receipt IPFS CID: </span>
                  <a
                    href={`https://ipfs.io/ipfs/${proposal.receiptHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="address-tag"
                    style={{ color: "#FF8088" }}
                  >
                    <span>{proposal.receiptHash}</span>
                    <ExternalLink style={{ width: "11px", height: "11px" }} />
                  </a>
                </div>
                <div style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--text-muted)" }}>Audit Memo: </span>
                  {proposal.receiptDescription}
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: "0 0 0.5rem 0" }}>
                  {proposal.status === ProposalStatus.APPROVED
                    ? `Stage 1 of 2: Quorum approved. Releasing advance will disburse ${proposal.amount} tMSTC to recipient. Stage 2 (Receipt Confirmation) begins once recipient submits invoice proof.`
                    : "No receipt submitted yet. Grace period deadline is enforced by smart-contract logic upon advance disbursement."}
                </p>
                {proposal.status === ProposalStatus.APPROVED && (
                  <div style={{ color: "var(--accent-emerald)", fontSize: "0.78rem" }}>
                    Advance amount to release: <strong>{proposal.amount} tMSTC</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: "1.25rem" }}>
          <div>
            {proposal.txHash && (
              <a
                href={`https://testnet.mstscan.com/tx/${proposal.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="address-tag"
              >
                <span>Explorer Tx ↗</span>
              </a>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
            {isPending && (
              <>
                {onGaslessVote && (
                  <button
                    id="detail-modal-gasless-vote-btn"
                    className="btn btn-secondary"
                    style={{
                      border: "1px solid var(--accent-emerald)",
                      color: "var(--accent-emerald)",
                      background: "rgba(16, 185, 129, 0.12)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.5rem 0.9rem",
                      fontWeight: 700,
                    }}
                    onClick={() => {
                      onClose();
                      onGaslessVote(proposal);
                    }}
                    title="Cast Gas-Sponsored Vote via EIP-712 Relayer (0 Gas Paid by Voter)"
                  >
                    <Fuel style={{ width: "16px", height: "16px" }} />
                    <span>Gasless Vote (0 Gas)</span>
                  </button>
                )}
                <button
                  id="detail-modal-direct-vote-btn"
                  className="btn btn-success"
                  onClick={() => {
                    onVote(proposal.id, true);
                    onClose();
                  }}
                >
                  <CheckCircle2 style={{ width: "16px", height: "16px" }} />
                  <span>Approve</span>
                </button>
                <button
                  id="detail-modal-reject-vote-btn"
                  className="btn btn-danger"
                  onClick={() => {
                    onVote(proposal.id, false);
                    onClose();
                  }}
                >
                  <XCircle style={{ width: "16px", height: "16px" }} />
                  <span>Reject</span>
                </button>
              </>
            )}

            {isApproved && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  onExecute(proposal.id);
                  onClose();
                }}
              >
                <Zap style={{ width: "16px", height: "16px" }} />
                <span>
                  {proposal.proposalType === ProposalType.ADVANCE_PAYMENT
                    ? `Release Advance (${proposal.amount} tMSTC)`
                    : `Execute Disbursement (${proposal.amount} tMSTC)`}
                </span>
              </button>
            )}

            {isAdvanceDisbursed && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  onSubmitReceipt(proposal.id);
                  onClose();
                }}
              >
                <Receipt style={{ width: "16px", height: "16px" }} />
                <span>Submit Expense Receipt</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
