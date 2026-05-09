import { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { C } from "../../config/constants";

// Editorial flat ghost button + inline editor. Replaces the legacy
// .add-action-* dashed-rounded pattern.
export default function AddIdeaInput({ categoryId, dispatch }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const ref = useRef(null);
  useEffect(() => { if (open && ref.current) ref.current.focus(); }, [open]);
  const submit = () => {
    if (text.trim()) {
      dispatch({ type: "ADD_PRIMITIVE", categoryId, text: text.trim() });
      setText("");
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] touch-min"
        style={{
          background: "transparent",
          color: C.darkGray,
          border: `1px dashed ${C.lightGray}`,
          cursor: "pointer",
          transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = C.charcoal;
          e.currentTarget.style.color = C.black;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = C.lightGray;
          e.currentTarget.style.color = C.darkGray;
        }}
      >
        <Plus size={14} aria-hidden="true" />
        Add your own idea
      </button>
    );
  }

  return (
    <div className="flex gap-2 animate-fade-in">
      <input
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setText("");
            setOpen(false);
          }
        }}
        placeholder="Type an idea…"
        className="flex-1 px-4 py-3 text-sm bg-white"
        style={{
          border: `1px solid ${C.red}`,
          color: C.black,
          minHeight: "var(--touch-min)",
        }}
      />
      <button
        type="button"
        onClick={submit}
        className="px-4 text-xs font-bold uppercase tracking-[0.18em]"
        style={{
          background: C.red,
          color: C.white,
          border: "none",
          cursor: "pointer",
          minHeight: "var(--touch-min)",
        }}
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => {
          setText("");
          setOpen(false);
        }}
        aria-label="Cancel"
        className="touch-min flex items-center justify-center"
        style={{
          background: "transparent",
          border: `1px solid ${C.lightGray}`,
          color: C.darkGray,
          cursor: "pointer",
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
