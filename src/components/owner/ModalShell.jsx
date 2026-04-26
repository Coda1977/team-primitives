import { useEffect, useId } from "react";

// Generic modal shell used by CreateModal + DeleteModal on the owner dashboard.
// Backdrop click + Escape both close. Title is the dialog's accessible name.
export default function ModalShell({ title, onClose, children }) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white max-w-lg w-full p-7"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="text-2xl font-bold tracking-tight mb-5">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
