// Animates through the 6 primitive categories one at a time so the user
// feels the AI is working through each. Adapted from the original AI Playbook
// indicator — playbook (5-rules) mode dropped since Team Primitives only
// generates AI-use-case canvases.
//
// Cadence:
// - Slow path (default): 2200ms per step → ~13.2s total. Builds anticipation
//   when the API is genuinely working.
// - Fast path (`apiReady` flips true): remaining steps fly by at ~220ms each,
//   the post-steps pause shrinks to 200ms, and the ready beat shrinks to 400ms.
//   This kicks in when the participant.phase has already advanced to "canvas"
//   — i.e., the action returned faster than the animation.

import { useState, useEffect, useRef } from "react";
import { Sparkles, CheckCircle2, Loader2, Circle } from "lucide-react";
import { C } from "../../config/constants";
import { CATEGORIES, PRIMITIVES_GEN_STEPS } from "../../config/categories";

const SLOW_STEP_MS = 2200;
const FAST_STEP_MS = 220;
const SLOW_FINISH_DELAY = 600;
const FAST_FINISH_DELAY = 200;
const SLOW_READY_BEAT = 1200;
const FAST_READY_BEAT = 400;

export default function GeneratingIndicator({ onReady, apiReady = false }) {
  const steps = PRIMITIVES_GEN_STEPS;
  const items = CATEGORIES;
  const title = "Discovering AI use cases";
  const subtitle = "Brainstorming ideas for your function...";
  const readyTitle = "Your AI use cases are ready";

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
    <div className={`generating-container ${complete ? "generating-complete" : ""}`}>
      <div className="gen-card" role="status" aria-live="polite">
        {complete ? (
          <div className="ready-beat animate-fade-in">
            <div className="ready-check">
              <CheckCircle2 size={48} color={C.red} />
            </div>
            <h2 className="generating-title" style={{ marginTop: 20 }}>
              {readyTitle}
            </h2>
            <p className="generating-subtitle" style={{ opacity: 0.7 }}>
              Opening now...
            </p>
          </div>
        ) : (
          <>
            <div className="generating-icon">
              <Sparkles size={32} color={C.red} />
            </div>
            <h2 className="generating-title">{title}</h2>
            <p className="generating-subtitle">{subtitle}</p>
            <div className="generating-steps">
              {steps.map((s, i) => {
                const done = i < step;
                const active = i === step;
                const name = items[i].title;
                return (
                  <div
                    key={i}
                    className={`gen-step ${
                      done ? "gen-done" : active ? "gen-active" : "gen-future"
                    }`}
                  >
                    <div
                      className={`gen-step-icon ${
                        active ? "gen-step-icon-active" : ""
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 size={18} color={C.red} />
                      ) : active ? (
                        <Loader2 size={18} color={C.red} className="spinning" />
                      ) : (
                        <Circle size={18} color={C.border} />
                      )}
                    </div>
                    <div>
                      <div className="gen-step-name">{name}</div>
                      {(done || active) && (
                        <div className="gen-step-tip animate-fade-in">{s.tip}</div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="gen-progress-bar">
                <div
                  className="gen-progress-fill"
                  style={{
                    "--progress": Math.min(step / steps.length, 1),
                  }}
                />
              </div>
              <div className="gen-progress-label">
                {Math.min(Math.round((step / steps.length) * 100), 100)}%
              </div>
            </div>
            {stepsFinished && (
              <div className="gen-building animate-fade-in">
                <Loader2 size={16} color={C.red} className="spinning" />
                <span>Building your AI use cases...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
