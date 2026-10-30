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

  // Scroll tracking across the streamlined 180vh storytelling track
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 24,
    restDelta: 0.001,
  });

  // Track beat changes for progress dots (3 balanced chapters)
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      if (latest < 0.35) setActiveBeat(0);
      else if (latest < 0.72) setActiveBeat(1);
      else setActiveBeat(2);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  // Emblem 3D transforms tuned for responsive 3-beat scroll
  const emblemScale = useTransform(smoothProgress, [0, 0.5, 1], [1, 1.1, 1.02]);
  const emblemRotateZ = useTransform(smoothProgress, [0, 0.5, 1], [0, 12, -6]);
  const emblemRotateY = useTransform(smoothProgress, [0, 0.5, 1], [-5, 10, -4]);
  const emblemOpacity = useTransform(smoothProgress, [0, 0.1, 0.9, 1], [1, 1, 0.96, 1]);

  // Story beats definitions - 3 balanced chapters
  const beats = [
    { id: 0, title: "Overview" },
    { id: 1, title: "Treasury" },
    { id: 2, title: "Execution" },
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
      id="home"
      className="cv-hero-track"
    >
      <span id="overview" style={{ position: "absolute", top: 0, height: 1, width: 1, opacity: 0, pointerEvents: "none" }} />
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
              style={{ background: "rgba(255, 255, 255, 0.04)", color: "var(--text-muted)", cursor: "pointer" }}
              onClick={() => {
                if (activeBeat < beats.length - 1) {
                  scrollToBeat(activeBeat + 1);
                } else {
                  onExploreClick();
                }
              }}
              title="Click to advance or jump to treasury"
            >
              <span>{activeBeat === beats.length - 1 ? "Jump to Treasury" : "Scroll or click to explore"}</span>
              <ChevronDown style={{ width: "14px", height: "14px", color: "var(--accent-crimson)" }} />
            </div>
          </div>

          {/* Central Beat Story Content */}
          <div className="cv-hero-content">
            {/* BEAT 0: OVERVIEW (0 - 35%) */}
            <AnimatePresence mode="wait">
              {activeBeat === 0 && (
                <motion.div
                  key="beat-0"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35 }}
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

              {/* BEAT 1: TREASURY & GOVERNANCE INVARIANTS (35 - 72%) */}
              {activeBeat === 1 && (
                <motion.div
                  key="beat-1"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35 }}
                  style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}
                >
                  <div className="cv-badge cv-badge-emerald">
                    <ShieldCheck style={{ width: "14px", height: "14px" }} />
                    <span>INVARIANT-PRESERVING ACCOUNTING</span>
                  </div>

                  <h2 className="cv-hero-heading" style={{ fontSize: "2.6rem" }}>
                    Your treasury. <br />
                    <span className="text-gradient-crimson">
                      Clearly accounted for.
                    </span>
                  </h2>

                  <p className="cv-hero-desc">
                    View live contract balances, multi-member consensus parameters,
                    and reserved funds in one place. No hidden debits or unapproved withdrawals.
                  </p>

                  {/* Live Treasury Balance Card */}
                  <div
                    className="glass-panel"
                    style={{
                      padding: "1.15rem 1.4rem",
                      border: "1px solid rgba(255, 48, 59, 0.35)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "0.45rem" }}>
                      <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        LIVE CONTRACT BALANCE
                      </span>
                      <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--accent-emerald)" }}>
                        Synchronized
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", paddingTop: "0.6rem" }}>
                      <span style={{ fontSize: "2.1rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                        {vaultBalance}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--accent-crimson)", fontWeight: 700 }}>
                        tMSTC
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", paddingTop: "0.6rem", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
                      <div>Available: <strong style={{ color: "var(--accent-emerald)" }}>{availableFunds} tMSTC</strong></div>
                      <div>Locked: <strong style={{ color: "var(--accent-amber)" }}>{reservedFunds} tMSTC</strong></div>
                    </div>
                  </div>

                  {/* Multi-Member Consensus Pills */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.75rem",
                    }}
                  >
                    <div className="glass-panel" style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        CONSENSUS RULE
                      </div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--accent-crimson)", marginTop: "2px" }}>
                        {requiredApprovals} of {membersCount} Votes Required
                      </div>
                    </div>

                    <div className="glass-panel" style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        LEDGER SECURITY
                      </div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "2px" }}>
                        100% On-Chain Verifiable
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* BEAT 2: SMART CONTRACT EXECUTION & LAUNCH (72 - 100%) */}
              {activeBeat === 2 && (
                <motion.div
                  key="beat-2"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35 }}
                  style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}
                >
                  <div className="cv-badge cv-badge-crimson">
                    <Lock style={{ width: "14px", height: "14px" }} />
                    <span>SMART CONTRACT ENFORCEMENT</span>
                  </div>

                  <h2 className="cv-hero-heading" style={{ fontSize: "2.6rem" }}>
                    Approve first. <br />
                    <span className="text-gradient-crimson">
                      Execute by rule.
                    </span>
                  </h2>

                  <p className="cv-hero-desc">
                    Smart-contract rules enforce approvals before payments are executed.
                    Verifiable cryptographic receipts ensure complete transparency.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.75rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: "1 1 65px", minWidth: "60px", padding: "0.55rem 0.35rem", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                      <span style={{ color: "var(--accent-crimson)", display: "block", fontWeight: 700 }}>01</span>
                      <span>Propose</span>
                    </div>
                    <ArrowRight style={{ width: "12px", height: "12px", color: "var(--text-muted)", flexShrink: 0 }} />
                    <div style={{ flex: "1 1 65px", minWidth: "60px", padding: "0.55rem 0.35rem", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                      <span style={{ color: "var(--accent-crimson)", display: "block", fontWeight: 700 }}>02</span>
                      <span>Vote</span>
                    </div>
                    <ArrowRight style={{ width: "12px", height: "12px", color: "var(--text-muted)", flexShrink: 0 }} />
                    <div style={{ flex: "1 1 65px", minWidth: "60px", padding: "0.55rem 0.35rem", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                      <span style={{ color: "var(--accent-emerald)", display: "block", fontWeight: 700 }}>03</span>
                      <span>Validate</span>
                    </div>
                    <ArrowRight style={{ width: "12px", height: "12px", color: "var(--text-muted)", flexShrink: 0 }} />
                    <div style={{ flex: "1 1 65px", minWidth: "60px", padding: "0.55rem 0.35rem", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
                      <span style={{ color: "var(--accent-emerald)", display: "block", fontWeight: 700 }}>04</span>
                      <span>Execute</span>
                    </div>
                    <ArrowRight style={{ width: "12px", height: "12px", color: "var(--text-muted)", flexShrink: 0 }} />
                    <div style={{ flex: "1 1 80px", minWidth: "75px", padding: "0.55rem 0.35rem", background: "#151F19", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: "var(--radius-sm)", textAlign: "center", color: "var(--accent-emerald)" }}>
                      <span style={{ display: "block", fontWeight: 700 }}>05</span>
                      <span>Receipt</span>
                    </div>
                  </div>

                  <div className="cv-hero-actions" style={{ marginTop: "0.5rem" }}>
                    <button
                      onClick={onExploreClick}
                      className="btn btn-primary"
                    >
                      <span>Explore Treasury Dashboard</span>
                      <ArrowRight style={{ width: "16px", height: "16px" }} />
                    </button>

                    <button
                      onClick={() => scrollToBeat(0)}
                      className="btn btn-secondary"
                    >
                      <span>Back to Top</span>
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
