// Live roster of participants for the admin board.
// Shows phase chip, idea/star counts, time-in-phase, and idle indicator
// (yellow dot when last activity > 90s ago).

import { useEffect, useState } from "react";
import { C } from "../../config/constants";

export default function RosterPanel({ participants }) {
  // Re-render every 15s so "X min in Canvas" / "idle" indicators stay fresh
  // even when nothing else in the dashboard changes.
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(iv);
  }, []);

  if (!participants || participants.length === 0) {
    return (
      <div
        className="border-2 border-dashed py-10 px-6 text-center"
        style={{ borderColor: C.lightGray }}
      >
        <h3 className="text-lg font-bold tracking-tight mb-2">No participants yet</h3>
        <p className="text-sm text-neutral-600">
          Share the participant URL above. As people join, they'll appear here with live status.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {participants.map((p) => (
        <RosterRow key={p._id} participant={p} />
      ))}
    </div>
  );
}

function RosterRow({ participant }) {
  const now = Date.now();
  const inPhaseMs = now - (participant.phaseEnteredAt ?? participant.createdAt);
  const idleMs = now - (participant.lastActivityAt ?? participant.createdAt);
  const isIdle = idleMs > 90 * 1000 && participant.phase !== "locked";

  const phaseLabel = {
    intake: "Intake",
    canvas: "Canvas",
    locked: "Locked",
  }[participant.phase];

  const phaseColors = {
    intake: { bg: "#f5f5f5", color: C.darkGray },
    canvas: { bg: "rgba(0,163,224,0.12)", color: C.electricBlue },
    locked: { bg: "rgba(0,163,224,0.18)", color: C.electricBlue },
  }[participant.phase] ?? { bg: "#f5f5f5", color: C.darkGray };

  return (
    <div
      className="flex items-center gap-3 p-3 border"
      style={{ borderColor: C.lightGray }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm">{participant.name}</span>
          <span className="text-xs text-neutral-500 font-mono">{participant.slug}</span>
          {isIdle && (
            <span
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: "#b45309" }}
              title="No activity for >90s"
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: "#facc15" }}
              />
              idle {humanMs(idleMs)}
            </span>
          )}
        </div>
        <div className="text-xs text-neutral-600 mt-1 flex gap-3 flex-wrap">
          <span>
            {participant.ideaCount} ideas, {participant.starCount} starred
          </span>
          {participant.phase !== "locked" && (
            <span>{humanMs(inPhaseMs)} in {phaseLabel}</span>
          )}
        </div>
      </div>
      <span
        className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
        style={{ background: phaseColors.bg, color: phaseColors.color }}
      >
        {phaseLabel}
      </span>
    </div>
  );
}

function humanMs(ms) {
  if (ms < 60_000) return `<1 min`;
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h`;
}
