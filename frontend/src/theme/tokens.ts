/**
 * ClubVault Design System Tokens
 * Strict adherence to the Awwwards-level Black, Charcoal, Metallic Silver & Crimson Red brand identity.
 */

export const THEME = {
  colors: {
    bg: {
      primary: "#050505",
      secondary: "#0A0A0C",
      card: "#101114",
      cardHover: "#15171D",
      glass: "rgba(16, 17, 20, 0.75)",
      glassSubtle: "rgba(10, 10, 12, 0.55)",
    },
    accent: {
      crimson: "#FF303B",
      deepRed: "#B51224",
      darkRed: "#4A060E",
      glow: "rgba(255, 48, 59, 0.25)",
      glowSubtle: "rgba(255, 48, 59, 0.12)",
    },
    text: {
      heading: "#F5F5F7",
      body: "#A1A1AA",
      muted: "#71717A",
      subtle: "#52525B",
    },
    border: {
      subtle: "rgba(255, 255, 255, 0.08)",
      charcoal: "#1F2024",
      highlight: "rgba(255, 255, 255, 0.16)",
      crimson: "rgba(255, 48, 59, 0.35)",
    },
    state: {
      success: "#10B981",
      successGlow: "rgba(16, 185, 129, 0.2)",
      warning: "#F59E0B",
      warningGlow: "rgba(245, 158, 11, 0.2)",
      error: "#EF4444",
      info: "#3B82F6",
    },
    metallic: {
      silver: "#D1D5DB",
      steel: "#9CA3AF",
      darkSteel: "#374151",
    },
  },
  typography: {
    fontHeading: "'Outfit', 'Inter', -apple-system, sans-serif",
    fontBody: "'Inter', -apple-system, sans-serif",
    fontMono: "'JetBrains Mono', monospace",
  },
  shadows: {
    glowCrimson: "0 0 35px -5px rgba(255, 48, 59, 0.35)",
    glowSubtle: "0 0 25px -5px rgba(255, 48, 59, 0.15)",
    card: "0 20px 40px -15px rgba(0, 0, 0, 0.8)",
    cardElevated: "0 25px 50px -12px rgba(0, 0, 0, 0.95)",
  },
  transitions: {
    spring: { type: "spring", stiffness: 300, damping: 30 },
    smooth: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
    cinematic: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
  },
} as const;

export type ThemeTokens = typeof THEME;
