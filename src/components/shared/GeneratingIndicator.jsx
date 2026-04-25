// Animates through the 6 primitive categories one at a time so the user
// feels the AI is working through each. Adapted from the original AI Playbook
// indicator — playbook (5-rules) mode dropped since Team Primitives only
// generates AI-use-case canvases.
//
// Total animation: 6 steps × 2200ms = ~13.2s of stepping, then a brief
// "ready" beat. If the actual generateCanvas action finishes earlier, the
// parent should wait for `onReady` to fire before transitioning.

import { useState, useEffect, useRef } from "react";
import { Sparkles, CheckCircle2, Loader2, Circle } from "lucide-react";
import { C } from "../../config/constants";
import { CATEGORIES, PRIMITIVES_GEN_STEPS } from "../../config/categories";

export default function GeneratingIndicator({ onReady }) {
  const steps = PRIMITIVES_GEN_STEPS;
  const items = CATEGORIES;
  const title = "Discovering AI use cases";
  const subtitle = "Brainstorming ideas for your function...";
  const readyTitle = "Your AI use cases are ready";

  const [step, setStep] = useState(0);
  const [stepsFinished, setStepsFinished] = useState(false);
  const [complete, setComplete] = useState(false);
  const calledRef = useRef(false);

  useEffect(() => {
    const iv = setInterval(() => {
      setStep((s) => {
        if (s >= steps.length) {
          clearInterval(iv);
          return s;
        }
        return s + 1;
      });
    }, 2200);
    return () => clearInterval(iv);
  }, [steps.length]);

  useEffect(() => {
    if (step >= steps.length && !stepsFinished) {
      const t = setTimeout(() => setStepsFinished(true), 600);
      return () => clearTimeout(t);
    }
  }, [step, stepsFinished, steps.length]);

  useEffect(() => {
    if (stepsFinished && onReady && !complete) setComplete(true);
  }, [stepsFinished, onReady, complete]);

  useEffect(() => {
    if (complete && onReady && !calledRef.current) {
      calledRef.current = true;
      const t = setTimeout(onReady, 1200);
      return () => clearTimeout(t);
    }
  }, [complete, onReady]);

  return (
    <div className={`generating-container ${complete ? "generating-complete" : ""}`}>
      <div className="gen-card">
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
                    width: `${Math.min(
                      Math.round((step / steps.length) * 100),
                      100
                    )}%`,
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
