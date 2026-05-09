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
import StatusBlock from "../shared/StatusBlock";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export default function CanvasView({ session, participant }) {
  return (
    <FlashProvider>
      <CanvasInner session={session} participant={participant} />
    </FlashProvider>
  );
}

function CanvasInner({ session, participant }) {
  const { triggerFlash } = useFlash();
  const online = useOnlineStatus();
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
          {/* Editorial header — matches Intake/AdminBoard broadcast pattern */}
          <header
            className="max-w-6xl mx-auto mb-10 pb-4 flex items-center justify-between border-b"
            style={{ borderColor: C.lightGray }}
          >
            <div className="flex items-center gap-3 text-xs">
              <span
                aria-hidden="true"
                className="inline-block w-1 h-4"
                style={{ background: C.red }}
              />
              <span
                className="uppercase tracking-[0.28em] font-bold"
                style={{ color: C.darkGray }}
              >
                {session.functionName}
              </span>
              <span style={{ color: C.lightGray }}>·</span>
              <span style={{ color: C.darkGray }}>{participant.name}</span>
            </div>
            <span
              aria-label={online ? "online" : "offline"}
              title={online ? "Online" : "Offline. Changes save when you reconnect."}
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                background: online ? C.electricBlue : C.gray500,
                border: online ? "none" : `1px solid ${C.lightGray}`,
              }}
            />
          </header>

          <div className="max-w-6xl mx-auto mb-12 animate-fade-in">
            <div className="kicker-row">
              <span className="kicker-tick" aria-hidden="true" />
              <span className="kicker-label">Your canvas</span>
            </div>
            <h1 className="font-bold leading-[1.05] mb-5 display-md">
              Star 5–10 ideas to send to the team board.
            </h1>
            <div
              className="flex items-baseline gap-4 flex-wrap text-sm"
              style={{ color: C.darkGray }}
            >
              <span>
                <span className="font-bold text-black tabular-nums">{totals.total}</span> ideas
              </span>
              <span style={{ color: C.lightGray }}>·</span>
              <span>
                <span className="font-bold text-black tabular-nums">{totals.categoriesFilled}</span> of 6 categories
              </span>
              {totals.starred > 0 && (
                <>
                  <span style={{ color: C.lightGray }}>·</span>
                  <span>
                    <Star
                      size={13}
                      fill={C.red}
                      color={C.red}
                      style={{ verticalAlign: "text-bottom" }}
                    />{" "}
                    <span className="font-bold text-black tabular-nums">{totals.starred}</span> starred
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Single column on mobile/tablet (so each category gets full width
              for editing); 2-column grid at lg+ so 6 categories fit in 3 rows
              on a desktop instead of stacking 6 deep. */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            {CATEGORIES.map((c, i) => (
              <CategorySection
                key={c.id}
                category={c}
                ideas={ideasByCategory[c.id] || []}
                dispatch={dispatch}
                onGoDeeper={setActiveCategory}
                delay={i * 0.05}
              />
            ))}
          </div>

          {error && (
            <div className="mt-6 max-w-6xl mx-auto">
              <StatusBlock variant="alert" kicker="Couldn't submit">
                {error}
              </StatusBlock>
            </div>
          )}
        </div>

        {/* Editorial sticky gate — flat, top hairline, clear status message */}
        <div
          className="sticky bottom-0 z-10 mt-8 px-6 backdrop-blur"
          style={{
            background: "rgba(255,255,255,0.95)",
            borderTop: `1px solid ${C.lightGray}`,
          }}
        >
          <div className="max-w-6xl mx-auto py-4 flex items-center justify-between gap-4 flex-wrap">
            <div
              className="flex items-center gap-2 text-sm"
              style={{
                transform: counterPulse ? "scale(1.04)" : "scale(1)",
                transition: "transform 0.3s ease",
              }}
            >
              <Star
                size={14}
                fill={C.red}
                color={C.red}
                aria-hidden="true"
                style={{ verticalAlign: "text-bottom" }}
              />
              <span className="tabular-nums">
                <strong>{totals.starred}</strong> of {MIN_STARS}–{MAX_STARS}
              </span>
            </div>
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="text-xs uppercase tracking-[0.18em] font-semibold flex-1 text-center min-w-[180px]"
              style={{ color: C.darkGray }}
            >
              {totals.starred === 0
                ? "Star the ideas that resonate"
                : totals.starred < MIN_STARS
                ? `Star ${MIN_STARS - totals.starred} more to continue`
                : totals.starred > MAX_STARS
                ? `Unstar ${totals.starred - MAX_STARS} to continue`
                : "Ready when you are"}
            </div>
            <button
              type="button"
              onClick={canFinalize ? () => setConfirmingFinalize(true) : undefined}
              disabled={!canFinalize}
              className="inline-flex items-center gap-2 px-5 text-xs font-bold uppercase tracking-[0.22em] disabled:opacity-40 disabled:cursor-not-allowed touch-min"
              style={{
                background: canFinalize ? C.red : C.gray500,
                color: C.white,
                border: "none",
                cursor: canFinalize ? "pointer" : "not-allowed",
                transition: "background 0.2s ease",
              }}
            >
              Submit stars
              <ChevronRight size={16} />
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
        message={`Submit ${totals.starred} starred ideas to the team board? You won't be able to add or change ideas after this. You can still vote later.`}
        confirmLabel={finalizing ? "Submitting…" : "Submit stars"}
        cancelLabel="Cancel"
        onConfirm={onConfirmFinalize}
        onCancel={() => !finalizing && setConfirmingFinalize(false)}
      />
    </div>
  );
}
