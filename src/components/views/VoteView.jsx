// Participant voting screen.
// Vote unit = deduplicated idea (= synthesis cluster). Each idea is a
// voteable card; vote toggles store/remove a vote on the cluster's anchor
// ideaId. Sticky budget chip at top, sticky cluster section headers.

import { useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CATEGORIES } from "../../config/categories";
import { C } from "../../config/constants";

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
      }
    } else {
      if (allUsed) return;
      try {
        await castVote({ participantId: participant._id, ideaId: anchorIdeaId });
      } catch (err) {
        console.error("Cast vote failed", err);
      }
    }
  };

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Sticky budget chip */}
      <div
        className="sticky top-0 z-40 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
        style={{ background: C.black, color: C.white }}
      >
        {allUsed ? (
          <>
            <span className="tabular-nums">{used}/{budget}</span> — all votes in ✓
          </>
        ) : (
          <>
            <span className="tabular-nums">{used}/{budget}</span> votes used
          </>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          Vote for your team's top ideas
        </h1>
        <p className="text-sm text-neutral-700 mb-8 leading-relaxed">
          You have <strong>{budget} {budget === 1 ? "vote" : "votes"}</strong>. One vote per idea. Pick the ideas you most want to see <strong>{session.functionName}</strong> actually do.
        </p>

        <div className="space-y-10">
          {filledCategories.map((cat) => {
            const ideas = ideasByCategory[cat.id];
            return (
              <section key={cat.id}>
                <div
                  className="sticky top-12 z-30 -mx-6 px-6 py-2 flex items-center gap-2 backdrop-blur"
                  style={{ background: "rgba(255,255,255,0.95)", borderBottom: `1px solid ${C.lightGray}` }}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: cat.color }}
                  />
                  <h2 className="text-sm font-bold tracking-tight uppercase">
                    {cat.title}
                  </h2>
                  <span className="text-xs text-neutral-500 ml-auto">
                    {ideas.length}
                  </span>
                </div>
                <div className="space-y-3 mt-3">
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
                        accentColor={cat.color}
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

        <p className="text-xs italic text-neutral-500 mt-12 mb-6">
          Votes remain hidden from the team until your admin closes voting.
        </p>
      </div>
    </main>
  );
}

function VoteableCard({ title, summary, contributorCount, accentColor, voted, disabled, onToggle }) {
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
