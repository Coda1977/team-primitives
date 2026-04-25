import { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { C } from "../../config/constants";

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

  if (!open) return (
    <button onClick={() => setOpen(true)} className="add-action-btn">
      <div className="add-action-icon"><Plus size={14} /></div>
      <span>Add your own idea</span>
    </button>
  );

  return (
    <div className="add-action-expanded animate-fade-in">
      <input
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") { setText(""); setOpen(false); }
        }}
        placeholder="Type an idea..."
        className="add-action-input"
      />
      <button onClick={submit} className="btn-primary btn-sm">Add</button>
      <button onClick={() => { setText(""); setOpen(false); }} className="btn-icon">
        <X size={16} color={C.muted} />
      </button>
    </div>
  );
}
