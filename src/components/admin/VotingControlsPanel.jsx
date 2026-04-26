// Admin voting controls: configure votesPerParticipant, open/close voting,
// see live tallies while voting is open, see final ranked results after close.

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Vote, Lock, RotateCcw } from "lucide-react";
import { C } from "../../config/constants";

export default function VotingControlsPanel({ session, adminKey }) {
  const tallies = useQuery(api.votes.getAdminTallies, {
    sessionId: session._id,
    adminKey,
  });
  const openVoting = useMutation(api.votes.openVoting);
  const closeVoting = useMutation(api.votes.closeVoting);

  const [budget, setBudget] = useState(session.votesPerParticipant ?? 3);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session.votesPerParticipant && session.votesPerParticipant !== budget) {
      setBudget(session.votesPerParticipant);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.votesPerParticipant]);

  const status = session.votingStatus;
  const isIdle = status === "idle";
  const isOpen = status === "open";
  const isClosed = status === "closed_with_results";

  const onOpen = async () => {
    if (budget < 1) return;
    setSubmitting(true);
    setError(null);
    try {
      await openVoting({
        sessionId: session._id,
        adminKey,
        votesPerParticipant: budget,
      });
    } catch (err) {
      setError(err?.message ?? "Could not open voting. Try again?");
    } finally {
      setSubmitting(false);
    }
  };

  const onClose = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await closeVoting({ sessionId: session._id, adminKey });
    } catch (err) {
      setError(err?.message ?? "Could not close voting. Try again?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="border p-4"
      style={{ borderColor: C.lightGray, background: C.surface }}
    >
      <h3 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
        <Vote size={14} /> Voting
      </h3>

      {isIdle && (
        <div className="space-y-3">
          <p className="text-xs text-neutral-600">
            Open a voting round so the team can pick the deduplicated ideas they most want to do. One vote per idea per person; the budget below caps total votes per person.
          </p>
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-neutral-700">
              Votes per participant
            </span>
            <div className="flex gap-2">
              {[3, 5, 7].map((n) => (
                <button
                  key={n}
                  onClick={() => setBudget(n)}
                  className="px-3 py-1.5 text-xs font-semibold border"
                  style={{
                    background: budget === n ? C.black : C.white,
                    color: budget === n ? C.white : C.black,
                    borderColor: C.black,
                  }}
                >
                  {n}
                </button>
              ))}
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Math.max(1, Number(e.target.value) || 1))}
                min={1}
                max={50}
                className="w-20 px-3 py-1.5 text-xs border"
                style={{ borderColor: C.lightGray }}
              />
            </div>
          </label>
          <button
            onClick={onOpen}
            disabled={submitting || budget < 1}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
            style={{ background: C.red, color: C.white }}
          >
            {submitting ? "Opening…" : "Open voting round"}
          </button>
        </div>
      )}

      {isOpen && (
        <div className="space-y-3">
          <div
            className="px-3 py-2 text-xs"
            style={{ background: "rgba(0,163,224,0.08)", color: C.darkGray }}
          >
            Voting is <strong>open</strong>. Budget: {tallies?.votesPerParticipant ?? budget} per person ·{" "}
            <strong>{tallies?.totalVotes ?? 0}</strong> votes cast so far.
            Participants see voteable ideas; tallies are hidden from them.
          </div>
          {tallies?.ranked && tallies.ranked.length > 0 && (
            <details className="border" style={{ borderColor: C.lightGray }}>
              <summary className="px-3 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-white">
                Live tally (admin-only) — show
              </summary>
              <ul className="px-3 pb-3 pt-1 space-y-1">
                {tallies.ranked.map((c) => (
                  <li
                    key={c.id}
                    className="text-xs flex items-baseline justify-between gap-3"
                  >
                    <span className="flex-1 truncate" title={c.title}>
                      {c.title}
                    </span>
                    <span className="font-mono tabular-nums">
                      {c.voteCount}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-2"
            style={{ background: C.red, color: C.white }}
          >
            <Lock size={12} />
            {submitting ? "Closing…" : "Close voting & reveal results"}
          </button>
        </div>
      )}

      {isClosed && (
        <div className="space-y-3">
          <div
            className="px-3 py-2 text-xs"
            style={{ background: C.starredBg, color: C.darkGray }}
          >
            Voting is <strong>closed</strong>. Final ranked list is visible on the participant boards and presentation view.
          </div>
          <button
            onClick={onOpen}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border inline-flex items-center gap-2"
            style={{ borderColor: C.black, color: C.black }}
          >
            <RotateCcw size={12} />
            {submitting ? "Re-opening…" : "Re-open voting"}
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="text-xs px-3 py-2 mt-3 border-l-4"
          style={{ borderColor: C.red, background: C.redLight, color: C.darkGray }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
