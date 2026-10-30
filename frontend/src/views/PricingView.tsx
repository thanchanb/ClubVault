import React from "react";
import { Check, AlertCircle, ArrowRight, Shield, Zap, Building2, Users } from "lucide-react";

interface PricingViewProps {
  onSelectPlan: (planId: string) => void;
  onNavigateHome: () => void;
}

export const PricingView: React.FC<PricingViewProps> = ({ onSelectPlan, onNavigateHome }) => {
  const plans = [
    {
      id: "starter",
      name: "Community Starter",
      tagline: "Ideal for student clubs, hobby groups, and small shared pools.",
      price: "0 tMSTC",
      billingNote: "Free forever on MST Testnet",
      featured: false,
      badge: "Popular for Clubs",
      features: [
        "Single ClubVault Treasury",
        "Up to 10 authorized voting members",
        "Configurable quorum (M-of-N multisig)",
        "Standard & Advance-payment flows",
        "Cryptographic receipt hash anchoring",
        "On-chain transparent transaction ledger",
        "Real-time Invariant balance auditing",
        "Basic CSV ledger export",
      ],
      cta: "Launch Starter Vault",
    },
    {
      id: "guild",
      name: "Pro Guild & Societies",
      tagline: "For housing societies, larger student committees, and project teams.",
      price: "0 tMSTC",
      billingNote: "Testnet Beta (Future: 15 tMSTC/mo)",
      featured: true,
      badge: "Recommended",
      features: [
        "Up to 5 distinct ClubVaults under one guild",
        "Up to 50 authorized members per vault",
        "Custom voting durations (1 to 30 days)",
        "Strict advance-settlement controls",
        "Actionable 'Needs Attention' inbox widget",
        "Detailed audit reports & CSV downloads",
        "Email/webhook notification relays (Phase 5)",
        "Priority MST Testnet transaction submission",
      ],
      cta: "Deploy Guild Vault",
    },
    {
      id: "ngo",
      name: "NGO & Non-Profit",
      tagline: "For registered charities, prize pools, and open-source grants.",
      price: "Custom",
      billingNote: "0% protocol fees for verified causes",
      featured: false,
      badge: "Public Transparency",
      features: [
        "Unlimited vaults & donor monitoring portal",
        "Multi-tier approval workflows",
        "Public read-only auditor view",
        "Immutable receipt proof archive",
        "Custom governance rules translation",
        "Exportable PDF/CSV balance sheets",
        "Dedicated deployment assistance",
        "Direct smart-contract factory integration",
      ],
      cta: "Configure NGO Vault",
    },
  ];

  return (
    <div className="container" style={{ paddingTop: "7rem", paddingBottom: "5rem" }}>
      {/* Testnet Billing Notice */}
      <div className="disclaimer-banner" style={{ marginBottom: "2.5rem" }}>
        <div className="disclaimer-icon">
          <AlertCircle style={{ width: "20px", height: "20px", color: "var(--accent-amber)" }} />
        </div>
        <div className="disclaimer-text">
          <strong>Billing Inactive During Testnet MVP:</strong> All ClubVault features, factory deployments,
          and governance tools are <strong>100% free</strong> on the MST Testnet (Chain ID 91562037). No real funds,
          credit cards, or fiat payments are accepted. Commercial pricing tiers represent validated startup hypotheses
          and will only activate post-mainnet launch and audit.
        </div>
      </div>

      {/* Header */}
      <div style={{ textAlign: "center", maxWidth: "780px", margin: "0 auto 3.5rem auto" }}>
        <div
          className="cv-badge cv-badge-crimson"
          style={{ margin: "0 auto 1rem auto" }}
        >
          <Zap style={{ width: "13px", height: "13px" }} />
          <span>Transparent Pricing Model</span>
        </div>
        <h1 style={{ fontSize: "2.75rem", marginBottom: "1rem", color: "var(--text-primary)" }}>
          Predictable Pricing for Shared Finances
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", lineHeight: 1.6 }}>
          Whether you run a college robotics society, a hostel maintenance committee, or a hackathon prize pool,
          ClubVault gives your members cryptographic transparency without hidden fees.
        </p>
      </div>

      {/* Plans Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "2rem",
          marginBottom: "4rem",
        }}
      >
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="glass-panel"
            style={{
              padding: "2.25rem",
              borderRadius: "var(--radius-md)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
              border: plan.featured ? "2px solid var(--accent-crimson)" : "1px solid var(--border-subtle)",
              boxShadow: plan.featured ? "0 10px 40px -10px var(--accent-glow)" : "var(--shadow-card)",
              background: plan.featured ? "var(--bg-card)" : "var(--bg-glass)",
            }}
          >
            {plan.featured && (
              <div
                style={{
                  position: "absolute",
                  top: "-12px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "var(--accent-crimson)",
                  color: "#FFFFFF",
                  padding: "0.25rem 0.85rem",
                  borderRadius: "var(--radius-pill)",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {plan.badge}
              </div>
            )}

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h3 style={{ fontSize: "1.35rem", color: "var(--text-primary)" }}>{plan.name}</h3>
                {!plan.featured && (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      background: "var(--bg-surface-elevated)",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    {plan.badge}
                  </span>
                )}
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1.5rem", minHeight: "2.6rem" }}>
                {plan.tagline}
              </p>

              <div style={{ marginBottom: "1.75rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
                  <span style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                    {plan.price}
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  {plan.billingNote}
                </div>
              </div>

              <div style={{ marginBottom: "2rem" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "1rem", letterSpacing: "0.05em" }}>
                  Included Capabilities:
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {plan.features.map((feat, idx) => (
                    <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                      <Check style={{ width: "16px", height: "16px", color: "var(--accent-emerald)", flexShrink: 0, marginTop: "2px" }} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => onSelectPlan(plan.id)}
              className={plan.featured ? "btn btn-primary" : "btn btn-secondary"}
              style={{ width: "100%", padding: "0.85rem", justifyContent: "center" }}
            >
              <span>{plan.cta}</span>
              <ArrowRight style={{ width: "16px", height: "16px" }} />
            </button>
          </div>
        ))}
      </div>

      {/* Feature Matrix Summary */}
      <div className="glass-panel" style={{ padding: "2.5rem", borderRadius: "var(--radius-md)" }}>
        <h3 style={{ fontSize: "1.4rem", marginBottom: "1.5rem", color: "var(--text-primary)", textAlign: "center" }}>
          Frequently Compared Dimensions
        </h3>
        <div className="tx-table-wrap">
          <table className="tx-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "40%" }}>Capability</th>
                <th style={{ width: "20%" }}>Starter</th>
                <th style={{ width: "20%" }}>Pro Guild</th>
                <th style={{ width: "20%" }}>NGO & Grants</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>Multi-signature Quorum</td>
                <td>Up to 10 members</td>
                <td>Up to 50 members</td>
                <td>Up to 50 members</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>Advance & Receipt Confirmation</td>
                <td>Included</td>
                <td>Included (Custom Timers)</td>
                <td>Included (Public Audit)</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>Accounting Invariant Guarantee</td>
                <td>Full (Smart Contract)</td>
                <td>Full (Smart Contract)</td>
                <td>Full (Smart Contract)</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>Ledger Export</td>
                <td>CSV format</td>
                <td>CSV & Filtered Logs</td>
                <td>CSV + Donor Archive</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>Network Supported</td>
                <td>MST Testnet (91562037)</td>
                <td>MST Testnet (91562037)</td>
                <td>MST Testnet (91562037)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
