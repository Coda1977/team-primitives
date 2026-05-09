// Editorial broadcast loading state. Replaces the legacy `.generating-container`
// / `.gen-card` rounded white card with a flat editorial frame that matches
// Intake → Canvas visual register. Step rotator preserved (it's the design's
// anti-anxiety affordance per CLAUDE.md), but mounted inside the editorial
// vocabulary instead of a card.
//
// Cadence:
// - Slow path (default): 2200ms per step → ~13.2s total. Builds anticipation
//   when the API is genuinely working.
// - Fast path (`apiReady` flips true): remaining steps fly by at ~220ms each,
//   the post-steps pause shrinks to 200ms, and the ready beat shrinks to 400ms.

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2, Circle } from "lucide-react";
import { C } from "../../config/constants";
import { CATEGORIES, PRIMITIVES_GEN_STEPS } from "../../config/categories";

const SLOW_STEP_MS = 2200;
const FAST_STEP_MS = 220;
const SLOW_FINISH_DELAY = 600;
const FAST_FINISH_DELAY = 200;
const SLOW_READY_BEAT = 1200;
const FAST_READY_BEAT = 400;

export default function GeneratingIndicator({ onReady, apiReady = false, functionName }) {
  const steps = PRIMITIVES_GEN_STEPS;
  const items = CATEGORIES;

  const [step, setStep] = useState(0);
  const [stepsFinished, setStepsFinished] = useState(false);
  const [complete, setComplete] = useState(false);
  const calledRef = useRef(false);

  const stepInterval = apiReady ? FAST_STEP_MS : SLOW_STEP_MS;
  const finishDelay = apiReady ? FAST_FINISH_DELAY : SLOW_FINISH_DELAY;
  const readyBeat = apiReady ? FAST_READY_BEAT : SLOW_READY_BEAT;

  useEffect(() => {
    const iv = setInterval(() => {
      setStep((s) => {
        if (s >= steps.length) {
          clearInterval(iv);
          return s;
        }
        return s + 1;
      });
    }, stepInterval);
    return () => clearInterval(iv);
  }, [steps.length, stepInterval]);

  useEffect(() => {
    if (step >= steps.length && !stepsFinished) {
      const t = setTimeout(() => setStepsFinished(true), finishDelay);
      return () => clearTimeout(t);
    }
  }, [step, stepsFinished, steps.length, finishDelay]);

  useEffect(() => {
    if (stepsFinished && onReady && !complete) setComplete(true);
  }, [stepsFinished, onReady, complete]);

  useEffect(() => {
    if (complete && onReady && !calledRef.current) {
      calledRef.current = true;
      const t = setTimeout(onReady, readyBeat);
      return () => clearTimeout(t);
    }
  }, [complete, onReady, readyBeat]);

  return (
    <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
      <div
        className="max-w-xl w-full"
        role="status"
        aria-live="polite"
      >
        <div className="kicker-row">
          <span className="kicker-tick" aria-hidden="true" />
          <span className="kicker-label">
            {complete ? "Ready" : "Generating"}
          </span>
        </div>

        {complete ? (
          <>
            <h1 className="font-bold leading-[1.05] mb-4 display-md">
              Your AI canvas is ready
            </h1>
            <p className="text-sm" style={{ color: C.darkGray, lineHeight: 1.55 }}>
              Opening now…
            </p>
          </>
        ) : (
          <>
            <h1 className="font-bold leading-[1.05] mb-3 display-md">
              {functionName ? `Ideas for ${functionName}` : "Generating ideas"}
            </h1>
            <p className="text-sm mb-10" style={{ color: C.darkGray, lineHeight: 1.55 }}>
              We're brainstorming use cases across all 6 primitive categories
              based on your answers. Takes 10–15 seconds.
            </p>

            <hr className="border-0 h-px mb-8" style={{ background: C.lightGray }} />

            <ol className="space-y-3">
              {steps.map((s, i) => {
                const done = i < step;
                const active = i === step;
                const name = items[i].title;
                return (
                  <li
                    key={i}
                    className="flex items-start gap-4"
                    style={{
                      opacity: done ? 0.55 : active ? 1 : 0.25,
                      transition: "opacity 0.4s ease",
                    }}
                  >
                    <span
                      className="flex-shrink-0 mt-0.5"
                      style={
                        active
                          ? { animation: "spin 1.5s linear infinite", display: "inline-flex" }
                          : { display: "inline-flex" }
                      }
                      aria-hidden="true"
                    >
                      {done ? (
                        <CheckCircle2 size={18} color={C.red} />
                      ) : active ? (
                        <Loader2 size={18} color={C.red} />
                      ) : (
                        <Circle size={18} color={C.lightGray} />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-semibold text-sm"
                        style={{ color: active || done ? C.black : C.gray500 }}
                      >
                        {name}
                      </p>
                      {(done || active) && (
                        <p
                          className="text-xs mt-1 italic"
                          style={{ color: C.darkGray, lineHeight: 1.5 }}
                        >
                          {s.tip}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Progress bar — uses transform: scaleX (no layout property animation) */}
            <div
              className="mt-10 relative h-px overflow-hidden"
              style={{ background: C.lightGray }}
            >
              <div
                className="absolute inset-0"
                style={{
                  transformOrigin: "left center",
                  transform: `scaleX(${Math.min(step / steps.length, 1)})`,
                  background: C.red,
                  transition: "transform 0.4s ease",
                }}
              />
            </div>

            {stepsFinished && (
              <p
                className="mt-6 text-xs uppercase tracking-[0.22em] font-semibold animate-fade-in"
                style={{ color: C.red }}
              >
                Building your canvas…
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
