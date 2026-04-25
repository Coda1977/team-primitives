import { useState, useEffect, useRef } from "react";
import { Star, Pencil, Trash2 } from "lucide-react";
import { C } from "../../config/constants";
import { useToast } from "../../context/ToastContext";

export default function IdeaCard({ idea, categoryId, dispatch, isNew }) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(idea.text);
  const [removing, setRemoving] = useState(false);
  const [blooming, setBlooming] = useState(false);
  const [popping, setPopping] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ref = useRef(null);
  const confirmTimer = useRef(null);

  useEffect(() => { setText(idea.text); }, [idea.text]);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);

  const save = () => {
    if (text.trim()) dispatch({ type: "UPDATE_PRIMITIVE", categoryId, ideaId: idea.id, text: text.trim() });
    setEditing(false);
  };
  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      confirmTimer.current = setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    clearTimeout(confirmTimer.current);
    setRemoving(true);
    setTimeout(() => dispatch({ type: "DELETE_PRIMITIVE", categoryId, ideaId: idea.id }), 280);
  };
  const handleStar = () => {
    setBlooming(true);
    setPopping(true);
    dispatch({ type: "TOGGLE_PRIMITIVE_STAR", categoryId, ideaId: idea.id });
    if (!idea.starred) {
      showToast("Added to your priorities");
    }
    setTimeout(() => setBlooming(false), 500);
    setTimeout(() => setPopping(false), 500);
  };

  const isStarred = idea.starred;

  return (
    <div className={`action-card ${isStarred ? "action-starred" : ""} ${removing ? "action-removing" : ""} ${blooming ? "action-blooming" : ""} ${isNew ? "action-entering" : ""}`}>
      <button onClick={handleStar} className={`star-btn ${popping ? "star-popping" : ""}`} aria-label={isStarred ? "Unstar" : "Star"}>
        <Star size={18} fill={isStarred ? C.accentGlow : "none"} color={isStarred ? C.accentGlow : C.muted} />
      </button>
      <div className="action-text-area">
        {editing ? (
          <textarea
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
              if (e.key === "Escape") { setText(idea.text); setEditing(false); }
            }}
            onBlur={save}
            rows={2}
            className="action-edit-input"
          />
        ) : (
          <p className="action-text">{idea.text}</p>
        )}
      </div>
      {!editing && (
        <div className="action-inline-actions">
          {confirmDelete ? (
            <button onClick={handleDelete} className="action-confirm-delete" aria-label="Confirm delete">
              <Trash2 size={13} /> Delete?
            </button>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="action-inline-btn" aria-label="Edit">
                <Pencil size={16} />
              </button>
              <button onClick={handleDelete} className="action-inline-btn action-inline-delete" aria-label="Delete">
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
