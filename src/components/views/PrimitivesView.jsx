import { useState, useEffect, useRef } from "react";
import { ChevronRight, Star, Download, RotateCcw } from "lucide-react";
import { CATEGORIES } from "../../config/categories";
import { MIN_STARS_FOR_PLAYBOOK, C } from "../../config/constants";
import { FlashProvider } from "../../context/AppContext";
import { exportPrimitivesDocx } from "../../utils/export";
import CategorySection from "../primitives/CategorySection";
import ChatDrawer from "../shared/ChatDrawer";

export default function PrimitivesView({ state, dispatch, onContinue, onStartOver }) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [counterPulse, setCounterPulse] = useState(false);
  const prevStarredRef = useRef(0);
  const scrollRef = useRef(null);
  const chatOpen = activeCategory !== null;

  const totalIdeas = CATEGORIES.reduce((sum, c) => sum + (state.primitives[c.id] || []).length, 0);
  const starredCount = CATEGORIES.reduce((sum, c) => sum + (state.primitives[c.id] || []).filter((i) => i.starred).length, 0);
  const categoriesWithIdeas = CATEGORIES.filter((c) => (state.primitives[c.id] || []).length > 0).length;
  const canContinue = starredCount >= MIN_STARS_FOR_PLAYBOOK;

  useEffect(() => {
    if (starredCount !== prevStarredRef.current && prevStarredRef.current !== 0) {
      setCounterPulse(true);
      setTimeout(() => setCounterPulse(false), 600);
    }
    prevStarredRef.current = starredCount;
  }, [starredCount]);

  return (
    <FlashProvider>
      <div className="canvas-layout">
        <div className="canvas-rules" ref={scrollRef}>
          <div className="canvas-inner">
            <div className="canvas-orientation animate-fade-in">
              <div className="orientation-stats">
                <span className="orientation-stat"><strong>{totalIdeas}</strong> ideas</span>
                <span className="orientation-dot">&middot;</span>
                <span className="orientation-stat"><strong>{categoriesWithIdeas}</strong> of 6 categories</span>
                {starredCount > 0 && (
                  <>
                    <span className="orientation-dot">&middot;</span>
                    <span className="orientation-stat">
                      <Star size={14} fill={C.accentGlow} color={C.accentGlow} style={{ verticalAlign: "text-bottom" }} />
                      {" "}<strong>{starredCount}</strong> starred
                    </span>
                  </>
                )}
              </div>
              <p className="orientation-hint">
                Star every idea that resonates. The more you star, the richer your change strategy.
              </p>
            </div>

            <div className="card-stack">
              {CATEGORIES.map((c, i) => (
                <CategorySection
                  key={c.id}
                  category={c}
                  ideas={state.primitives[c.id] || []}
                  dispatch={dispatch}
                  isActive={activeCategory?.id === c.id}
                  onGoDeeper={setActiveCategory}
                  delay={i * 0.05}
                  isLast={i === CATEGORIES.length - 1}
                />
              ))}
            </div>
          </div>

          {/* Gate - direct child of canvas-rules for sticky to work */}
          <div className="gate-bar">
            <div className="gate-left">
              <div className={`gate-counter ${counterPulse ? "counter-pulse" : ""}`}>
                <Star size={14} fill={C.accentGlow} color={C.accentGlow} style={{ verticalAlign: "text-bottom" }} />
                {" "}<strong>{starredCount}</strong> of {totalIdeas}
              </div>
            </div>
            <div style={{ fontSize: 13, color: "var(--color-dark-gray)", textAlign: "center" }}>
              {starredCount === 0
                ? "Star the ideas that matter to you"
                : starredCount < MIN_STARS_FOR_PLAYBOOK
                  ? `Star at least ${MIN_STARS_FOR_PLAYBOOK} to continue`
                  : "Ready when you are"}
            </div>
            <div className="gate-actions">
              <button onClick={() => exportPrimitivesDocx(state)} className="btn-ghost btn-sm">
                <Download size={14} /> Export
              </button>
              <button onClick={onStartOver} className="btn-ghost btn-sm">
                <RotateCcw size={12} /> Start over
              </button>
              <button
                onClick={canContinue ? onContinue : undefined}
                className={`btn-gate ${canContinue ? "btn-gate-active" : "btn-gate-disabled"}`}
                disabled={!canContinue}
              >
                Continue to Strategy <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {chatOpen && (
          <>
            <div onClick={() => setActiveCategory(null)} className="chat-backdrop" />
            <div className="chat-panel">
              <ChatDrawer
                key={activeCategory.id}
                type="primitive"
                item={activeCategory}
                state={state}
                dispatch={dispatch}
                onClose={() => setActiveCategory(null)}
              />
            </div>
          </>
        )}
      </div>
    </FlashProvider>
  );
}
