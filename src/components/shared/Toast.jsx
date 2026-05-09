import { useEffect } from "react";
import { Check, X, AlertTriangle, Info } from "lucide-react";
import { C } from "../../config/constants";

// Editorial flat-rectangle toast (replaces legacy .toast rounded pill).
// Variants:
//   - info    (default) — black surface, white text
//   - success — black surface with green check
//   - error   — red surface with alert icon
const VARIANT_STYLES = {
  info:    { bg: C.black, fg: C.white,  Icon: Info,           accent: C.electricBlue },
  success: { bg: C.black, fg: C.white,  Icon: Check,          accent: C.successGreen },
  error:   { bg: C.red,   fg: C.white,  Icon: AlertTriangle,  accent: C.white },
};

export default function Toast({ message, onClose, duration = 3000, variant = "info" }) {
  const style = VARIANT_STYLES[variant] ?? VARIANT_STYLES.info;
  const Icon = style.Icon;

  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className="animate-slide-up"
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      style={{
        position: "fixed",
        bottom: "max(24px, env(safe-area-inset-bottom))",
        right: 24,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: 12,
        paddingLeft: 18,
        paddingRight: 12,
        paddingTop: 14,
        paddingBottom: 14,
        background: style.bg,
        color: style.fg,
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        fontSize: 14,
        fontWeight: 500,
        maxWidth: "calc(100vw - 48px)",
      }}
    >
      <Icon size={16} color={style.accent} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, lineHeight: 1.4 }}>{message}</span>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 6,
          color: "rgba(255,255,255,0.7)",
          display: "flex",
          alignItems: "center",
          minWidth: 32,
          minHeight: 32,
          justifyContent: "center",
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
