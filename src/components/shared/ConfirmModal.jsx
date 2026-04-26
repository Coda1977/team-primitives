import { useEffect, useId, useRef } from "react";

// Accessible confirm modal:
//  - role="dialog" + aria-modal + aria-labelledby for the title.
//  - Escape closes (mirrors backdrop click).
//  - Cancel button receives focus on open; previous focus is restored on close
//    so keyboard users land back where they came from.
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
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
      if (prev && typeof prev.focus === "function") {
        prev.focus();
      }
    };
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel} role="presentation">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h3 id={titleId} className="modal-title">
          {title}
        </h3>
        <p className="modal-message">{message}</p>
        <div className="modal-buttons">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="btn-ghost"
          >
            {cancelLabel || "Cancel"}
          </button>
          <button type="button" onClick={onConfirm} className="btn-danger">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
