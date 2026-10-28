import React, { useState } from "react";
import {
  FileText,
  Vote,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Receipt,
  FileCheck2,
} from "lucide-react";

export const HowItWorksSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"standard" | "advance">("standard");

  const steps = [
    {
      num: "01",
      title: "Propose Expense",
      icon: <FileText style={{ width: "20px", height: "20px", color: "var(--accent-crimson)" }} />,
      desc: "Authorized club members submit a structured expense request with amount, recipient, description, and execution deadline.",
      badge: "Member Only",
      detail:
        "Proposer's affirmative vote is automatically recorded upon submission to prevent redundant transactions.",
    },
    {
      num: "02",
      title: "Member Voting",
      icon: <Vote style={{ width: "20px", height: "20px", color: "var(--accent-crimson)" }} />,
      desc: "Club members review the proposal and cast immutable on-chain votes. Strict double-voting prevention is enforced.",
      badge: "Consensus",
      detail:
        "A proposal transitions to Approved the moment affirmative votes reach the configured threshold.",
    },
    {
      num: "03",
      title: "Validate Invariants",
      icon: <ShieldCheck style={{ width: "20px", height: "20px", color: "var(--accent-emerald)" }} />,
      desc: "Smart-contract logic checks that requested funds do not exceed available liquidity. Approved payments reserve funds to prevent conflicting allocations under the contract's accounting rules.",
      badge: "Automated",
      detail:
        "Accounting relationship: Contract balance = available funds + reserved funds, enforced by contract logic and covered by tests.",
    },
    {
      num: "04",
      title: "Execute & Disburse",
      icon: <Zap style={{ width: "20px", height: "20px", color: "var(--accent-crimson)" }} />,
      desc: "Funds are disbursed to the recipient wallet via smart-contract execution with reentrancy protections covered by tests.",
      badge: "On-Chain",
      detail:
        "Real transaction hash emitted with direct explorer verification link on MST Scan.",
    },
  ];

  const advanceSteps = [
    {
      num: "A",
      title: "Advance Disbursement",
      icon: <Zap style={{ width: "20px", height: "20px", color: "var(--accent-crimson)" }} />,
      desc: "Approved funds are provided up-front for hardware, travel, or venue deposits with a strict receipt grace period (1h to 90 days).",
    },
    {
      num: "B",
      title: "Submit Receipt Hash",
      icon: <Receipt style={{ width: "20px", height: "20px", color: "var(--accent-amber)" }} />,
      desc: "Recipient uploads digital proof and records its SHA-256 / IPFS hash on-chain before the grace deadline.",
    },
    {
      num: "C",
      title: "Quorum Confirmation",
      icon: <FileCheck2 style={{ width: "20px", height: "20px", color: "var(--accent-emerald)" }} />,
      desc: "Members review invoice and vote to confirm receipt. If disputed or timed out, the recipient address is blocked from future advances.",
    },
    {
      num: "D",
      title: "Settlement or Repayment",
      icon: <CheckCircle2 style={{ width: "20px", height: "20px", color: "var(--accent-emerald)" }} />,
      desc: "Advance is cleared upon quorum confirmation. Alternatively, recipient can return unused funds to unblock their wallet.",
    },
  ];

  return (
    <section id="how-it-works" className="cv-hiw-section">
      {/* Section Header */}
      <div className="cv-hiw-header">
        <div>
          <div className="cv-badge cv-badge-crimson" style={{ marginBottom: "0.75rem" }}>
            <span>GOVERNANCE PROTOCOL</span>
          </div>
          <h2 style={{ fontSize: "2.75rem", fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            How ClubVault Works
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem", maxWidth: "600px", marginTop: "0.5rem" }}>
            Every transaction is governed by verifiable smart-contract rules. No
            single member has discretionary authority over treasury balances.
          </p>
        </div>

        {/* Workflow Switcher Tabs */}
        <div className="cv-hiw-tabs">
          <button
            onClick={() => setActiveTab("standard")}
            className={`cv-hiw-tab-btn ${activeTab === "standard" ? "active" : ""}`}
          >
            Standard Payment Flow
          </button>
          <button
            onClick={() => setActiveTab("advance")}
            className={`cv-hiw-tab-btn ${activeTab === "advance" ? "active" : ""}`}
          >
            Advance & Receipt Audit Flow
          </button>
        </div>
      </div>

      {/* Workflow Grid */}
      {activeTab === "standard" ? (
        <div className="cv-hiw-grid">
          {steps.map((step) => (
            <div key={step.num} className="cv-hiw-card">
              <div>
                <div className="cv-hiw-top">
                  <span className="cv-hiw-num">{step.num}</span>
                  <div className="cv-hiw-icon">{step.icon}</div>
                </div>

                <div
                  className="cv-badge cv-badge-neutral"
                  style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem", marginBottom: "0.6rem" }}
                >
                  {step.badge}
                </div>

                <h3 className="cv-hiw-title">{step.title}</h3>
                <p className="cv-hiw-desc">{step.desc}</p>
              </div>

              <div className="cv-hiw-detail">{step.detail}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="cv-hiw-grid">
          {advanceSteps.map((step) => (
            <div key={step.num} className="cv-hiw-card" style={{ borderLeft: "3px solid var(--accent-crimson)" }}>
              <div>
                <div className="cv-hiw-top">
                  <span className="cv-hiw-num" style={{ color: "rgba(255, 48, 59, 0.3)" }}>
                    {step.num}
                  </span>
                  <div className="cv-hiw-icon">{step.icon}</div>
                </div>

                <h3 className="cv-hiw-title">{step.title}</h3>
                <p className="cv-hiw-desc">{step.desc}</p>
              </div>

              <div
                style={{
                  paddingTop: "1rem",
                  borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  color: "var(--accent-emerald)",
                }}
              >
                <CheckCircle2 style={{ width: "14px", height: "14px" }} />
                <span>Audited Invariant</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Smart Contract Invariant Guarantee Box */}
      <div className="invariant-card" style={{ marginTop: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "var(--accent-emerald-dim)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldCheck style={{ width: "22px", height: "22px", color: "var(--accent-emerald)" }} />
          </div>
          <div>
            <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Smart-Contract Accounting Invariant
            </h4>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              ClubVault smart contracts maintain that contract balance equals available funds plus reserved funds.
              Enforced by smart-contract logic and covered by tests.
            </p>
          </div>
        </div>

        <div className="invariant-equation" style={{ padding: "0.5rem 1rem", background: "rgba(0,0,0,0.4)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
          Contract balance = available funds + reserved funds
        </div>
      </div>
    </section>
  );
};
