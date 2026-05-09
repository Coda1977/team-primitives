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
  warning: "#b45309",
  warningBg: "rgba(180,83,9,0.08)",
  warningDot: "#facc15",
  // Locked-phase chip color (DESIGN_BRIEF specifies green)
  successGreen: "#0a7c3a",
  successGreenBg: "rgba(10,124,58,0.10)",
  // Voted-idea wash. Distinct from starredBg (red) so users can tell
  // "I starred this on canvas" from "I voted this in vote tab".
  votedBg: "rgba(0,163,224,0.10)",
  // @deprecated Legacy aliases retained for inherited components.
  // Prefer canonical keys above for new code:
  //   ink/gray900 -> black, accent/accentGlow -> red, accentHover -> redHover,
  //   accentFaint -> use rgba inline, muted/gray700 -> darkGray, card -> white,
  //   border/gray200 -> lightGray, borderStrong/gray300 -> "#999",
  //   gray500 -> "#666", success -> electricBlue, surface unchanged.
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
