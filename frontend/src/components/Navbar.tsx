import React, { useState, useEffect } from "react";
import { Wallet, Sparkles, Sun, Moon, ArrowRight, LayoutDashboard, RotateCcw, Menu, X, RefreshCw, Rocket } from "lucide-react";

interface NavbarProps {
  account: string | null;
  accountBalance: string;
  isCorrectNetwork: boolean;
  onConnectWallet: () => void;
  onOpenAccountModal?: () => void;
  onSwitchNetwork: () => void;
  isConnecting?: boolean;
  activeSection?: string;
  onNavigateSection?: (sectionId: string) => void;
  onOpenFactoryModal?: () => void;
  onOpenMainnetModal?: () => void;
  currentRoute?: string;
  onNavigateRoute?: (route: string) => void;
  currencySymbol?: string;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  accountBalance,
  currencySymbol = "MSTC",
  isCorrectNetwork,
  onConnectWallet,
  onOpenAccountModal,
  onSwitchNetwork,
  isConnecting = false,
  activeSection = "overview",
  onNavigateSection,
  onOpenFactoryModal,
  onOpenMainnetModal,
  currentRoute = "home",
  onNavigateRoute,
  theme = "dark",
  onToggleTheme,
  onRefresh,
  isRefreshing = false,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Unified Navigation Links
  const navItems = [
    { id: "home", label: "Overview" },
    { id: "treasury", label: "Treasury" },
    { id: "proposals", label: "Proposals" },
    { id: "pricing", label: "Pricing" },
    { id: "docs", label: "Docs" },
    { id: "security", label: "Security" },
    { id: "faq", label: "FAQ" },
    { id: "contact", label: "Contact" },
  ];

