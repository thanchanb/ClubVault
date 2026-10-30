import React, { useState } from "react";
import { Mail, MessageSquare, Send, CheckCircle2, GitBranch, ExternalLink, HelpCircle } from "lucide-react";

export const ContactView: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSubmitted(true);
  };

  return (
    <div className="container" style={{ paddingTop: "7rem", paddingBottom: "5rem" }}>
      {/* Header */}
      <div style={{ textAlign: "center", maxWidth: "780px", margin: "0 auto 3.5rem auto" }}>
        <div className="cv-badge cv-badge-crimson" style={{ margin: "0 auto 1rem auto" }}>
          <MessageSquare style={{ width: "13px", height: "13px" }} />
          <span>Get in Touch</span>
        </div>
        <h1 style={{ fontSize: "2.75rem", marginBottom: "1rem", color: "var(--text-primary)" }}>
          Contact & Community Support
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", lineHeight: 1.6 }}>
          Have questions about deploying a vault for your organization, testing on MST Testnet, or collaborating?
          Reach out directly to the core development team.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "2.5rem", maxWidth: "1000px", margin: "0 auto" }}>
        {/* Info Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-panel" style={{ padding: "1.75rem", borderRadius: "var(--radius-md)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(255, 48, 59, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Mail style={{ width: "18px", height: "18px", color: "var(--accent-crimson)" }} />
              </div>
              <h3 style={{ fontSize: "1.15rem", color: "var(--text-primary)" }}>Direct Email Support</h3>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: "0.5rem" }}>
              Reach out for testnet faucet tokens, integration questions, or bug reports:
            </p>
            <a
              href="mailto:support@clubvault.xyz"
              style={{ color: "var(--accent-crimson)", textDecoration: "none", fontWeight: 600, fontSize: "0.95rem" }}
            >
              support@clubvault.xyz
            </a>
          </div>

          <div className="glass-panel" style={{ padding: "1.75rem", borderRadius: "var(--radius-md)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <GitBranch style={{ width: "18px", height: "18px", color: "var(--accent-emerald)" }} />
              </div>
              <h3 style={{ fontSize: "1.15rem", color: "var(--text-primary)" }}>Open Source Development</h3>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: "0.5rem" }}>
              ClubVault smart contracts, tests, and frontend are open-source for community inspection:
            </p>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              github.com/ClubVault/contracts
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="glass-panel" style={{ padding: "2.25rem", borderRadius: "var(--radius-md)" }}>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "2px solid var(--accent-emerald)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.25rem auto",
                }}
              >
                <CheckCircle2 style={{ width: "28px", height: "28px", color: "var(--accent-emerald)" }} />
              </div>
              <h3 style={{ fontSize: "1.4rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                Message Recorded!
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                Thank you, <strong>{name}</strong>. Your inquiry regarding <em>{category}</em> has been submitted to the
                ClubVault developer inbox. We typically reply within 24 hours.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setMessage("");
                }}
                className="btn btn-secondary"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h3 style={{ fontSize: "1.3rem", color: "var(--text-primary)", marginBottom: "1.25rem" }}>
                Send Feedback or Inquiry
              </h3>

              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Alex Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="alex@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Inquiry Category</label>
                <select
                  className="form-control"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="general">General Question</option>
                  <option value="vault_deployment">Help with Vault Setup / Quorum</option>
                  <option value="bug_report">Bug Report / Invariant Query</option>
                  <option value="partnership">Club / NGO Partnership</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea
                  className="form-control"
                  placeholder="Describe your organization, proposal questions, or feedback..."
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                <Send style={{ width: "16px", height: "16px" }} />
                <span>Submit Message</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
