// Participant voting screen.
// Vote unit = deduplicated idea (= synthesis cluster). Each idea is a
// voteable card; vote toggles store/remove a vote on the cluster's anchor
// ideaId. Sticky budget chip at top, sticky cluster section headers.

import { useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CATEGORIES } from "../../config/categories";
import { C } from "../../config/constants";
import { useToast } from "../../context/useToast";

export default function VoteView({ session, participant, embedded = false }) {
  const synthesis = useQuery(api.synthesis.getLatestSynthesisForParticipant, {
    sessionId: session._id,
    participantId: participant._id,
  });
  const myVoteIdeaIds = useQuery(api.votes.listMyVotes, {
    participantId: participant._id,
  });
  const castVote = useMutation(api.votes.castVote);
  const removeVote = useMutation(api.votes.removeVote);
  const { showToast } = useToast();

  const budget = session.votesPerParticipant ?? 3;

  const myVoteSet = useMemo(() => {
    const s = new Set();
    for (const id of myVoteIdeaIds ?? []) s.add(id);
    return s;
  }, [myVoteIdeaIds]);

  // Sort ideas by category for the section layout
  const ideasByCategory = useMemo(() => {
    if (!synthesis?.clusters) return {};
    const grouped = {};
    for (const c of synthesis.clusters) {
      if (!grouped[c.categoryId]) grouped[c.categoryId] = [];
      grouped[c.categoryId].push(c);
    }
    // Within each category: alphabetical by title (stable, avoids primacy bias)
    for (const cat of Object.keys(grouped)) {
      grouped[cat].sort((a, b) => a.title.localeCompare(b.title));
    }
    return grouped;
  }, [synthesis]);

  const filledCategories = CATEGORIES.filter(
    (cat) => (ideasByCategory[cat.id] ?? []).length > 0
  );

  if (!synthesis || !myVoteIdeaIds) {
    return (
      <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
        <p
          className="text-sm uppercase tracking-[0.22em] font-semibold"
          style={{ color: C.gray500 }}
        >
          Loading the team's ideas…
        </p>
      </main>
    );
  }
  if (synthesis.clusters.length === 0) {
    return (
      <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="kicker-row" style={{ justifyContent: "center" }}>
            <span className="kicker-tick kicker-tick--sm" aria-hidden="true" />
            <span className="kicker-label kicker-label--sm">Nothing to vote on</span>
          </div>
          <p className="text-sm" style={{ color: C.darkGray, lineHeight: 1.55 }}>
            Synthesis returned no deduplicated ideas yet. Ask your facilitator
            to re-run synthesis once more participants have locked their stars.
          </p>
        </div>
      </main>
    );
  }

  const used = myVoteSet.size;
  const allUsed = used >= budget;

  const onToggle = async (anchorIdeaId) => {
    if (myVoteSet.has(anchorIdeaId)) {
      try {
        await removeVote({ participantId: participant._id, ideaId: anchorIdeaId });
      } catch (err) {
        console.error("Remove vote failed", err);
        showToast(
          err?.message ?? "Couldn't remove that vote, try again."
        );
      }
    } else {
      if (allUsed) return;
      try {
        await castVote({ participantId: participant._id, ideaId: anchorIdeaId });
      } catch (err) {
        console.error("Cast vote failed", err);
        showToast(
          err?.message ?? "Vote didn't go through, try again."
        );
      }
    }
  };

  // Sticky cluster header offset is the budget chip height. Pass it via
  // a CSS custom property so the value lives in one place; if the chip
  // ever wraps to 2 lines, this still works.
  const CLUSTER_TOP_OFFSET = "var(--vote-chip-h, 3.25rem)";

  return (
    <main
      className="min-h-screen bg-white text-black"
      style={{ "--vote-chip-h": "3.5rem" }}
    >
      {/* Sticky budget chip with kicker tick on the left edge */}
      <div
        className="sticky top-0 z-40 flex items-center justify-center gap-3 px-4 text-xs font-bold uppercase tracking-[0.28em]"
        style={{
          background: C.black,
          color: C.white,
          height: "var(--vote-chip-h)",
        }}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span
          className="inline-block w-1 h-4"
          aria-hidden="true"
          style={{ background: C.red }}
        />
        <span className="tabular-nums">{used}/{budget}</span>
        <span style={{ color: "rgba(255,255,255,0.4)" }}>·</span>
        <span>{allUsed ? "All votes in ✓" : "Votes used"}</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-12 pb-16">
        {!embedded && (
          <div className="mb-12">
            <div className="kicker-row">
              <span className="kicker-tick" aria-hidden="true" />
              <span className="kicker-label">
                Voting · {budget} {budget === 1 ? "vote" : "votes"} per person
              </span>
            </div>
            <h1 className="font-bold leading-[1.05] mb-5 display-md">
              Vote for your team's top ideas
            </h1>
            <p
              className="leading-relaxed max-w-xl"
              style={{ fontSize: "1.0625rem", color: C.darkGray }}
            >
              One vote per idea. Pick the ideas you most want to see{" "}
              <strong style={{ color: C.black }}>{session.functionName}</strong>{" "}
              actually do.
            </p>
          </div>
        )}

        {!embedded && (
          <hr className="mb-10 border-0 h-px" style={{ background: C.lightGray }} />
        )}

        <div className="space-y-12">
          {filledCategories.map((cat) => {
            const ideas = ideasByCategory[cat.id];
            return (
              <section key={cat.id}>
                <div
                  className="sticky z-30 -mx-6 px-6 py-3 flex items-center gap-3 backdrop-blur"
                  style={{
                    top: CLUSTER_TOP_OFFSET,
                    background: "rgba(255,255,255,0.92)",
                    borderBottom: `1px solid ${C.lightGray}`,
                  }}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: cat.color }}
                  />
                  <h2 className="text-[11px] font-bold tracking-[0.28em] uppercase">
                    {cat.title}
                  </h2>
                  <span
                    className="text-[10px] uppercase tracking-[0.18em] tabular-nums ml-auto"
                    style={{ color: C.gray500 }}
                  >
                    {ideas.length} {ideas.length === 1 ? "idea" : "ideas"}
                  </span>
                </div>
                <div className="space-y-3 mt-5">
                  {ideas.map((idea) => {
                    const anchorId = idea.memberIdeaIds[0];
                    const voted = myVoteSet.has(anchorId);
                    const disabled = !voted && allUsed;
                    return (
                      <VoteableCard
                        key={idea.id}
                        title={idea.title}
                        summary={idea.summary}
                        contributorCount={idea.participantIds.length}
                        voted={voted}
                        disabled={disabled}
                        onToggle={() => onToggle(anchorId)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <p
          className="text-xs italic mt-16 mb-4"
          style={{ color: C.gray500 }}
        >
          Votes remain hidden from the team until your admin closes voting.
        </p>
      </div>
    </main>
  );
}

function VoteableCard({ title, summary, contributorCount, voted, disabled, onToggle }) {
  // Voted = blue wash (distinct from starred ideas which use red wash on canvas).
  // Same data shape, different user-meaning, different visual marker.
  return (
    <div
      className="flex items-start gap-3 p-4"
      style={{
        background: voted ? C.votedBg : C.white,
        boxShadow: voted
          ? `inset 0 2px 0 0 ${C.electricBlue}`
          : `inset 0 1px 0 0 ${C.lightGray}`,
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-snug">{title}</p>
        {summary && (
          <p className="text-sm mt-1 leading-relaxed" style={{ color: C.darkGray }}>
            {summary}
          </p>
        )}
        {contributorCount >= 2 && (
          <p className="text-xs mt-2" style={{ color: C.gray500 }}>
            {contributorCount} teammates suggested versions of this
          </p>
        )}
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        style={{
          background: voted ? C.electricBlue : "transparent",
          color: voted ? C.white : C.black,
          border: `1px solid ${voted ? C.electricBlue : C.black}`,
          minWidth: 84,
          minHeight: "var(--touch-min)",
          transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
        }}
        aria-label={voted ? `Remove vote for: ${title}` : `Vote for: ${title}`}
      >
        {voted ? "✓ Voted" : "Vote"}
      </button>
    </div>
  );
}
