import { useEffect, useId, useRef } from "react";
import { C } from "../../config/constants";

// Editorial confirm modal — flat sharp-rectangle surface with the
// kicker-tick + small-caps label + display title pattern. Replaces the
// legacy rounded `.modal-content` card.
//
// Accessibility:
//  - role="dialog" + aria-modal + aria-labelledby for the title.
//  - Escape closes (mirrors backdrop click).
//  - Cancel button receives focus on open; previous focus restored on close.
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = "destructive",
}) {
  const titleId = useId();
  const cancelRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current =
      typeof document !== "undefined" ? document.activeElement : null;
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  const confirmBg = variant === "destructive" ? C.red : C.black;

  return (
    <div
      onClick={onCancel}
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          background: C.white,
          maxWidth: 480,
          width: "100%",
          padding: "32px 28px",
          border: `1px solid ${C.lightGray}`,
          animation: "scaleIn 0.25s ease-out",
        }}
      >
        <div className="kicker-row" style={{ marginBottom: 16 }}>
          <span className="kicker-tick kicker-tick--sm" aria-hidden="true" />
          <span className="kicker-label kicker-label--sm">
            {variant === "destructive" ? "Confirm action" : "Confirm"}
          </span>
        </div>
        <h3
          id={titleId}
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.5rem",
            fontWeight: 700,
            letterSpacing: "-0.015em",
            marginBottom: 12,
            color: C.black,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            color: C.darkGray,
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          {message}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            style={{
              padding: "12px 20px",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              border: `1px solid ${C.charcoal}`,
              background: "transparent",
              color: C.charcoal,
              cursor: "pointer",
              minHeight: "var(--touch-min)",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            {cancelLabel || "Cancel"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: "12px 20px",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              border: "none",
              background: confirmBg,
              color: C.white,
              cursor: "pointer",
              minHeight: "var(--touch-min)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
