import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, Sparkles, MessageSquare } from "lucide-react";

export const FAQView: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "What is ClubVault and how does it differ from a shared Google Sheet or UPI group?",
      a: "A shared Google Sheet or personal UPI account relies entirely on trust in a single individual. If a treasurer leaves, loses access, or spends money without permission, group members have zero recourse. ClubVault uses decentralized smart-contract multi-signature escrow: treasury money cannot move without member quorum approval, every transaction is cryptographically recorded, and advances require receipt confirmation before settlement.",
    },
    {
      q: "Do members need cryptocurrency or blockchain knowledge to participate?",
      a: "ClubVault is designed with plain-language fintech ergonomics. While transactions currently execute on the EVM-based MST Testnet, our roadmap (Phase 4) includes email and social sign-in with non-custodial account abstraction. Even today, members interact with human-readable governance rules: 'Requires 2 of 3 votes to release 2.0 tMSTC'.",
    },
    {
      q: "What does the cryptographic receipt hash actually prove?",
      a: "This is a critical architectural distinction: uploading a receipt computes a client-side SHA-256 hash that is stored immutably on-chain. This proves file integrity (that the receipt document was not altered after submission). It does NOT automatically verify that the off-chain physical transaction took place. Social consensus among authorized club members is required to inspect the invoice and vote to confirm or dispute the purchase.",
    },
    {
      q: "What happens if a recipient does not submit their receipt on time?",
      a: "Every advance payment proposal includes an on-chain receipt grace period (from 1 hour up to 90 days). If the receipt deadline expires without an approved receipt submission, the smart contract transitions the proposal status to RECEIPT_DEFAULTED and flags the recipient address, preventing further advances until the funds are settled or repaid.",
    },
    {
      q: "What are tMSTC tokens and how much does it cost to use ClubVault?",
      a: "tMSTC is the native test token of the MST Testnet. During our hackathon and testnet beta phase, all vaults, proposals, and transactions use free testnet tokens. We do not charge protocol fees or subscription fees during this MVP stage.",
    },
    {
      q: "Can a single club administrator or owner withdraw treasury funds unilaterally?",
      a: "No. ClubVault smart contracts have no privileged 'owner-sweep' or backdoor withdrawal functions. Even the contract deployer cannot extract funds without submitting a proposal and receiving the required threshold of affirmative votes from designated members.",
    },
    {
      q: "What happens if someone sends unsolicited tokens directly to the vault?",
      a: "ClubVault implements a Solidity receive() external payable function that automatically routes incoming funds into Available Funds. The core contract invariant address(this).balance == availableFunds + reservedFunds is always preserved.",
    },
    {
      q: "Is ClubVault ready for real-money mainnet production use?",
      a: "No. ClubVault is currently in Phase 2 Testnet MVP status on the MST Testnet (Chain ID 91562037). While contracts have been tested extensively with 26 unit and invariant test suites, they have not undergone an external third-party audit. Mainnet deployment will occur only after security audits and legal compliance reviews.",
    },
  ];

  return (
    <div className="container" style={{ paddingTop: "7rem", paddingBottom: "5rem" }}>
      {/* Header */}
      <div style={{ textAlign: "center", maxWidth: "780px", margin: "0 auto 3.5rem auto" }}>
        <div className="cv-badge cv-badge-crimson" style={{ margin: "0 auto 1rem auto" }}>
          <HelpCircle style={{ width: "13px", height: "13px" }} />
          <span>Common Questions & Answers</span>
        </div>
        <h1 style={{ fontSize: "2.75rem", marginBottom: "1rem", color: "var(--text-primary)" }}>
          Frequently Asked Questions
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", lineHeight: 1.6 }}>
          Everything you need to know about multisig treasuries, advance payments, receipt verification, and testnet limits.
        </p>
      </div>

      {/* Accordion */}
      <div style={{ maxWidth: "840px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="glass-panel"
              style={{
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                border: isOpen ? "1px solid var(--border-crimson)" : "1px solid var(--border-subtle)",
                transition: "var(--transition)",
              }}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                style={{
                  width: "100%",
                  padding: "1.25rem 1.5rem",
                  background: "transparent",
                  border: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  textAlign: "left",
                  gap: "1rem",
                }}
              >
                <span
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    color: isOpen ? "var(--accent-crimson)" : "var(--text-primary)",
                    fontFamily: "var(--font-heading)",
                  }}
                >
                  {faq.q}
                </span>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "var(--bg-surface-elevated)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "var(--text-muted)",
                  }}
                >
                  {isOpen ? <ChevronUp style={{ width: "16px", height: "16px" }} /> : <ChevronDown style={{ width: "16px", height: "16px" }} />}
                </div>
              </button>

              {isOpen && (
                <div
                  style={{
                    padding: "0 1.5rem 1.5rem 1.5rem",
                    color: "var(--text-secondary)",
                    fontSize: "0.92rem",
                    lineHeight: 1.7,
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: "1rem",
                  }}
                >
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
