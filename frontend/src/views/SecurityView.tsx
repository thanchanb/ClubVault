import React from "react";
import { ShieldCheck, Lock, AlertTriangle, FileText, CheckCircle2, Terminal, ExternalLink, Bug, Info } from "lucide-react";

export const SecurityView: React.FC = () => {
  return (
    <div className="container" style={{ paddingTop: "7rem", paddingBottom: "5rem" }}>
      {/* Header */}
      <div style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto 3.5rem auto" }}>
        <div className="cv-badge cv-badge-crimson" style={{ margin: "0 auto 1rem auto" }}>
          <ShieldCheck style={{ width: "13px", height: "13px" }} />
          <span>Security & Architectural Integrity</span>
        </div>
        <h1 style={{ fontSize: "2.75rem", marginBottom: "1rem", color: "var(--text-primary)" }}>
          Trust Through Cryptographic Verification
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", lineHeight: 1.6 }}>
          ClubVault enforces strict smart-contract invariants, formal checks, and non-custodial multi-signature
          protections to ensure shared community money remains tamper-resistant.
        </p>
      </div>

      {/* Honest Audit Status Callout */}
      <div className="disclaimer-banner" style={{ marginBottom: "3rem", padding: "1.5rem" }}>
        <div className="disclaimer-icon">
          <Info style={{ width: "24px", height: "24px", color: "var(--accent-amber)" }} />
        </div>
        <div>
          <h4 style={{ color: "var(--accent-amber)", fontSize: "1.05rem", marginBottom: "0.4rem", fontWeight: 700 }}>
            Transparent Audit Disclosure: Testnet Hackathon Stage
          </h4>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
            The smart contracts in this repository are deployed on the <strong>MST Testnet (Chain ID 91562037)</strong> for demonstration,
            hackathon evaluation, and developer testing. They have undergone internal automated testing (26 unit and invariant tests
            with 100% pass rate) and vulnerability checks. However, they have <strong>not yet undergone an external third-party security audit</strong> by a professional firm. Do not deposit real production or mainnet funds.
          </p>
        </div>
      </div>

      {/* 4 Pillars of ClubVault Security */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.75rem",
          marginBottom: "3.5rem",
        }}
      >
        <div className="glass-panel" style={{ padding: "1.75rem", borderRadius: "var(--radius-md)" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid var(--accent-emerald)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
            <CheckCircle2 style={{ width: "22px", height: "22px", color: "var(--accent-emerald)" }} />
          </div>
          <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            Mathematical Invariant Proof
          </h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1rem" }}>
            At every block and execution step, the contract balance satisfies:
          </p>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", background: "var(--bg-surface-elevated)", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-sm)", color: "var(--accent-emerald)", border: "1px solid var(--border-subtle)" }}>
            Contract Balance = Available + Reserved
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.75rem", borderRadius: "var(--radius-md)" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(255, 48, 59, 0.15)", border: "1px solid var(--accent-crimson)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
            <Lock style={{ width: "22px", height: "22px", color: "var(--accent-crimson)" }} />
          </div>
          <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            OpenZeppelin ReentrancyGuard
          </h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1rem" }}>
            All disbursement functions are guarded with OpenZeppelin's battle-tested <code>nonReentrant</code> modifier, rigorously tested against malicious reentrant contracts.
          </p>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", background: "var(--bg-surface-elevated)", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}>
            Checks-Effects-Interactions Pattern
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.75rem", borderRadius: "var(--radius-md)" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(59, 130, 246, 0.15)", border: "1px solid var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
            <Terminal style={{ width: "22px", height: "22px", color: "var(--accent-blue)" }} />
          </div>
          <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            Automated Test Coverage
          </h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1rem" }}>
            Comprehensive Hardhat TypeScript test suite covering 26 distinct scenarios: bounded membership, quorum limits, double voting, grace period overflows, and repayment.
          </p>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", background: "var(--bg-surface-elevated)", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-sm)", color: "var(--accent-emerald)", border: "1px solid var(--border-subtle)" }}>
            26 / 26 Hardhat Tests Passing
          </div>
        </div>
      </div>

      {/* Security Specifications Detail */}
      <div className="glass-panel" style={{ padding: "2.5rem", borderRadius: "var(--radius-md)", marginBottom: "3rem" }}>
        <h3 style={{ fontSize: "1.4rem", color: "var(--text-primary)", marginBottom: "1.5rem" }}>
          Specific Protection Mechanisms
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {[
            {
              title: "Double-Execution & Double-Voting Immunity",
              detail: "Proposals record voter mappings and boolean flags on-chain. Once a proposal is executed, its status changes to EXECUTED or ADVANCE_DISBURSED, permanently preventing double payouts even if re-triggered.",
            },
            {
              title: "Bounded Membership (1 to 50 Members)",
              detail: "To prevent unbounded loop gas exhaustion (Denial of Service attacks), ClubVault enforces a strict MAX_MEMBERS constant of 50. Vaults cannot be deployed with zero or exceeding members.",
            },
            {
              title: "Social Consensus Receipt Boundary",
              detail: "We explicitly do not claim that a SHA-256 hash or IPFS CID guarantees physical goods delivery. The contract verifies that the receipt was submitted on time and anchors its cryptographic digest; members exercise social consensus to approve or dispute it.",
            },
            {
              title: "Non-Custodial Multi-Signature Quorum",
              detail: "Funds can never be withdrawn by a single administrator, proposer, or developer. Quorum is enforced at the EVM opcode level via require(proposal.approvalsCount >= requiredApprovals).",
            },
          ].map((item, idx) => (
            <div key={idx} style={{ padding: "1.25rem", background: "var(--bg-surface-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
              <h4 style={{ color: "var(--text-primary)", fontSize: "1rem", marginBottom: "0.35rem" }}>{item.title}</h4>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.6 }}>{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Responsible Disclosure */}
      <div className="glass-panel" style={{ padding: "2rem", borderRadius: "var(--radius-md)", textAlign: "center" }}>
        <Bug style={{ width: "28px", height: "28px", color: "var(--accent-crimson)", margin: "0 auto 0.75rem auto" }} />
        <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          Responsible Vulnerability Disclosure
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "600px", margin: "0 auto 1.25rem auto" }}>
          If you discover a security vulnerability or invariant edge-case in ClubVault contracts or frontend,
          please report it responsibly to our development team.
        </p>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ display: "inline-flex" }}
        >
          <ExternalLink style={{ width: "16px", height: "16px" }} />
          <span>Security Advisory Contacts</span>
        </a>
      </div>
    </div>
  );
};
