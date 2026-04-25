// Read-only personal board shown after the participant locks their stars.
// Phase B step 13. Phase D will add tab toggles for Team board / Vote / Final results.

import { useMemo } from "react";
import { Star, Download } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CATEGORIES } from "../../config/categories";
import { C } from "../../config/constants";
import { clearParticipantId } from "../../utils/localParticipant";

export default function MyBoardView({ session, participant }) {
  const canvas = useQuery(api.canvas.getMyCanvas, {
    participantId: participant._id,
  });

  const stats = useMemo(() => {
    let total = 0;
    let starred = 0;
    if (canvas) {
      for (const cat of CATEGORIES) {
        const arr = canvas[cat.id] ?? [];
        total += arr.length;
        starred += arr.filter((i) => i.starred).length;
      }
    }
    return { total, starred };
  }, [canvas]);

  if (canvas === undefined) {
    return (
      <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
        <p className="text-sm text-neutral-500">Loading your board…</p>
      </main>
    );
  }

  const onReset = () => {
    if (
      window.confirm(
        "Clear local session? You'll need to re-enter your name on this device."
      )
    ) {
      clearParticipantId(session.code);
      window.location.href = `/s/${session.code}/join`;
    }
  };

  return (
    <main className="min-h-screen bg-white text-black px-6 py-8">
      <header
        className="max-w-3xl mx-auto mb-8 flex items-center justify-between text-xs text-neutral-500 border-b pb-3"
        style={{ borderColor: C.lightGray }}
      >
        <span>
          {session.functionName} · {participant.name}
        </span>
        <span aria-label="online" title="online">●</span>
      </header>

      <div className="max-w-3xl mx-auto">
        <div
          className="border-l-4 px-5 py-4 mb-8"
          style={{ borderColor: C.electricBlue, background: "rgba(0,163,224,0.06)" }}
        >
          <h1 className="text-2xl font-bold tracking-tight">
            Your contribution is locked in ✓
          </h1>
          <p className="text-sm text-neutral-700 mt-2">
            You starred <strong>{stats.starred}</strong> of <strong>{stats.total}</strong> ideas. The team board, voting, and final results will appear here once your admin runs the next phases.
          </p>
        </div>

        <div className="space-y-8">
          {CATEGORIES.map((cat) => {
            const ideas = canvas[cat.id] ?? [];
            if (ideas.length === 0) return null;
            return (
              <section key={cat.id}>
                <h2 className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: cat.color }}
                  />
                  {cat.number}. {cat.title}
                </h2>
                <div className="space-y-2">
                  {ideas.map((idea) => (
                    <div
                      key={idea._id}
                      className={`flex items-start gap-3 p-3 border ${
                        idea.starred ? "" : "bg-neutral-50"
                      }`}
                      style={{
                        borderColor: idea.starred ? C.red : C.lightGray,
                        background: idea.starred ? C.starredBg : undefined,
                      }}
                    >
                      <Star
                        size={18}
                        className="flex-shrink-0 mt-0.5"
                        fill={idea.starred ? C.red : "none"}
                        color={idea.starred ? C.red : C.gray300}
                      />
                      <p className="text-sm leading-relaxed flex-1">{idea.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div
          className="mt-12 pt-6 border-t flex items-center justify-between flex-wrap gap-3"
          style={{ borderColor: C.lightGray }}
        >
          <button
            disabled
            className="px-5 py-3 text-sm font-semibold uppercase tracking-wider opacity-50 cursor-not-allowed border flex items-center gap-2"
            style={{ borderColor: C.lightGray }}
            title="Personal docx export — coming in Phase E polish"
          >
            <Download size={14} /> Download my ideas (Word)
          </button>
          <button
            onClick={onReset}
            className="text-xs text-neutral-500 hover:text-black underline"
          >
            Not you? Reset and re-enter your name
          </button>
        </div>
      </div>
    </main>
  );
}
