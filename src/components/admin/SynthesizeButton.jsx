// Synthesize button — gated by lockedCount >= 2, shows different label
// for first run vs. re-synthesize. Renders an inline error if the action fails.

import { useState } from "react";
import { Sparkles, RotateCw, AlertTriangle } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { C } from "../../config/constants";
import StatusBlock from "../shared/StatusBlock";

export default function SynthesizeButton({ sessionId, adminKey, lockedCount, hasExisting, isRunning }) {
  const synthesize = useAction(api.ai.synthesize.run);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const ready = lockedCount >= 2 && !isRunning && !submitting;

  const onClick = async () => {
    if (!ready) return;
    setSubmitting(true);
    setError(null);
    try {
      await synthesize({ sessionId, adminKey });
    } catch (err) {
      setError(err?.message ?? "Synthesis failed. Try again?");
    } finally {
      setSubmitting(false);
    }
  };

  let label;
  if (submitting || isRunning) {
    label = "Synthesizing…";
  } else if (lockedCount < 2) {
    label = `Synthesize (need at least 2 locked, have ${lockedCount})`;
  } else if (hasExisting) {
    label = "Re-synthesize (incorporate latest stars)";
  } else {
    label = "Synthesize team ideas";
  }

  return (
    <div className="space-y-3">
      <button
        onClick={onClick}
        disabled={!ready}
        className="w-full sm:w-auto px-6 py-3 text-sm font-semibold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        style={{ background: C.red, color: C.white }}
      >
        {hasExisting ? <RotateCw size={14} /> : <Sparkles size={14} />}
        {label}
      </button>
      {error && (
        <StatusBlock
          variant="alert"
          kicker="Synthesis failed"
          icon={<AlertTriangle size={16} />}
        >
          {error}
        </StatusBlock>
      )}
    </div>
  );
}