  const handleNavClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (id === "home") {
      if (onNavigateRoute) onNavigateRoute("home");
      if (onNavigateSection) onNavigateSection("overview");
      return;
    }
    if (["pricing", "docs", "security", "faq", "contact"].includes(id)) {
      if (onNavigateRoute) onNavigateRoute(id);
      return;
    }
    // Section scrolling (treasury, proposals, transactions)
    if (currentRoute !== "home" && onNavigateRoute) {
      onNavigateRoute("home");
    }
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
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            if (currentRoute === "home" && (window.location.hash === "" || window.location.hash === "#home" || window.location.hash === "#overview")) {
              window.scrollTo({ top: 0, behavior: "smooth" });
              return;
            }
            if (onNavigateRoute) onNavigateRoute("home");
            if (onNavigateSection) onNavigateSection("overview");
          }}
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

        {/* Center Nav Links */}
        <nav className="cv-nav-links">
          {navItems.map((item) => {
            const isActive =
              currentRoute === item.id ||
              (currentRoute === "home" && (activeSection === item.id || (item.id === "home" && activeSection === "overview")));
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

        {/* Right Actions: Theme, Complete Reload, App CTA, Network & Wallet */}
        <div className="cv-nav-actions">
          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="btn btn-secondary"
              style={{
                padding: "0.5rem",
                borderRadius: "var(--radius-pill)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
              }}
              title={`Switch to ${theme === "dark" ? "Light Fintech" : "Dark Metallic"} theme`}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun style={{ width: "16px", height: "16px", color: "var(--accent-amber)" }} />
              ) : (
                <Moon style={{ width: "16px", height: "16px", color: "var(--accent-crimson)" }} />
              )}
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={onRefresh ? onRefresh : () => {
              window.location.href = window.location.origin + window.location.pathname;
              window.location.reload();
            }}
            className="btn btn-secondary"
            style={{
              padding: "0.5rem",
              borderRadius: "var(--radius-pill)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              cursor: isRefreshing ? "wait" : "pointer",
            }}
            title="Refresh on-chain data and return to Overview"
            aria-label="Refresh data"
            disabled={isRefreshing}
          >
            <RotateCcw
              style={{
                width: "15px",
                height: "15px",
                color: "var(--text-secondary)",
                animation: isRefreshing ? "spin 1s linear infinite" : undefined,
              }}
            />
          </button>

          {/* New Vault Button */}
          {onOpenFactoryModal && (
            <button
              onClick={onOpenFactoryModal}
              className="btn btn-secondary"
              style={{ padding: "0.45rem 0.75rem", fontSize: "0.78rem", whiteSpace: "nowrap", flexShrink: 0 }}
              title="Deploy New Club Treasury"
            >
              <Sparkles style={{ width: "13px", height: "13px", color: "var(--accent-crimson)" }} />
              <span className="cv-btn-label-collapse">New Vault</span>
            </button>
          )}

          {/* Mainnet Production Deployment Button */}
          {onOpenMainnetModal && (
            <button
              id="btn-deploy-mainnet"
              onClick={onOpenMainnetModal}
              className="btn btn-secondary"
              style={{
                padding: "0.45rem 0.85rem",
                fontSize: "0.82rem",
                whiteSpace: "nowrap",
                flexShrink: 0,
                background: "linear-gradient(135deg, rgba(255, 48, 59, 0.25) 0%, rgba(245, 158, 11, 0.25) 100%)",
                border: "1.5px solid rgba(255, 48, 59, 0.6)",
                color: "#FFFFFF",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                boxShadow: "0 0 12px rgba(255, 48, 59, 0.25)",
              }}
              title="MST Mainnet Production Deployment (BridgeKey)"
            >
              <Rocket style={{ width: "14px", height: "14px", color: "var(--accent-crimson)" }} />
              <span>Deploy Mainnet</span>
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
              <span className="cv-btn-label-collapse">{isCorrectNetwork ? "MST Testnet" : "Switch Network"}</span>
            </button>
          )}

          {/* Wallet Button */}
          {account ? (
            <button
              onClick={onOpenAccountModal || onConnectWallet}
              className="cv-wallet-badge"
              title={`BridgeKey Account: ${account}\nBalance: ${accountBalance} tMSTC\nClick to view Keycard or disconnect`}
              aria-label="BridgeKey Wallet Account"
            >
              <div
                className="cv-wallet-dot"
                style={{
                  background: isCorrectNetwork ? "var(--accent-emerald)" : "var(--accent-amber)",
                  boxShadow: isCorrectNetwork ? "0 0 8px var(--accent-emerald)" : "0 0 8px var(--accent-amber)",
                }}
              />
              <Wallet style={{ width: "13px", height: "13px", color: "var(--accent-crimson)", flexShrink: 0 }} />
              <span className="cv-wallet-addr">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
              <span className="cv-wallet-balance">{accountBalance} {currencySymbol}</span>
            </button>
          ) : (
            <button
              onClick={onConnectWallet}
              className="btn btn-primary cv-connect-btn"
              id="navbar-btn-connect-wallet"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <RefreshCw style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                  <span>Connecting to BridgeKey...</span>
                </>
              ) : (
                <>
                  <Wallet style={{ width: "15px", height: "15px", flexShrink: 0 }} />
                  <span>Connect Wallet</span>
                </>
              )}
            </button>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn btn-secondary cv-mobile-menu-btn"
            style={{
              padding: "0.5rem",
              borderRadius: "var(--radius-pill)",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
            }}
            aria-label="Toggle mobile navigation"
          >
            {mobileMenuOpen ? <X style={{ width: "18px", height: "18px" }} /> : <Menu style={{ width: "18px", height: "18px" }} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div
          className="cv-mobile-nav"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "rgba(10, 11, 15, 0.98)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--border-subtle)",
            padding: "1rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
          }}
        >
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                handleNavClick(e, item.id);
                setMobileMenuOpen(false);
              }}
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.95rem",
                color: currentRoute === item.id ? "var(--accent-crimson)" : "var(--text-secondary)",
                fontWeight: currentRoute === item.id ? 700 : 500,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: currentRoute === item.id ? "rgba(255, 48, 59, 0.08)" : "transparent",
              }}
            >
              <span>{item.label}</span>
              <ArrowRight style={{ width: "14px", height: "14px", opacity: 0.5 }} />
            </a>
          ))}
        </div>
      )}
    </header>
  );
};
