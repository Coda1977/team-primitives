// Team Primitives constants. Forked from AI Playbook src/config/constants.js
// with the LS_KEY removed (Convex replaces localStorage as the source of truth)
// and star bounds adapted for team voting.

export const MIN_STARS = 5;
export const MAX_STARS = 10;

// Inherited palette — see CLAUDE.md / Design Bible for full design system rationale.
export const C = {
  black: "#000000",
  charcoal: "#222222",
  darkGray: "#333333",
  white: "#ffffff",
  lightGray: "#cccccc",
  red: "#e30613",
  redHover: "#c00510",
  redLight: "#fff2f3",
  electricBlue: "#00a3e0",
  // Legacy aliases (used by inherited components)
  ink: "#000000",
  accent: "#e30613",
  accentHover: "#c00510",
  accentGlow: "#e30613",
  accentFaint: "rgba(227,6,19,0.06)",
  muted: "#333333",
  card: "#ffffff",
  border: "#cccccc",
  borderStrong: "#999999",
  starredBg: "#fff2f3",
  starredBorder: "#e30613",
  success: "#00a3e0",
  gray200: "#cccccc",
  gray300: "#999999",
  gray500: "#666666",
  gray700: "#333333",
  gray900: "#000000",
  surface: "#f5f5f5",
  offWhite: "#fafafa",
};

export const uid = () => Math.random().toString(36).slice(2, 10);
