import React, { useRef, useState, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import {
  ShieldCheck,
  Users,
  ArrowRight,
  Lock,
  Unlock,
  ChevronDown,
  Sparkles,
  Search,
  FileCheck,
} from "lucide-react";

interface VaultHeroExperienceProps {
  vaultBalance: string;
  availableFunds: string;
  reservedFunds: string;
  unconfirmedAdvances: string;
  membersCount: number;
  requiredApprovals: number;
  onExploreClick: () => void;
  onConnectWallet: () => void;
  account: string | null;
}

export const VaultHeroExperience: React.FC<VaultHeroExperienceProps> = ({
  vaultBalance,
  availableFunds,
  reservedFunds,
  unconfirmedAdvances,
  membersCount,
  requiredApprovals,
  onExploreClick,
  onConnectWallet,
  account,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeBeat, setActiveBeat] = useState<number>(0);

  // Scroll tracking across the 400vh storytelling track
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    restDelta: 0.001,
  });

  // Track beat changes for progress dots
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      if (latest < 0.18) setActiveBeat(0);
      else if (latest < 0.38) setActiveBeat(1);
      else if (latest < 0.58) setActiveBeat(2);
      else if (latest < 0.78) setActiveBeat(3);
      else if (latest < 0.92) setActiveBeat(4);
      else setActiveBeat(5);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  // Emblem 3D transforms based on scroll
  const emblemScale = useTransform(smoothProgress, [0, 0.2, 0.45, 0.7, 0.9, 1], [1, 1.15, 0.95, 0.9, 0.95, 1.05]);
  const emblemRotateZ = useTransform(smoothProgress, [0, 0.25, 0.5, 0.75, 1], [0, 15, -10, 20, 0]);
  const emblemRotateY = useTransform(smoothProgress, [0, 0.3, 0.6, 1], [-5, 12, -10, 0]);
  const emblemOpacity = useTransform(smoothProgress, [0, 0.1, 0.85, 1], [1, 1, 0.95, 1]);

  // Story beats definitions
  const beats = [
    { id: 0, title: "Overview" },
    { id: 1, title: "Governance" },
    { id: 2, title: "Treasury" },
    { id: 3, title: "Execution" },
    { id: 4, title: "Verification" },
    { id: 5, title: "Launch" },
  ];

  const scrollToBeat = (beatIndex: number) => {
    if (!containerRef.current) return;
    const containerTop = containerRef.current.offsetTop;
    const totalHeight = containerRef.current.offsetHeight - window.innerHeight;
    const targetScroll = containerTop + (totalHeight * (beatIndex / (beats.length - 1)));
    window.scrollTo({ top: targetScroll, behavior: "smooth" });
  };

  return (
    <div
      ref={containerRef}
      id="overview"
      className="cv-hero-track"
    >
      {/* Sticky Viewport Stage */}
      <div className="cv-hero-viewport">
        {/* Ambient Top & Bottom Glows */}
        <div className="cv-ambient-top" />
        <div className="cv-ambient-bottom" />

        {/* Floating Story Beat Indicators (Right Side) */}
        <div className="cv-beat-nav">
          {beats.map((beat) => (
            <button
              key={beat.id}
              onClick={() => scrollToBeat(beat.id)}
              className={`cv-beat-item ${activeBeat === beat.id ? "active" : ""}`}
            >
              <span className="cv-beat-label">{beat.title}</span>
              <div className="cv-beat-dot" />
            </button>
          ))}
        </div>

        {/* Central 3D Vault Emblem Stage (Seamlessly Blended on Right Side) */}
        <div className="cv-emblem-stage">
          <motion.div
            style={{
              scale: emblemScale,
              rotateZ: emblemRotateZ,
              rotateY: emblemRotateY,
              opacity: emblemOpacity,
              perspective: 1200,
            }}
            className="cv-emblem-wrap"
          >
            {/* Soft Shadow Base */}
            <div className="cv-emblem-shadow" />

            {/* Authentic ClubVault 3D C-Emblem Image */}
            <img
              src="/clubvault-emblem.jpg"
              alt="ClubVault 3D Metallic Emblem"
              className="cv-emblem-img"
            />
          </motion.div>
        </div>

        {/* Narrative Content Overlay */}
        <div className="cv-narrative-container">
          {/* Top Status Capsule */}
          <div className="cv-stage-top">
            <div className="cv-stage-pill">
              <span className="cv-stage-pill-dot" />
              <span>MST Blockchain Invariant Engine</span>
            </div>

            <div
              className="cv-stage-pill"
              style={{ background: "rgba(255, 255, 255, 0.03)", color: "var(--text-muted)" }}
            >
              <span>Scroll to explore</span>
              <ChevronDown style={{ width: "14px", height: "14px", color: "var(--accent-crimson)" }} />
            </div>
          </div>

          {/* Central Beat Story Content */}
          <div className="cv-hero-content">
            {/* BEAT 0: HERO (0 - 18%) */}
            <AnimatePresence mode="wait">
              {activeBeat === 0 && (
                <motion.div
                  key="beat-0"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.45 }}
                  style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
                >
                  <div className="cv-badge cv-badge-crimson">
                    <Sparkles style={{ width: "14px", height: "14px" }} />
                    <span>NEXT-GEN TREASURY GOVERNANCE</span>
                  </div>

                  <h1 className="cv-hero-heading">
                    Transparent <br />
                    <span className="text-gradient-crimson">Club Funds.</span>
                    <br />
                    <span>Member-Approved</span>{" "}
                    <span style={{ color: "var(--accent-crimson)" }}>Spending.</span>
                  </h1>

                  <p className="cv-hero-desc">
                    Manage club expenses through transparent proposals, member
                    voting, and verifiable blockchain transactions on MST
                    Blockchain.
                  </p>

                  <div className="cv-hero-actions">
                    <button
                      onClick={onExploreClick}
                      className="btn btn-primary"
                    >
                      <span>Explore ClubVault</span>
                      <ArrowRight style={{ width: "16px", height: "16px" }} />
                    </button>

                    <button
                      onClick={() => scrollToBeat(1)}
                      className="btn btn-secondary"
                    >
                      <span>How It Works</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* BEAT 1: GOVERNANCE REVEAL (18 - 38%) */}
              {activeBeat === 1 && (
                <motion.div
                  key="beat-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.45 }}
                  style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
                >
                  <div className="cv-badge cv-badge-neutral">
                    <Users style={{ width: "14px", height: "14px", color: "var(--accent-crimson)" }} />
                    <span>BOUNDED MULTI-MEMBER CONSENSUS</span>
                  </div>

                  <h2 className="cv-hero-heading" style={{ fontSize: "2.75rem" }}>
                    Every decision <br />
                    <span className="text-gradient-crimson">
                      has a transparent process.
                    </span>
                  </h2>

                  <p className="cv-hero-desc">
                    Authorized members propose expenses, review requests, and
                    vote according to the club's configured approval rules.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.85rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    <div className="glass-panel" style={{ padding: "0.9rem 1.1rem" }}>
                      <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        MEMBER PERMISSIONS
                      </div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                        Restricted to {membersCount} Wallets
                      </div>
                    </div>

                    <div className="glass-panel" style={{ padding: "0.9rem 1.1rem" }}>
                      <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        APPROVAL THRESHOLD
                      </div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-crimson)", marginTop: "2px" }}>
                        {requiredApprovals} of {membersCount} Votes Required
                      </div>
                    </div>

                    <div className="glass-panel" style={{ padding: "0.9rem 1.1rem" }}>
                      <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        EXPENSE PROPOSALS
                      </div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                        Standard & Advances
                      </div>
                    </div>

                    <div className="glass-panel" style={{ padding: "0.9rem 1.1rem" }}>
                      <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        VOTING LEDGER
                      </div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "2px" }}>
                        100% On-Chain Verifiable
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* BEAT 2: TREASURY ACCOUNTING (38 - 58%) */}
              {activeBeat === 2 && (
                <motion.div
                  key="beat-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.45 }}
                  style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
                >
                  <div className="cv-badge cv-badge-emerald">
                    <ShieldCheck style={{ width: "14px", height: "14px" }} />
                    <span>INVARIANT-PRESERVING ACCOUNTING</span>
                  </div>

                  <h2 className="cv-hero-heading" style={{ fontSize: "2.75rem" }}>
                    Your treasury. <br />
                    <span className="text-gradient-crimson">
                      Clearly accounted for.
                    </span>
                  </h2>

                  <p className="cv-hero-desc">
                    View treasury balances, active proposals, pending approvals,
                    and recent transactions in one place. No hidden debits or
                    unapproved withdrawals.
                  </p>

                  <div
                    className="glass-panel"
                    style={{
                      padding: "1.25rem 1.5rem",
                      border: "1px solid rgba(255, 48, 59, 0.35)",
                      marginTop: "0.5rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        LIVE CONTRACT BALANCE
                      </span>
                      <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--accent-emerald)" }}>
                        Synchronized
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", paddingTop: "0.75rem" }}>
                      <span style={{ fontSize: "2.25rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                        {vaultBalance}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--accent-crimson)", fontWeight: 700 }}>
                        tMSTC
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", paddingTop: "0.75rem", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
                      <div>Available: <strong style={{ color: "var(--accent-emerald)" }}>{availableFunds} tMSTC</strong></div>
                      <div>Locked: <strong style={{ color: "var(--accent-amber)" }}>{reservedFunds} tMSTC</strong></div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* BEAT 3: APPROVAL AND EXECUTION (58 - 78%) */}
              {activeBeat === 3 && (
                <motion.div
                  key="beat-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.45 }}
                  style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
                >
                  <div className="cv-badge cv-badge-crimson">
                    <Lock style={{ width: "14px", height: "14px" }} />
                    <span>SMART CONTRACT ENFORCEMENT</span>
                  </div>

                  <h2 className="cv-hero-heading" style={{ fontSize: "2.75rem" }}>
                    Approve first. <br />
                    <span className="text-gradient-crimson">
                      Execute by rule.
                    </span>
                  </h2>

                  <p className="cv-hero-desc">
                    Smart-contract rules enforce the required approvals before
                    authorized payments can be executed. Approved payments reserve funds
                    to prevent conflicting allocations under the contract's accounting rules.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      marginTop: "0.5rem",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.75rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: "1 1 70px", minWidth: "65px", padding: "0.6rem 0.4rem", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                      <span style={{ color: "var(--accent-crimson)", display: "block", fontWeight: 700 }}>01</span>
                      <span>Propose</span>
                    </div>
                    <ArrowRight style={{ width: "12px", height: "12px", color: "var(--text-muted)", flexShrink: 0 }} />
                    <div style={{ flex: "1 1 70px", minWidth: "65px", padding: "0.6rem 0.4rem", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                      <span style={{ color: "var(--accent-crimson)", display: "block", fontWeight: 700 }}>02</span>
                      <span>Vote</span>
                    </div>
                    <ArrowRight style={{ width: "12px", height: "12px", color: "var(--text-muted)", flexShrink: 0 }} />
                    <div style={{ flex: "1 1 70px", minWidth: "65px", padding: "0.6rem 0.4rem", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                      <span style={{ color: "var(--accent-emerald)", display: "block", fontWeight: 700 }}>03</span>
                      <span>Validate</span>
                    </div>
                    <ArrowRight style={{ width: "12px", height: "12px", color: "var(--text-muted)", flexShrink: 0 }} />
                    <div style={{ flex: "1 1 70px", minWidth: "65px", padding: "0.6rem 0.4rem", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                      <span style={{ color: "var(--accent-emerald)", display: "block", fontWeight: 700 }}>04</span>
                      <span>Execute</span>
                    </div>
                    <ArrowRight style={{ width: "12px", height: "12px", color: "var(--text-muted)", flexShrink: 0 }} />
                    <div style={{ flex: "1 1 85px", minWidth: "80px", padding: "0.6rem 0.4rem", background: "#151F19", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: "var(--radius-sm)", textAlign: "center", color: "var(--accent-emerald)" }}>
                      <span style={{ display: "block", fontWeight: 700 }}>05</span>
                      <span>Confirm Receipt</span>
                    </div>
                  </div>

                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", margin: 0 }}>
                    * Receipt confirmation applies specifically to the advance-payment workflow: recipients submit verifiable expense receipts after disbursement for member quorum review. Standard payments settle immediately upon execution.
                  </p>
                </motion.div>
              )}

              {/* BEAT 4: VERIFICATION AND TRUST (78 - 92%) */}
              {activeBeat === 4 && (
                <motion.div
                  key="beat-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.45 }}
                  style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
                >
                  <div className="cv-badge cv-badge-neutral">
                    <FileCheck style={{ width: "14px", height: "14px", color: "var(--accent-emerald)" }} />
                    <span>CRYPTOGRAPHIC RECEIPT AUDIT</span>
                  </div>

                  <h2 className="cv-hero-heading" style={{ fontSize: "2.75rem" }}>
                    Records you can <br />
                    <span className="text-gradient-crimson">
                      independently verify.
                    </span>
                  </h2>

                  <p className="cv-hero-desc">
                    Explore on-chain transaction records and verify whether a
                    receipt file matches its recorded cryptographic hash.
                  </p>

                  <div
                    className="glass-panel"
                    style={{ padding: "1.25rem 1.5rem", marginTop: "0.5rem" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--accent-amber)", fontFamily: "var(--font-mono)", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "0.5rem" }}>
                      <Search style={{ width: "14px", height: "14px" }} />
                      <span>Hash Consistency Verification</span>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.6rem", lineHeight: 1.5 }}>
                      A matching SHA-256 or IPFS CID hash verifies file consistency, proving that the digital receipt was not altered after submission.
                    </p>
                    <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", background: "#050505", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Hash: bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi
                    </div>
                  </div>
                </motion.div>
              )}

              {/* BEAT 5: FINAL REASSEMBLY & CTA (92 - 100%) */}
              {activeBeat === 5 && (
                <motion.div
                  key="beat-5"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.45 }}
                  style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
                >
                  <div className="cv-badge cv-badge-crimson">
                    <Unlock style={{ width: "14px", height: "14px" }} />
                    <span>PRODUCTION READY ON MST BLOCKCHAIN</span>
                  </div>

                  <h2 className="cv-hero-heading" style={{ fontSize: "2.75rem" }}>
                    Better governance. <br />
                    <span className="text-gradient-crimson">
                      Clearer spending.
                    </span>
                  </h2>

                  <p className="cv-hero-desc">
                    Bring transparency and accountability to the way your club,
                    hackathon team, or organization manages funds.
                  </p>

                  <div className="cv-hero-actions">
                    {account ? (
                      <button
                        onClick={onExploreClick}
                        className="btn btn-primary"
                      >
                        <span>Launch Treasury Dashboard</span>
                        <ArrowRight style={{ width: "16px", height: "16px" }} />
                      </button>
                    ) : (
                      <button
                        onClick={onConnectWallet}
                        className="btn btn-primary"
                      >
                        <span>Connect Wallet</span>
                        <ArrowRight style={{ width: "16px", height: "16px" }} />
                      </button>
                    )}

                    <button
                      onClick={onExploreClick}
                      className="btn btn-secondary"
                    >
                      <span>Explore Treasury</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Progress Bar Indicator */}
          <div className="cv-progress-bar-wrap">
            <motion.div
              style={{ scaleX: smoothProgress }}
              className="cv-progress-bar-fill"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
