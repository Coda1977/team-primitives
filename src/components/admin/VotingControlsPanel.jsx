// Admin voting controls: configure votesPerParticipant, open/close voting,
// see live tallies while voting is open, see final ranked results after close.

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Vote, Lock, RotateCcw } from "lucide-react";
import { C } from "../../config/constants";
import StatusBlock from "../shared/StatusBlock";

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

  const onCloseVoting = async () => {
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

  // Each state gets its own architecture so the panel reads as a different
  // moment of the workshop rather than "same shell, different copy."
  if (isIdle) {
    return (
      <div>
        <div className="kicker-row">
          <span className="kicker-tick" aria-hidden="true" />
          <span className="kicker-label">Step 4 · Open voting</span>
        </div>
        <h3 className="font-bold leading-tight mb-3" style={{ fontSize: "1.5rem", letterSpacing: "-0.015em" }}>
          Choose vote budget
        </h3>
        <p className="text-sm mb-6" style={{ color: C.darkGray, lineHeight: 1.55 }}>
          Each teammate spends up to this many votes on the team's deduplicated
          ideas. One vote per idea per person.
        </p>
        <label className="block mb-6">
          <span className="block text-[10px] font-bold uppercase tracking-[0.22em] mb-2" style={{ color: C.darkGray }}>
            Votes per participant
          </span>
          <div className="flex gap-2 flex-wrap">
            {[3, 5, 7].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBudget(n)}
                className="px-4 text-sm font-bold tabular-nums touch-min"
                style={{
                  background: budget === n ? C.black : C.white,
                  color: budget === n ? C.white : C.black,
                  border: `1px solid ${C.black}`,
                  cursor: "pointer",
                  transition: "background 0.15s ease, color 0.15s ease",
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
              aria-label="Custom vote budget"
              className="w-20 px-3 text-sm tabular-nums"
              style={{
                border: `1px solid ${C.lightGray}`,
                minHeight: "var(--touch-min)",
              }}
            />
          </div>
        </label>
        <button
          type="button"
          onClick={onOpen}
          disabled={submitting || budget < 1}
          className="inline-flex items-center gap-2 px-6 text-xs font-bold uppercase tracking-[0.22em] disabled:opacity-50 touch-min"
          style={{ background: C.red, color: C.white, border: "none", cursor: "pointer" }}
        >
          <Vote size={14} />
          {submitting ? "Opening…" : "Open voting round"}
        </button>
        {error && (
          <div className="mt-4">
            <StatusBlock variant="alert" kicker="Couldn't open voting" compact>
              {error}
            </StatusBlock>
          </div>
        )}
      </div>
    );
  }

  if (isOpen) {
    return (
      <div>
        <div className="kicker-row">
          <span className="kicker-tick" aria-hidden="true" />
          <span className="kicker-label" style={{ color: C.red }}>
            Live · Voting open
          </span>
        </div>
        <h3 className="font-bold leading-tight mb-3" style={{ fontSize: "1.5rem", letterSpacing: "-0.015em" }}>
          {tallies?.totalVotes ?? 0} {(tallies?.totalVotes ?? 0) === 1 ? "vote" : "votes"} cast
        </h3>
        <p className="text-sm mb-6" style={{ color: C.darkGray, lineHeight: 1.55 }}>
          Budget {tallies?.votesPerParticipant ?? budget} per person. Participants
          see voteable ideas; the tally below is admin-only.
        </p>

        {tallies?.ranked && tallies.ranked.length > 0 && (
          <div
            className="mb-6 border-t"
            style={{ borderColor: C.lightGray }}
          >
            <ul className="pt-3 space-y-1.5">
              {tallies.ranked.map((c) => (
                <li
                  key={c.id}
                  className="text-xs flex items-baseline justify-between gap-3"
                >
                  <span className="flex-1 truncate" title={c.title}>
                    {c.title}
                  </span>
                  <span className="font-mono tabular-nums font-bold tabular-nums">
                    {c.voteCount}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={onCloseVoting}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 text-xs font-bold uppercase tracking-[0.22em] disabled:opacity-50 touch-min"
          style={{ background: C.black, color: C.white, border: "none", cursor: "pointer" }}
        >
          <Lock size={12} />
          {submitting ? "Closing…" : "Close voting & reveal"}
        </button>
        {error && (
          <div className="mt-4">
            <StatusBlock variant="alert" kicker="Voting error" compact>
              {error}
            </StatusBlock>
          </div>
        )}
      </div>
    );
  }

  if (isClosed) {
    return (
      <div>
        <div className="kicker-row">
          <span className="kicker-tick" aria-hidden="true" />
          <span className="kicker-label">Voting closed</span>
        </div>
        <p className="text-sm mb-5" style={{ color: C.darkGray, lineHeight: 1.55 }}>
          Final ranked list is visible on the participant boards and the
          presentation view. The exports are below.
        </p>
        <button
          type="button"
          onClick={onOpen}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-4 text-xs font-semibold uppercase tracking-[0.22em] touch-min"
          style={{
            background: "transparent",
            border: `1px solid ${C.lightGray}`,
            color: C.darkGray,
            cursor: "pointer",
          }}
        >
          <RotateCcw size={12} />
          {submitting ? "Re-opening…" : "Re-open voting"}
        </button>
        {error && (
          <div className="mt-4">
            <StatusBlock variant="alert" kicker="Voting error" compact>
              {error}
            </StatusBlock>
          </div>
        )}
      </div>
    );
  }

  return null;
}
