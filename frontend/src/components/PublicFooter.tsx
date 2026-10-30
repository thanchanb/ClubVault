import React from "react";
import { ShieldCheck, ExternalLink, Heart } from "lucide-react";

interface PublicFooterProps {
  onNavigate: (route: string) => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ onNavigate }) => {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border-subtle)",
        background: "var(--bg-secondary)",
        padding: "4rem 2rem 2.5rem 2rem",
        marginTop: "4rem",
      }}
    >
      <div className="container" style={{ padding: 0 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "2.5rem",
            marginBottom: "3.5rem",
          }}
        >
          {/* Brand Col */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "1px solid rgba(255, 48, 59, 0.4)",
                }}
              >
                <img src="/clubvault-emblem.jpg" alt="ClubVault" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
                Club<span style={{ color: "var(--accent-crimson)" }}>Vault</span>
              </div>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.86rem", lineHeight: 1.6, marginBottom: "1.25rem" }}>
              Decentralized, non-custodial treasury protocol for clubs, student societies, hostels, and non-profits.
              Shared money. Clear decisions.
            </p>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--accent-emerald)",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-emerald)" }} />
              <span>MST Testnet (Chain ID 91562037)</span>
            </div>
          </div>

          {/* Product Col */}
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-primary)", marginBottom: "1.25rem", letterSpacing: "0.05em" }}>
              Product & Protocol
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.88rem" }}>
              <li>
                <a href="#how-it-works" onClick={(e) => { e.preventDefault(); onNavigate("home"); }} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
                  How It Works
                </a>
              </li>
              <li>
                <a href="#templates" onClick={(e) => { e.preventDefault(); onNavigate("templates"); }} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
                  Organisation Templates
                </a>
              </li>
              <li>
                <a href="#pricing" onClick={(e) => { e.preventDefault(); onNavigate("pricing"); }} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
                  Pricing Hypotheses
                </a>
              </li>
              <li>
                <a href="#app" onClick={(e) => { e.preventDefault(); onNavigate("app"); }} style={{ color: "var(--accent-crimson)", textDecoration: "none", fontWeight: 600 }}>
                  Launch Application →
                </a>
              </li>
            </ul>
          </div>

          {/* Docs & Trust Col */}
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-primary)", marginBottom: "1.25rem", letterSpacing: "0.05em" }}>
              Documentation & Trust
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.88rem" }}>
              <li>
                <a href="#docs" onClick={(e) => { e.preventDefault(); onNavigate("docs"); }} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
                  Protocol Documentation
                </a>
              </li>
              <li>
                <a href="#security" onClick={(e) => { e.preventDefault(); onNavigate("security"); }} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
                  Security & Invariant Proofs
                </a>
              </li>
              <li>
                <a href="#faq" onClick={(e) => { e.preventDefault(); onNavigate("faq"); }} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
                  Frequently Asked Questions
                </a>
              </li>
              <li>
                <a href="#contact" onClick={(e) => { e.preventDefault(); onNavigate("contact"); }} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
                  Developer Contact & Feedback
                </a>
              </li>
            </ul>
          </div>

          {/* Network & Legal Col */}
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-primary)", marginBottom: "1.25rem", letterSpacing: "0.05em" }}>
              Network & Disclaimers
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", lineHeight: 1.6, marginBottom: "1rem" }}>
              ClubVault is an open-source testnet deployment for hackathon evaluation and demonstration. It is not an audited production financial institution.
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <a
                href="https://scan.mstc.io"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.78rem",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                }}
              >
                <ExternalLink style={{ width: "13px", height: "13px" }} />
                <span>MST Explorer</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: "1.75rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
          }}
        >
          <div>
            © {new Date().getFullYear()} ClubVault Protocol. Open-source under MIT License.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>Non-custodial shared finances on MST Testnet</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
