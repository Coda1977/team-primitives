// Personal 6-primitive canvas view.
// Adapted from the original PrimitivesView but data flows through Convex
// queries + a dispatch adapter so the inherited primitives components
// (CategorySection, IdeaCard, AddIdeaInput) work unchanged.

import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronRight, Star } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CATEGORIES } from "../../config/categories";
import { MIN_STARS, MAX_STARS, C } from "../../config/constants";
import { FlashProvider, useFlash } from "../../context/AppContext";
import { useCanvasDispatch } from "../../hooks/useCanvasDispatch";
import CategorySection from "../primitives/CategorySection";
import ChatDrawer from "../shared/ChatDrawer";
import ConfirmModal from "../shared/ConfirmModal";

export default function CanvasView({ session, participant }) {
  return (
    <FlashProvider>
      <CanvasInner session={session} participant={participant} />
    </FlashProvider>
  );
}

function CanvasInner({ session, participant }) {
  const { triggerFlash } = useFlash();
  const canvas = useQuery(api.canvas.getMyCanvas, {
    participantId: participant._id,
  });
  const finalizeStars = useMutation(api.canvas.finalizeStars);

  const [activeCategory, setActiveCategory] = useState(null);
  const [counterPulse, setCounterPulse] = useState(false);
  const [confirmingFinalize, setConfirmingFinalize] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState(null);
  const prevStarredRef = useRef(0);

  // Map Convex's _id -> the inherited components' expected `id` field.
  // Build an _id -> _id lookup for the dispatch adapter (no real translation
  // needed; we just need to keep the shape consistent).
  const { ideasByCategory, idLookup, totals } = useMemo(() => {
    const byCat = {};
    let total = 0;
    let starred = 0;
    let categoriesFilled = 0;
    if (canvas) {
      for (const cat of CATEGORIES) {
        const arr = (canvas[cat.id] ?? []).map((i) => ({
          id: i._id,
          text: i.text,
          starred: i.starred,
          source: i.source,
        }));
        byCat[cat.id] = arr;
        total += arr.length;
        starred += arr.filter((i) => i.starred).length;
        if (arr.length > 0) categoriesFilled += 1;
      }
    }
    return {
      ideasByCategory: byCat,
      idLookup: (id) => id, // _id is already the Convex id; no translation needed
      totals: { total, starred, categoriesFilled },
    };
  }, [canvas]);

  const dispatch = useCanvasDispatch(participant._id, idLookup);

  useEffect(() => {
    if (totals.starred !== prevStarredRef.current && prevStarredRef.current !== 0) {
      setCounterPulse(true);
      const t = setTimeout(() => setCounterPulse(false), 600);
      return () => clearTimeout(t);
    }
    prevStarredRef.current = totals.starred;
  }, [totals.starred]);

  const chatOpen = activeCategory !== null;
  const canFinalize = totals.starred >= MIN_STARS && totals.starred <= MAX_STARS;

  const onConfirmFinalize = async () => {
    setFinalizing(true);
    setError(null);
    try {
      await finalizeStars({ participantId: participant._id });
      // Phase advance handled by participant subscription in Participant.jsx
    } catch (err) {
      setError(err?.message ?? "Could not submit. Try again?");
      setFinalizing(false);
      setConfirmingFinalize(false);
    }
  };

  if (canvas === undefined) {
    return (
      <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
        <p className="text-sm text-neutral-500">Loading your canvas…</p>
      </main>
    );
  }

  return (
    <div className="canvas-layout">
      <div className="canvas-rules">
        <div className="canvas-inner">
          <header
            className="max-w-3xl mx-auto mb-8 flex items-center justify-between text-xs text-neutral-500 border-b pb-3"
            style={{ borderColor: C.lightGray }}
          >
            <span>
              {session.functionName} · {participant.name}
            </span>
            <span aria-label="online" title="online">●</span>
          </header>

          <div className="canvas-orientation animate-fade-in">
            <div className="orientation-stats">
              <span className="orientation-stat">
                <strong>{totals.total}</strong> ideas
              </span>
              <span className="orientation-dot">·</span>
              <span className="orientation-stat">
                <strong>{totals.categoriesFilled}</strong> of 6 categories
              </span>
              {totals.starred > 0 && (
                <>
                  <span className="orientation-dot">·</span>
                  <span className="orientation-stat">
                    <Star
                      size={14}
                      fill={C.accentGlow}
                      color={C.accentGlow}
                      style={{ verticalAlign: "text-bottom" }}
                    />{" "}
                    <strong>{totals.starred}</strong> starred
                  </span>
                </>
              )}
            </div>
            <p className="orientation-hint">
              Star 5–10 ideas to send to the team board. Edit, delete, or add your own.
            </p>
          </div>

          <div className="card-stack">
            {CATEGORIES.map((c, i) => (
              <CategorySection
                key={c.id}
                category={c}
                ideas={ideasByCategory[c.id] || []}
                dispatch={dispatch}
                isActive={activeCategory?.id === c.id}
                onGoDeeper={setActiveCategory}
                delay={i * 0.05}
                isLast={i === CATEGORIES.length - 1}
              />
            ))}
          </div>

          {error && (
            <div
              className="text-sm px-4 py-3 border-l-4 mt-6 max-w-3xl mx-auto"
              style={{ borderColor: C.red, background: C.redLight, color: C.darkGray }}
            >
              {error}
            </div>
          )}
        </div>

        <div className="gate-bar">
          <div className="gate-left">
            <div className={`gate-counter ${counterPulse ? "counter-pulse" : ""}`}>
              <Star
                size={14}
                fill={C.accentGlow}
                color={C.accentGlow}
                style={{ verticalAlign: "text-bottom" }}
              />{" "}
              <strong>{totals.starred}</strong> of {MIN_STARS}–{MAX_STARS}
            </div>
          </div>
          <div
            style={{ fontSize: 13, color: "var(--color-dark-gray)", textAlign: "center" }}
          >
            {totals.starred === 0
              ? "Star the ideas that resonate"
              : totals.starred < MIN_STARS
              ? `Star ${MIN_STARS - totals.starred} more to continue`
              : totals.starred > MAX_STARS
              ? `Unstar ${totals.starred - MAX_STARS} to continue`
              : "Ready when you are"}
          </div>
          <div className="gate-actions">
            <button
              onClick={canFinalize ? () => setConfirmingFinalize(true) : undefined}
              className={`btn-gate ${canFinalize ? "btn-gate-active" : "btn-gate-disabled"}`}
              disabled={!canFinalize}
            >
              Submit stars to team <ChevronRight size={16} />
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
              category={activeCategory}
              participantId={participant._id}
              onClose={() => setActiveCategory(null)}
              onIdeaAdded={(catId) => triggerFlash(catId)}
            />
          </div>
        </>
      )}

      <ConfirmModal
        open={confirmingFinalize}
        title="Submit your stars"
        message={`Submit ${totals.starred} starred ideas to the team board? You won't be able to add or change ideas after this — but you can still vote later.`}
        confirmLabel={finalizing ? "Submitting…" : "Submit stars"}
        cancelLabel="Cancel"
        onConfirm={onConfirmFinalize}
        onCancel={() => !finalizing && setConfirmingFinalize(false)}
      />
    </div>
  );
}
