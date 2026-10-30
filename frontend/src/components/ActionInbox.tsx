import React from "react";
import { AlertCircle, Vote, FileCheck, ArrowRight, Clock, Zap, CheckCircle2, Fuel, ShieldCheck } from "lucide-react";
import { ProposalData, ProposalStatus, ProposalType } from "../App";

interface ActionInboxProps {
  proposals: ProposalData[];
  account: string | null;
  onSelectProposal: (proposalId: number) => void;
  onFilterStatus?: (status: string) => void;
  onGaslessVote?: (proposal: ProposalData) => void;
  onExecuteProposal?: (proposalId: number) => void;
  requiredApprovals?: number;
}

export const ActionInbox: React.FC<ActionInboxProps> = ({
  proposals,
  account,
  onSelectProposal,
  onFilterStatus,
  onGaslessVote,
  onExecuteProposal,
  requiredApprovals = 2,
}) => {
  // 1. Proposals requiring vote from connected account
  // In our smart contract model, any PENDING proposal needs member votes
  const pendingVotes = proposals.filter((p) => p.status === ProposalStatus.PENDING);

  // 2. Advances requiring receipt upload (user is recipient and advance is disbursed)
  const pendingReceiptUploads = proposals.filter(
    (p) =>
      p.status === ProposalStatus.ADVANCE_DISBURSED &&
      account &&
      p.recipient.toLowerCase() === account.toLowerCase()
  );

  // 3. Receipts awaiting member confirmation vote
  const pendingReceiptConfirmations = proposals.filter(
    (p) => p.status === ProposalStatus.RECEIPT_PENDING_CONFIRMATION
  );

  // 4. Approved proposals ready for execution
  const readyToExecute = proposals.filter((p) => p.status === ProposalStatus.APPROVED);

  const totalActionCount =
    pendingVotes.length +
    pendingReceiptUploads.length +
    pendingReceiptConfirmations.length +
    readyToExecute.length;

  return (
    <div
      className="glass-panel"
      style={{
        padding: "1.5rem 1.75rem",
        marginBottom: "2rem",
        borderRadius: "var(--radius-md)",
        position: "relative",
        border: totalActionCount > 0 ? "1px solid rgba(255, 48, 59, 0.3)" : "1px solid var(--border-subtle)",
        background: totalActionCount > 0 ? "var(--bg-glass)" : "var(--bg-card)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "8px",
              background: totalActionCount > 0 ? "rgba(255, 48, 59, 0.15)" : "rgba(16, 185, 129, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: totalActionCount > 0 ? "var(--accent-crimson)" : "var(--accent-emerald)",
            }}
          >
            {totalActionCount > 0 ? <AlertCircle style={{ width: "18px", height: "18px" }} /> : <CheckCircle2 style={{ width: "18px", height: "18px" }} />}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", color: "var(--text-primary)", fontWeight: 700 }}>
                Needs Your Attention
              </h3>
              {totalActionCount > 0 && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontFamily: "var(--font-mono)",
                    background: "var(--accent-crimson)",
                    color: "#FFFFFF",
                    padding: "0.15rem 0.55rem",
                    borderRadius: "var(--radius-pill)",
                    fontWeight: 700,
                  }}
                >
                  {totalActionCount} pending
                </span>
              )}
            </div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {account
                ? `Derived from active contract proposals for ${account.slice(0, 6)}...${account.slice(-4)}`
                : "Connect your wallet to cast votes and confirm submitted receipts."}
            </span>
          </div>
        </div>

        {totalActionCount === 0 && (
          <div style={{ fontSize: "0.82rem", color: "var(--accent-emerald)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <CheckCircle2 style={{ width: "16px", height: "16px" }} />
            <span>All treasury governance items up to date</span>
          </div>
        )}
      </div>

      {totalActionCount > 0 && (
        <div>
          {/* Prominent Section: Proposals Ready for Execution */}
          {readyToExecute.length > 0 && (
            <div
              id="action-inbox-ready-execution-section"
              style={{
                marginBottom: "1.25rem",
                padding: "1.1rem 1.35rem",
                borderRadius: "var(--radius-sm)",
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(13, 148, 136, 0.08) 100%)",
                border: "1.5px solid var(--accent-emerald)",
                boxShadow: "0 0 24px rgba(16, 185, 129, 0.18)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      background: "rgba(16, 185, 129, 0.22)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--accent-emerald)",
                    }}
                  >
                    <Zap style={{ width: "16px", height: "16px" }} />
                  </div>
                  <h4 style={{ fontSize: "0.98rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    Proposals Ready for Execution ({readyToExecute.length})
                  </h4>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      background: "rgba(16, 185, 129, 0.25)",
                      color: "var(--accent-emerald)",
                      padding: "0.15rem 0.55rem",
                      borderRadius: "var(--radius-pill)",
                      border: "1px solid rgba(16, 185, 129, 0.4)",
                    }}
                  >
                    Quorum Reached
                  </span>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Approved by club members — funds reserved & ready for disbursement
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {readyToExecute.map((p) => (
                  <div
                    key={`ready-exec-${p.id}`}
                    id={`ready-exec-card-${p.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "var(--bg-surface)",
                      padding: "0.85rem 1.15rem",
                      borderRadius: "8px",
                      border: "1px solid rgba(16, 185, 129, 0.28)",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: "260px" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "var(--accent-emerald)",
                          background: "rgba(16, 185, 129, 0.15)",
                          padding: "0.25rem 0.55rem",
                          borderRadius: "4px",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                        }}
                      >
                        #{p.id}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--text-primary)" }}>
                          {p.description}
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "flex", gap: "0.7rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
                          <span>
                            Amount: <strong style={{ color: "var(--accent-emerald)" }}>{p.amount} tMSTC</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Recipient: <code style={{ color: "var(--text-secondary)", fontSize: "0.74rem" }}>{p.recipient.slice(0, 8)}...{p.recipient.slice(-6)}</code>
                          </span>
                          <span>•</span>
                          <span>
                            Approvals: <strong style={{ color: "var(--accent-emerald)" }}>{p.approvalsCount} / {requiredApprovals}</strong> (Quorum Met)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <button
                        id={`action-inbox-details-btn-${p.id}`}
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: "0.8rem", padding: "0.45rem 0.75rem" }}
                        onClick={() => onSelectProposal(p.id)}
                      >
                        Details
                      </button>
                      <button
                        id={`action-inbox-execute-btn-${p.id}`}
                        type="button"
                        className="btn btn-primary"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          fontSize: "0.82rem",
                          padding: "0.5rem 0.95rem",
                          fontWeight: 700,
                          background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                          border: "none",
                          color: "#FFFFFF",
                          boxShadow: "0 0 16px rgba(16, 185, 129, 0.35)",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          if (onExecuteProposal) {
                            onExecuteProposal(p.id);
                          } else {
                            onSelectProposal(p.id);
                          }
                        }}
                      >
                        <Zap style={{ width: "14px", height: "14px" }} />
                        <span>
                          {p.proposalType === ProposalType.ADVANCE_PAYMENT
                            ? `Release Advance (${p.amount} tMSTC)`
                            : `Execute Disbursement (${p.amount} tMSTC)`}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid of Other Governance Actions */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1rem",
            }}
          >
            {/* Action 1: Pending Votes */}
            {pendingVotes.length > 0 && (
              <div
                id="action-inbox-pending-votes"
                role="button"
                tabIndex={0}
                onClick={() => {
                  const targetProposal = pendingVotes[0];
                  if (targetProposal) {
                    onSelectProposal(targetProposal.id);
                    if (onFilterStatus) onFilterStatus("PENDING");
                    setTimeout(() => {
                      document.getElementById(`proposal-card-${targetProposal.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 100);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    const targetProposal = pendingVotes[0];
                    if (targetProposal) {
                      onSelectProposal(targetProposal.id);
                      if (onFilterStatus) onFilterStatus("PENDING");
                    }
                  }
                }}
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid rgba(255, 48, 59, 0.35)",
                  cursor: "pointer",
                  transition: "var(--transition)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <Vote style={{ width: "18px", height: "18px", color: "var(--accent-crimson)" }} />
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {pendingVotes.length} Proposal{pendingVotes.length > 1 ? "s" : ""} Need Your Vote
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Pending quorum decision — click to open Proposal #{pendingVotes[0].id}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  {onGaslessVote && (
                    <button
                      id="action-inbox-quick-gasless-btn"
                      className="btn btn-secondary"
                      style={{
                        border: "1px solid var(--accent-emerald)",
                        color: "var(--accent-emerald)",
                        background: "rgba(16, 185, 129, 0.12)",
                        padding: "0.35rem 0.65rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        borderRadius: "6px",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onGaslessVote(pendingVotes[0]);
                      }}
                      title="Quick Gasless Vote via Relayer"
                    >
                      <Fuel style={{ width: "13px", height: "13px" }} />
                      <span>Gasless Vote</span>
                    </button>
                  )}
                  <div
                    id="action-inbox-arrow-btn"
                    style={{
                      padding: "0.25rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Open Proposal Details"
                  >
                    <ArrowRight style={{ width: "16px", height: "16px", color: "var(--accent-crimson)" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Action 2: Advance awaiting receipt upload */}
            {pendingReceiptUploads.length > 0 && (
              <div
                onClick={() => onSelectProposal(pendingReceiptUploads[0].id)}
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  cursor: "pointer",
                  transition: "var(--transition)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <Clock style={{ width: "18px", height: "18px", color: "var(--accent-amber)" }} />
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {pendingReceiptUploads.length} Advance Awaiting Receipt
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--accent-amber)" }}>
                      Upload invoice to prevent default
                    </div>
                  </div>
                </div>
                <ArrowRight style={{ width: "14px", height: "14px", color: "var(--text-muted)" }} />
              </div>
            )}

            {/* Action 3: Receipts awaiting confirmation */}
            {pendingReceiptConfirmations.length > 0 && (
              <div
                onClick={() => onSelectProposal(pendingReceiptConfirmations[0].id)}
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  transition: "var(--transition)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <FileCheck style={{ width: "18px", height: "18px", color: "var(--accent-emerald)" }} />
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {pendingReceiptConfirmations.length} Receipt{pendingReceiptConfirmations.length > 1 ? "s" : ""} to Verify
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Member consensus required
                    </div>
                  </div>
                </div>
                <ArrowRight style={{ width: "14px", height: "14px", color: "var(--text-muted)" }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
