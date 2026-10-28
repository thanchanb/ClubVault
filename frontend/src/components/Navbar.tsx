import React, { useState, useEffect } from "react";
import { Wallet, Sparkles } from "lucide-react";

interface NavbarProps {
  account: string | null;
  accountBalance: string;
  isCorrectNetwork: boolean;
  onConnectWallet: () => void;
  onSwitchNetwork: () => void;
  activeSection?: string;
  onNavigateSection?: (sectionId: string) => void;
  onOpenFactoryModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  accountBalance,
  isCorrectNetwork,
  onConnectWallet,
  onSwitchNetwork,
  activeSection = "overview",
  onNavigateSection,
  onOpenFactoryModal,
}) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { id: "overview", label: "Overview" },
    { id: "how-it-works", label: "How It Works" },
    { id: "treasury", label: "Treasury" },
    { id: "proposals", label: "Proposals" },
    { id: "transactions", label: "Transactions" },
  ];

  const handleNavClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (onNavigateSection) {
      onNavigateSection(id);
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const truncatedAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null;

  return (
    <header className={`cv-navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="cv-nav-inner">
        {/* Brand */}
        <a
          href="#overview"
          onClick={(e) => handleNavClick(e, "overview")}
          className="cv-brand"
        >
          <div className="cv-brand-emblem">
            <img
              src="/clubvault-emblem.jpg"
              alt="ClubVault Emblem"
            />
          </div>

          <div className="cv-brand-text">
            <div className="cv-brand-title">
              <span>Club</span>
              <span className="cv-brand-accent">Vault</span>
              <span className="cv-network-tag">MST</span>
            </div>
            <span className="cv-brand-sub">
              Decentralized Treasury
            </span>
          </div>
        </a>

        {/* Center Nav Items */}
        <nav className="cv-nav-links">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => handleNavClick(e, item.id)}
                className={`cv-nav-link ${isActive ? "active" : ""}`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Right Actions: Network & Wallet */}
        <div className="cv-nav-actions">
          {onOpenFactoryModal && (
            <button
              onClick={onOpenFactoryModal}
              className="btn btn-secondary"
              style={{ padding: "0.5rem 0.9rem", fontSize: "0.8rem" }}
              title="Deploy New Club Treasury"
            >
              <Sparkles style={{ width: "14px", height: "14px", color: "var(--accent-crimson)" }} />
              <span>New Vault</span>
            </button>
          )}

          {/* Network Indicator */}
          {account && (
            <button
              onClick={onSwitchNetwork}
              className="network-badge"
              style={{
                borderColor: isCorrectNetwork ? "var(--border-subtle)" : "rgba(245, 158, 11, 0.4)",
                color: isCorrectNetwork ? "var(--text-secondary)" : "var(--accent-amber)",
              }}
              title={
                isCorrectNetwork
                  ? "Connected to MST Testnet (Chain ID 91562037)"
                  : "Wrong network! Click to switch to MST Testnet"
              }
            >
              <span
                className="network-dot"
                style={{
                  background: isCorrectNetwork ? "var(--accent-emerald)" : "var(--accent-amber)",
                  boxShadow: isCorrectNetwork ? "0 0 8px var(--accent-emerald)" : "0 0 8px var(--accent-amber)",
                }}
              />
              <span>{isCorrectNetwork ? "MST Testnet" : "Switch Network"}</span>
            </button>
          )}

          {/* Wallet Button */}
          {account ? (
            <div
              className="network-badge"
              style={{
                borderColor: "rgba(255, 48, 59, 0.3)",
                background: "#0D0E12",
              }}
            >
              <Wallet style={{ width: "14px", height: "14px", color: "var(--accent-crimson)" }} />
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{truncatedAddress}</span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>({accountBalance} tMSTC)</span>
            </div>
          ) : (
            <button
              onClick={onConnectWallet}
              className="btn btn-primary"
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem" }}
            >
              <Wallet style={{ width: "16px", height: "16px" }} />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
