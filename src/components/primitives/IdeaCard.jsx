import { useState, useEffect, useRef } from "react";
import { Star, Pencil, Trash2 } from "lucide-react";
import { C } from "../../config/constants";
import { useToast } from "../../context/useToast";

// Editorial flat-rectangle idea card. Replaces the legacy `.action-card`
// rounded surface. Starred ideas get a 2px red top accent (matches the
// PresentView StickyNote and MyBoardView idea pattern).
export default function IdeaCard({ idea, categoryId, dispatch, isNew }) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(idea.text);
  const [removing, setRemoving] = useState(false);
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
    setPopping(true);
    dispatch({ type: "TOGGLE_PRIMITIVE_STAR", categoryId, ideaId: idea.id });
    if (!idea.starred) {
      showToast({ message: "Added to your priorities", variant: "success" });
    }
    setTimeout(() => setPopping(false), 500);
  };

  const isStarred = idea.starred;

  return (
    <div
      className={`flex items-start gap-3 p-4 ${isNew ? "animate-fade-in" : ""} ${removing ? "action-removing" : ""}`}
      style={{
        background: isStarred ? C.starredBg : C.surface,
        boxShadow: isStarred
          ? `inset 0 2px 0 0 ${C.red}`
          : `inset 0 1px 0 0 ${C.lightGray}`,
        transition: "background 0.25s ease",
      }}
    >
      <button
        type="button"
        onClick={handleStar}
        aria-label={isStarred ? "Unstar this idea" : "Star this idea"}
        aria-pressed={isStarred}
        className="touch-min flex items-center justify-center flex-shrink-0"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 8,
          marginLeft: -8,
          transform: popping ? "scale(1.15)" : "scale(1)",
          transition: "transform 0.2s ease",
        }}
      >
        <Star
          size={18}
          fill={isStarred ? C.red : "none"}
          color={isStarred ? C.red : C.darkGray}
        />
      </button>
      <div className="flex-1 min-w-0">
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
            className="w-full text-sm leading-relaxed p-2 resize-none"
            style={{
              border: `1.5px solid ${C.red}`,
              outline: "none",
              background: C.white,
              color: C.black,
              boxShadow: "0 0 0 3px rgba(227,6,19,0.08)",
            }}
          />
        ) : (
          <p className="text-sm leading-relaxed" style={{ color: C.black }}>
            {idea.text}
          </p>
        )}
      </div>
      {!editing && (
        <div className="flex gap-1 flex-shrink-0">
          {confirmDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Confirm delete"
              className="inline-flex items-center gap-1 px-3 text-xs font-semibold uppercase tracking-wider touch-min"
              style={{
                background: C.redLight,
                border: `1px solid ${C.red}`,
                color: "#c53030",
                cursor: "pointer",
              }}
            >
              <Trash2 size={13} />
              Delete?
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Edit idea"
                className="touch-min flex items-center justify-center"
                style={{
                  background: "transparent",
                  border: "none",
                  color: C.darkGray,
                  cursor: "pointer",
                  transition: "color 0.15s ease, background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = C.surface;
                  e.currentTarget.style.color = C.black;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = C.darkGray;
                }}
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                aria-label="Delete idea"
                className="touch-min flex items-center justify-center"
                style={{
                  background: "transparent",
                  border: "none",
                  color: C.darkGray,
                  cursor: "pointer",
                  transition: "color 0.15s ease, background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = C.redLight;
                  e.currentTarget.style.color = "#c53030";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = C.darkGray;
                }}
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
