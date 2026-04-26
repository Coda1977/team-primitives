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

export default function VoteView({ session, participant }) {
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
        <p className="text-sm text-neutral-500">Loading the team's ideas…</p>
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
          err?.message ?? "Couldn't remove that vote — try again."
        );
      }
    } else {
      if (allUsed) return;
      try {
        await castVote({ participantId: participant._id, ideaId: anchorIdeaId });
      } catch (err) {
        console.error("Cast vote failed", err);
        showToast(
          err?.message ?? "Vote didn't go through — try again."
        );
      }
    }
  };

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Sticky budget chip */}
      <div
        className="sticky top-0 z-40 px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.28em]"
        style={{ background: C.black, color: C.white }}
      >
        {allUsed ? (
          <>
            <span className="tabular-nums">{used}/{budget}</span>
            <span className="mx-2" style={{ color: "#666" }}>·</span>
            All votes in ✓
          </>
        ) : (
          <>
            <span className="tabular-nums">{used}/{budget}</span>
            <span className="mx-2" style={{ color: "#666" }}>·</span>
            Votes used
          </>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-12 pb-16">
        <div className="mb-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-neutral-500 mb-4">
            Voting · {budget} {budget === 1 ? "vote" : "votes"} per person
          </p>
          <h1
            className="font-bold leading-[1.05] tracking-tight mb-5"
            style={{
              fontSize: "clamp(2rem, 4vw, 2.75rem)",
              letterSpacing: "-0.025em",
            }}
          >
            Vote for your team's top ideas
          </h1>
          <p
            className="leading-relaxed max-w-xl"
            style={{
              fontSize: "1.0625rem",
              color: C.darkGray,
            }}
          >
            One vote per idea. Pick the ideas you most want to see{" "}
            <strong style={{ color: C.black }}>{session.functionName}</strong>{" "}
            actually do.
          </p>
        </div>

        <hr className="mb-10 border-0 h-px" style={{ background: C.lightGray }} />

        <div className="space-y-12">
          {filledCategories.map((cat) => {
            const ideas = ideasByCategory[cat.id];
            return (
              <section key={cat.id}>
                <div
                  className="sticky z-30 -mx-6 px-6 py-3 flex items-center gap-3 backdrop-blur"
                  style={{
                    top: "3.25rem",
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
  return (
    <div
      className="flex items-start gap-3 border p-4"
      style={{
        borderColor: voted ? C.red : C.lightGray,
        background: voted ? C.starredBg : C.white,
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-snug">{title}</p>
        {summary && (
          <p className="text-sm text-neutral-600 mt-1 leading-relaxed">{summary}</p>
        )}
        {contributorCount >= 2 && (
          <p className="text-xs text-neutral-500 mt-2">
            {contributorCount} teammates suggested versions of this
          </p>
        )}
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        style={{
          background: voted ? C.red : "transparent",
          color: voted ? C.white : C.black,
          borderColor: voted ? C.red : C.black,
          minWidth: 84,
          minHeight: 44,
        }}
        aria-label={voted ? `Remove vote for: ${title}` : `Vote for: ${title}`}
      >
        {voted ? "✓ Voted" : "Vote"}
      </button>
    </div>
  );
}
