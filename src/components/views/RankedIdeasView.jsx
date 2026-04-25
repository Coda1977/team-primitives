// Final ranked-results view, used by:
//   - Participants in MyBoardView when votingStatus === "closed_with_results"
//   - PresentView post-vote
// Top-3 highlighted, full numbered list below, ties shown with shared rank +
// tie-break note. Render variant: "compact" for participant view, "stage" for
// presentation projection.

import { CATEGORIES } from "../../config/categories";
import { C } from "../../config/constants";

export default function RankedIdeasView({ ranked, participantCount, votesPerParticipant, variant = "compact" }) {
  if (!ranked || ranked.length === 0) {
    return (
      <p className="text-sm text-neutral-500 italic">
        No ranked results yet.
      </p>
    );
  }

  // Compute display ranks with tie handling (1, 2, 2, 4, ...)
  const withDisplayRank = [];
  let prevVoteCount = null;
  let prevRank = 0;
  ranked.forEach((idea, idx) => {
    if (idea.voteCount !== prevVoteCount) {
      prevRank = idx + 1;
      prevVoteCount = idea.voteCount;
    }
    withDisplayRank.push({ ...idea, rank: prevRank });
  });

  const top3 = withDisplayRank.filter((i) => i.rank <= 3).slice(0, Math.min(3, withDisplayRank.length));
  const rest = withDisplayRank.slice(top3.length);
  const hasTies = withDisplayRank.some((i, idx, arr) => idx > 0 && arr[idx - 1].voteCount === i.voteCount);

  const isStage = variant === "stage";

  return (
    <div className={isStage ? "space-y-12" : "space-y-8"}>
      {!isStage && participantCount && (
        <p className="text-sm text-neutral-700">
          Ranked by votes from all <strong>{participantCount}</strong> teammates ({votesPerParticipant} {votesPerParticipant === 1 ? "vote" : "votes"} each).
        </p>
      )}

      {/* Top-3 emphasis block */}
      {top3.length > 0 && (
        <section>
          <h3
            className={`uppercase tracking-[0.2em] text-neutral-600 mb-${isStage ? 6 : 4} ${isStage ? "text-sm" : "text-xs font-bold"}`}
          >
            Top {top3.length === 1 ? "result" : top3.length}
          </h3>
          <div
            className={`grid grid-cols-1 ${
              isStage ? "lg:grid-cols-3 gap-6" : "sm:grid-cols-3 gap-4"
            }`}
          >
            {top3.map((idea) => (
              <Top3Card key={idea.id} idea={idea} isStage={isStage} />
            ))}
          </div>
        </section>
      )}

      {/* Full ranked list */}
      {rest.length > 0 && (
        <section>
          <h3
            className={`uppercase tracking-[0.2em] text-neutral-600 mb-${isStage ? 5 : 3} ${isStage ? "text-sm" : "text-xs font-bold"}`}
          >
            All ranked ideas
          </h3>
          <div className={isStage ? "space-y-4" : "space-y-2"}>
            {rest.map((idea) => (
              <RankedRow key={idea.id} idea={idea} isStage={isStage} />
            ))}
          </div>
        </section>
      )}

      {hasTies && (
        <p className={`italic text-neutral-500 ${isStage ? "text-sm" : "text-xs"}`}>
          Ties broken by who first contributed the idea.
        </p>
      )}
    </div>
  );
}

function Top3Card({ idea, isStage }) {
  const cat = CATEGORIES.find((c) => c.id === idea.categoryId);
  const isWinner = idea.rank === 1;

  return (
    <div
      className="relative p-6"
      style={{
        background: isWinner ? C.starredBg : C.surface,
        borderTop: `4px solid ${cat?.color ?? C.electricBlue}`,
        transform: isWinner && isStage ? "scale(1.04)" : "none",
      }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <span
          className={`tabular-nums font-bold ${isStage ? "text-5xl" : "text-3xl"}`}
          style={{ color: isWinner ? C.red : C.darkGray }}
        >
          #{idea.rank}
        </span>
        <span
          className={`px-2 py-1 font-bold uppercase tracking-wider ${
            isStage ? "text-xs" : "text-[10px]"
          }`}
          style={{ background: C.black, color: C.white }}
        >
          {idea.voteCount} {idea.voteCount === 1 ? "vote" : "votes"}
        </span>
      </div>
      <p className={`font-bold leading-snug mb-2 ${isStage ? "text-xl" : "text-base"}`}>
        {idea.title}
      </p>
      {idea.summary && (
        <p
          className={`text-neutral-700 leading-relaxed mb-3 ${
            isStage ? "text-sm" : "text-xs"
          }`}
        >
          {idea.summary}
        </p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-block w-2 h-2 rounded-full`}
          style={{ background: cat?.color ?? C.electricBlue }}
        />
        <span className={`text-neutral-600 ${isStage ? "text-xs" : "text-[11px]"}`}>
          {cat?.title ?? idea.categoryId}
        </span>
        <span className="text-neutral-400 mx-1">·</span>
        <span className={`text-neutral-600 ${isStage ? "text-xs" : "text-[11px]"}`}>
          {idea.contributorNames.join(", ")}
        </span>
      </div>
    </div>
  );
}

function RankedRow({ idea, isStage }) {
  const cat = CATEGORIES.find((c) => c.id === idea.categoryId);
  return (
    <div
      className="flex items-baseline gap-4 py-3 border-b"
      style={{ borderColor: C.lightGray }}
    >
      <span
        className={`tabular-nums font-bold text-neutral-500 ${
          isStage ? "text-2xl w-12" : "text-base w-8"
        } flex-shrink-0`}
      >
        #{idea.rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold leading-snug ${isStage ? "text-base" : "text-sm"}`}>
          {idea.title}
        </p>
        <p className={`text-neutral-600 mt-0.5 ${isStage ? "text-xs" : "text-[11px]"}`}>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
            style={{ background: cat?.color ?? C.electricBlue }}
          />
          {cat?.title ?? idea.categoryId} · {idea.contributorNames.join(", ")}
        </p>
      </div>
      <span
        className={`px-2 py-1 font-bold uppercase tracking-wider whitespace-nowrap ${
          isStage ? "text-xs" : "text-[10px]"
        }`}
        style={{ background: C.surface, color: C.darkGray }}
      >
        {idea.voteCount} {idea.voteCount === 1 ? "vote" : "votes"}
      </span>
    </div>
  );
}
