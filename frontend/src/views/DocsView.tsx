import React, { useState } from "react";
import { BookOpen, Key, Shield, FileCheck, Layers, AlertTriangle, Terminal, CheckCircle2, ChevronRight, Copy, Check } from "lucide-react";

export const DocsView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>("getting-started");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const sections = [
    { id: "getting-started", title: "1. Getting Started", icon: BookOpen },
    { id: "network-config", title: "2. Network Configuration", icon: Key },
    { id: "advance-lifecycle", title: "3. Advance & Receipt Workflow", icon: FileCheck },
    { id: "contract-architecture", title: "4. Smart Contract Architecture", icon: Layers },
    { id: "security-boundaries", title: "5. Security & Testnet Limits", icon: Shield },
  ];

  return (
    <div className="container" style={{ paddingTop: "7rem", paddingBottom: "5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "3rem" }}>
        <div className="cv-badge cv-badge-crimson" style={{ marginBottom: "0.75rem" }}>
          <BookOpen style={{ width: "13px", height: "13px" }} />
          <span>Developer & Member Documentation</span>
        </div>
        <h1 style={{ fontSize: "2.5rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          ClubVault Documentation
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem" }}>
          Technical reference, network parameters, smart contract state machines, and member governance guides.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "2.5rem", alignItems: "flex-start" }}>
        {/* Sidebar Nav */}
        <div
          className="glass-panel"
          style={{
            padding: "1.25rem",
            borderRadius: "var(--radius-md)",
            position: "sticky",
            top: "6rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", padding: "0.5rem 0.75rem", letterSpacing: "0.06em" }}>
            Documentation Index
          </div>
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.7rem 0.85rem",
                  borderRadius: "var(--radius-sm)",
                  background: isActive ? "var(--bg-card)" : "transparent",
                  color: isActive ? "var(--accent-crimson)" : "var(--text-secondary)",
                  border: isActive ? "1px solid var(--border-crimson)" : "1px solid transparent",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "var(--transition)",
                }}
              >
                <Icon style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                <span>{sec.title}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="glass-panel" style={{ padding: "2.5rem", borderRadius: "var(--radius-md)" }}>
          {activeSection === "getting-started" && (
            <div>
              <h2 style={{ fontSize: "1.85rem", color: "var(--text-primary)", marginBottom: "1rem" }}>
                1. Getting Started with ClubVault
              </h2>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                ClubVault is a decentralized, non-custodial shared-treasury protocol designed for clubs, college societies,
                hostels, hackathons, and small organizations. Unlike traditional single-sign-on banking apps or personal
                UPI accounts, ClubVault eliminates single points of failure by enforcing multi-signature governance and
                transparent invariant accounting directly on-chain.
              </p>

              <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)", marginTop: "1.75rem", marginBottom: "0.75rem" }}>
                Key Roles & Operational Model
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
                <div style={{ padding: "1.25rem", background: "var(--bg-surface-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                    Authorised Members (1-50)
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Addresses approved at vault initialization or through verified member changes. Each member has exactly 1 vote per proposal.
                  </div>
                </div>
                <div style={{ padding: "1.25rem", background: "var(--bg-surface-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                    Approval Quorum (M-of-N)
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Configurable threshold (e.g. 2 of 3, 3 of 5). No expense can be executed without strictly reaching this affirmative vote count.
                  </div>
                </div>
              </div>

              <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)", marginBottom: "0.75rem" }}>
                Onboarding Step-by-Step
              </h3>
              <ol style={{ paddingLeft: "1.5rem", color: "var(--text-secondary)", lineHeight: 1.8, fontSize: "0.92rem" }}>
                <li>Install an EIP-1193 compatible Web3 wallet (MetaMask, BridgeKey, Coinbase Wallet).</li>
                <li>Add the <strong>MST Testnet</strong> custom network using the parameters in Section 2.</li>
                <li>Acquire testnet tMSTC tokens for gas fees and treasury funding.</li>
                <li>Click <strong>New Vault</strong> in ClubVault to launch a custom instance from the factory.</li>
                <li>Deposit funds, submit spending proposals, and confirm disbursements collaboratively.</li>
              </ol>
            </div>
          )}

          {activeSection === "network-config" && (
            <div>
              <h2 style={{ fontSize: "1.85rem", color: "var(--text-primary)", marginBottom: "1rem" }}>
                2. MST Testnet RPC Configuration
              </h2>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                ClubVault operates on the <strong>MST Testnet</strong>. You must configure your wallet with the following
                parameters to interact with the deployed smart contracts:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
                {[
                  { label: "Network Name", value: "MST Testnet", key: "netname" },
                  { label: "Chain ID", value: "91562037", key: "chainid" },
                  { label: "RPC URL", value: "https://rpc.mstc.io", key: "rpc" },
                  { label: "Currency Symbol", value: "tMSTC", key: "sym" },
                  { label: "Block Explorer URL", value: "https://scan.mstc.io", key: "scan" },
                ].map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.85rem 1.15rem",
                      background: "var(--bg-surface-elevated)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div>
                      <span style={{ color: "var(--text-muted)", marginRight: "1rem" }}>{item.label}:</span>
                      <strong style={{ color: "var(--text-primary)" }}>{item.value}</strong>
                    </div>
                    <button
                      onClick={() => copyToClipboard(item.value, item.key)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: copiedField === item.key ? "var(--accent-emerald)" : "var(--text-muted)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        fontSize: "0.78rem",
                      }}
                    >
                      {copiedField === item.key ? <Check style={{ width: "14px", height: "14px" }} /> : <Copy style={{ width: "14px", height: "14px" }} />}
                      <span>{copiedField === item.key ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="disclaimer-banner">
                <div className="disclaimer-icon">
                  <Terminal style={{ width: "20px", height: "20px", color: "var(--accent-amber)" }} />
                </div>
                <div className="disclaimer-text">
                  <strong>Automated Wallet Network Switching:</strong> Clicking the network pill in the ClubVault navbar
                  automatically prompts <code>wallet_addEthereumChain</code> / <code>wallet_switchEthereumChain</code> so you
                  do not have to enter these values manually in MetaMask.
                </div>
              </div>
            </div>
          )}

          {activeSection === "advance-lifecycle" && (
            <div>
              <h2 style={{ fontSize: "1.85rem", color: "var(--text-primary)", marginBottom: "1rem" }}>
                3. The 5-Step Advance & Receipt Lifecycle
              </h2>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                The signature differentiator of ClubVault is the <strong>Advance-Payment with Cryptographic Receipt Confirmation</strong> flow.
                Clubs frequently need cash in advance to purchase equipment, groceries, or event tickets, but traditionally struggle
                with delayed receipts and lost invoices.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "2rem" }}>
                {[
                  {
                    step: "Step 1",
                    title: "Proposal Creation",
                    desc: "A member submits an Advance Proposal with an amount, recipient address, description, and receipt grace period (1 hr to 90 days).",
                  },
                  {
                    step: "Step 2",
                    title: "Member Voting & Quorum Check",
                    desc: "Authorized members review the proposal. Once affirmative votes reach quorum, funds transition from available to reserved.",
                  },
                  {
                    step: "Step 3",
                    title: "Advance Disbursement",
                    desc: "The contract releases the advance directly to the recipient wallet. The receipt deadline clock begins ticking on-chain.",
                  },
                  {
                    step: "Step 4",
                    title: "Receipt Hash Upload",
                    desc: "Recipient uploads the invoice/receipt in the UI. The browser computes its SHA-256 hash client-side and registers it on-chain.",
                  },
                  {
                    step: "Step 5",
                    title: "Social Consensus Confirmation or Dispute",
                    desc: "Members review the invoice file. If approved by quorum, the advance settles. If rejected or timed out, the recipient is flagged in default.",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "1.25rem",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      borderLeft: "3px solid var(--accent-crimson)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent-crimson)", fontWeight: 700 }}>
                        {item.step}
                      </span>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{item.title}</span>
                    </div>
                    <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "contract-architecture" && (
            <div>
              <h2 style={{ fontSize: "1.85rem", color: "var(--text-primary)", marginBottom: "1rem" }}>
                4. Smart Contract Architecture
              </h2>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                ClubVault utilizes a two-tier smart contract architecture written in Solidity 0.8.28 with OpenZeppelin security contracts:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "2rem" }}>
                <div style={{ padding: "1.5rem", background: "var(--bg-surface-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <h3 style={{ fontSize: "1.15rem", color: "var(--text-primary)" }}>ClubVault.sol</h3>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent-emerald)" }}>OpenZeppelin ReentrancyGuard</span>
                  </div>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "0.75rem" }}>
                    The treasury contract holding pooled native tMSTC funds. Manages proposal state transitions, membership checks,
                    deposit routing, and disbursement execution.
                  </p>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", background: "var(--bg-primary)", padding: "0.75rem", borderRadius: "4px", color: "var(--accent-emerald)" }}>
                    Invariant Rule: address(this).balance == availableFunds + reservedFunds
                  </div>
                </div>

                <div style={{ padding: "1.5rem", background: "var(--bg-surface-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <h3 style={{ fontSize: "1.15rem", color: "var(--text-primary)" }}>VaultFactory.sol</h3>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--accent-crimson)" }}>Registry & Deployer</span>
                  </div>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    Factory deployer that instantiates new <code>ClubVault</code> instances with specified initial members and quorum.
                    Maintains an on-chain registry mapping user addresses to all vaults they belong to.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "security-boundaries" && (
            <div>
              <h2 style={{ fontSize: "1.85rem", color: "var(--text-primary)", marginBottom: "1rem" }}>
                5. Security & Testnet Boundaries
              </h2>
              <div className="disclaimer-banner" style={{ marginBottom: "1.5rem" }}>
                <div className="disclaimer-icon">
                  <AlertTriangle style={{ width: "20px", height: "20px", color: "var(--accent-amber)" }} />
                </div>
                <div className="disclaimer-text">
                  <strong>Important Security Boundary:</strong> The cryptographic receipt hash recorded on-chain proves
                  that the file uploaded matches the hash. It is a <strong>social consensus verification tool</strong>,
                  not an automated proof that physical goods were purchased. Members must review receipt details before voting.
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.92rem" }}>
                <p>
                  • <strong>Non-Custodial Design:</strong> Neither ClubVault developers nor any central server has custody over your vault funds.
                  Only the on-chain smart contract holds treasury funds, released exclusively upon quorum confirmation.
                </p>
                <p>
                  • <strong>Reentrancy Guard:</strong> All disbursements use the Checks-Effects-Interactions pattern wrapped in OpenZeppelin's
                  <code>ReentrancyGuard</code>, verified against malicious callback contracts in the automated test suite.
                </p>
                <p>
                  • <strong>Testnet Status:</strong> ClubVault is currently deployed on the MST Testnet for hackathon and developer preview.
                  Contracts have not been audited by third-party audit firms for mainnet production funds. Do not send real mainnet assets.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
