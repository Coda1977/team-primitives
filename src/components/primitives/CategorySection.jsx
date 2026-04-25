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

export default function CategorySection({ category, ideas, dispatch, isActive, onGoDeeper, delay, isLast }) {
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
      className={`use-card ${isFlashing ? "rule-flashing" : ""}`}
      style={{ animationDelay: `${delay}s`, "--cat-color": category.color || C.electricBlue }}
      id={`category-${category.id}`}
      data-category-id={category.id}
    >
      {/* Black card header */}
      <div className="use-card-header">
        <div className="use-card-number">
          Category {category.number}
          {hasIdeas && (
            <span className="rule-check" style={{ background: "rgba(0,163,224,0.15)", color: C.electricBlue }}>
              <Check size={12} />
            </span>
          )}
        </div>
        <div className="icon-badge">
          <Icon size={20} />
        </div>
        <h2>{category.title}</h2>
        <p className="use-card-desc">{category.description}</p>
        <p className="use-card-principle">{category.principle}</p>
      </div>

      {/* Ideas or empty state */}
      {hasIdeas ? (
        <div className="use-card-body">
          <div className="rule-actions">
            {ideas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} categoryId={category.id} dispatch={dispatch} isNew={newIds.has(idea.id)} />
            ))}
          </div>
          <div className="rule-footer">
            <div className="rule-footer-add">
              <AddIdeaInput categoryId={category.id} dispatch={dispatch} />
            </div>
            <button onClick={() => onGoDeeper(category)} className="btn-go-deeper" >
              <MessageCircle size={14} /> Brainstorm with AI
            </button>
          </div>
        </div>
      ) : (
        <div className="use-card-empty">
          <Sparkles size={22} color={category.color || C.accent} style={{ opacity: 0.5, marginBottom: 10 }} />
          <p className="use-card-empty-title">No ideas yet</p>
          <p className="use-card-empty-hint">{category.emptyNudge}</p>
          <div style={{ marginTop: 16 }}>
            <div className="rule-footer">
              <div className="rule-footer-add">
                <AddIdeaInput categoryId={category.id} dispatch={dispatch} />
              </div>
              <button onClick={() => onGoDeeper(category)} className="btn-go-deeper" >
                <MessageCircle size={14} /> Brainstorm with AI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
