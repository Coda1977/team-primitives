import { useState, useEffect, useRef } from "react";
import { BookOpen, Sparkles, CheckCircle2, Loader2, Circle } from "lucide-react";
import { C } from "../../config/constants";
import { CATEGORIES, PRIMITIVES_GEN_STEPS } from "../../config/categories";
import { RULES, PLAYBOOK_GEN_STEPS } from "../../config/rules";

export default function GeneratingIndicator({ mode, onReady }) {
  const isPrimitives = mode === "primitives";
  const steps = isPrimitives ? PRIMITIVES_GEN_STEPS : PLAYBOOK_GEN_STEPS;
  const items = isPrimitives ? CATEGORIES : RULES;
  const title = isPrimitives ? "Discovering AI use cases" : "Writing your change strategy";
  const subtitle = isPrimitives ? "Brainstorming ideas for your role..." : "Personalizing your actions...";
  const readyTitle = isPrimitives ? "Your AI use cases are ready" : "Your change strategy is ready";

  const [step, setStep] = useState(0);
  const [stepsFinished, setStepsFinished] = useState(false);
  const [complete, setComplete] = useState(false);
  const calledRef = useRef(false);

  useEffect(() => {
    const iv = setInterval(() => {
      setStep((s) => {
        if (s >= steps.length) { clearInterval(iv); return s; }
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
            <h2 className="generating-title" style={{ marginTop: 20 }}>{readyTitle}</h2>
            <p className="generating-subtitle" style={{ opacity: 0.7 }}>Opening now...</p>
          </div>
        ) : (
          <>
            <div className="generating-icon">
              {isPrimitives ? <Sparkles size={32} color={C.red} /> : <BookOpen size={32} color={C.red} />}
            </div>
            <h2 className="generating-title">{title}</h2>
            <p className="generating-subtitle">{subtitle}</p>
            <div className="generating-steps">
              {steps.map((s, i) => {
                const done = i < step;
                const active = i === step;
                const name = isPrimitives
                  ? `${items[i].title}`
                  : `Rule ${s.rule}: ${items[i].name}`;
                return (
                  <div key={i} className={`gen-step ${done ? "gen-done" : active ? "gen-active" : "gen-future"}`}>
                    <div className={`gen-step-icon ${active ? "gen-step-icon-active" : ""}`}>
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
                      {(done || active) && <div className="gen-step-tip animate-fade-in">{s.tip}</div>}
                    </div>
                  </div>
                );
              })}
              <div className="gen-progress-bar">
                <div className="gen-progress-fill" style={{ width: `${Math.min(Math.round((step / steps.length) * 100), 100)}%` }} />
              </div>
              <div className="gen-progress-label">{Math.min(Math.round((step / steps.length) * 100), 100)}%</div>
            </div>
            {stepsFinished && (
              <div className="gen-building animate-fade-in">
                <Loader2 size={16} color={C.red} className="spinning" />
                <span>{isPrimitives ? "Building your AI use cases..." : "Building your personalized strategy..."}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
