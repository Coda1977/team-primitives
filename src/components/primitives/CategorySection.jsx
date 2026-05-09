import { useState, useEffect, useRef } from "react";
import { Check, Sparkles, MessageCircle, FileText, Zap, Search, BarChart3, Code2, Lightbulb } from "lucide-react";
import { C } from "../../config/constants";
import { useFlash } from "../../context/AppContext";
import IdeaCard from "./IdeaCard";
import AddIdeaInput from "./AddIdeaInput";

const CATEGORY_ICONS = {
  content: FileText,
  automation: Zap,
  research: Search,
  data: BarChart3,
  coding: Code2,
  ideation: Lightbulb,
};

// Editorial light-treatment category section. Replaces the legacy
// .use-card / .use-card-header / .use-card-body / .icon-badge classes
// with a flat 1px-bordered surface + kicker tick + tracked label +
// display title — same vocabulary as the rest of the editorial system.
export default function CategorySection({ category, ideas, dispatch, onGoDeeper, delay }) {
  const { flash } = useFlash();
  const isFlashing = flash === category.id;
  const hasIdeas = ideas.length > 0;
  const [newIds, setNewIds] = useState(new Set());
  const prevCountRef = useRef(ideas.length);
  const Icon = CATEGORY_ICONS[category.id] || Sparkles;

  useEffect(() => {
    if (ideas.length > prevCountRef.current) {
      const newOnes = ideas.slice(prevCountRef.current);
      const ids = new Set(newOnes.map((a) => a.id));
      setNewIds(ids);
      setTimeout(() => setNewIds(new Set()), 600);
    }
    prevCountRef.current = ideas.length;
  }, [ideas]);

  return (
    <div
      className={`animate-fade-in ${isFlashing ? "rule-flashing" : ""}`}
      style={{
        animationDelay: `${delay}s`,
        background: C.white,
        border: `1px solid ${C.lightGray}`,
      }}
      id={`category-${category.id}`}
      data-category-id={category.id}
    >
      <div
        className="px-6 pt-6 pb-5 border-b"
        style={{ borderColor: C.lightGray }}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="kicker-row" style={{ marginBottom: 0 }}>
            <span
              className="inline-block w-1 h-4 flex-shrink-0"
              aria-hidden="true"
              style={{ background: category.color || C.red }}
            />
            <span
              className="kicker-label kicker-label--sm"
              style={{ color: category.color || C.darkGray }}
            >
              Category {category.number}
            </span>
            {hasIdeas && (
              <span
                aria-label="Has ideas"
                className="inline-flex items-center justify-center"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "rgba(0,163,224,0.15)",
                  color: C.electricBlue,
                }}
              >
                <Check size={11} />
              </span>
            )}
          </div>
          <span
            className="inline-flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: `1px solid ${category.color || C.electricBlue}`,
              color: category.color || C.electricBlue,
              background: "transparent",
            }}
          >
            <Icon size={16} />
          </span>
        </div>
        <h2
          className="font-bold leading-tight mb-2"
          style={{
            fontSize: "1.5rem",
            letterSpacing: "-0.015em",
            color: C.black,
          }}
        >
          {category.title}
        </h2>
        <p
          className="text-xs"
          style={{ color: C.gray500 }}
        >
          {category.description}
        </p>
        {category.principle && (
          <p
            className="text-sm mt-3 italic"
            style={{ color: C.darkGray, lineHeight: 1.55 }}
          >
            {category.principle}
          </p>
        )}
      </div>

      {hasIdeas ? (
        <div className="px-6 py-5">
          <div className="space-y-3 mb-5">
            {ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                categoryId={category.id}
                dispatch={dispatch}
                isNew={newIds.has(idea.id)}
              />
            ))}
          </div>
          <div className="flex gap-2 flex-wrap items-stretch">
            <div className="flex-1 min-w-[180px]">
              <AddIdeaInput categoryId={category.id} dispatch={dispatch} />
            </div>
            <button
              type="button"
              onClick={() => onGoDeeper(category)}
              className="inline-flex items-center gap-2 px-4 text-xs font-bold uppercase tracking-[0.18em] touch-min"
              style={{
                background: C.charcoal,
                color: C.white,
                border: "none",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.black)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.charcoal)}
            >
              <MessageCircle size={14} />
              Brainstorm with AI
            </button>
          </div>
        </div>
      ) : (
        <div className="px-6 py-8 text-center">
          <Sparkles
            size={20}
            color={category.color || C.red}
            style={{ opacity: 0.5, marginBottom: 12, display: "inline-block" }}
            aria-hidden="true"
          />
          <p
            className="text-sm font-semibold mb-2"
            style={{ color: C.black }}
          >
            No ideas yet
          </p>
          {category.emptyNudge && (
            <p
              className="text-xs mx-auto mb-5"
              style={{ color: C.darkGray, lineHeight: 1.55, maxWidth: 360 }}
            >
              {category.emptyNudge}
            </p>
          )}
          <div className="flex gap-2 flex-wrap items-stretch justify-center">
            <div className="flex-1 min-w-[180px]">
              <AddIdeaInput categoryId={category.id} dispatch={dispatch} />
            </div>
            <button
              type="button"
              onClick={() => onGoDeeper(category)}
              className="inline-flex items-center gap-2 px-4 text-xs font-bold uppercase tracking-[0.18em] touch-min"
              style={{
                background: C.charcoal,
                color: C.white,
                border: "none",
                cursor: "pointer",
              }}
            >
              <MessageCircle size={14} />
              Brainstorm with AI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
