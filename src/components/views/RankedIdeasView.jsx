// Final ranked-results view, used by:
//   - Participants in MyBoardView when votingStatus === "closed_with_results" (variant="compact")
//   - PresentView post-vote (variant="stage")
//
// Design intent for stage: editorial broadcast. Winner gets a cinematic
// hero block; other top finishers cluster below; ranked list reads like
// credits — generous row heights, refined hairline dividers.

import { CATEGORIES } from "../../config/categories";
import { C } from "../../config/constants";

const STAGE_FADE_KEYFRAMES = `
  @keyframes stageReveal {
    0% { opacity: 0; transform: translateY(24px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

export default function RankedIdeasView({
  ranked,
  participantCount,
  votesPerParticipant,
  variant = "compact",
}) {
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

  const winners = withDisplayRank.filter((i) => i.rank === 1);
  const otherTop = withDisplayRank.filter((i) => i.rank > 1 && i.rank <= 3);
  const rest = withDisplayRank.filter((i) => i.rank > 3);
  const hasTies = withDisplayRank.some(
    (i, idx, arr) => idx > 0 && arr[idx - 1].voteCount === i.voteCount
  );

  if (variant === "stage") {
    return (
      <StageVariant
        winners={winners}
        otherTop={otherTop}
        rest={rest}
        hasTies={hasTies}
      />
    );
  }

  return (
    <CompactVariant
      winners={winners}
      otherTop={otherTop}
      rest={rest}
      hasTies={hasTies}
      participantCount={participantCount}
      votesPerParticipant={votesPerParticipant}
    />
  );
}

// ===================================================================
// STAGE VARIANT — projector-grade editorial layout
// ===================================================================

function StageVariant({ winners, otherTop, rest, hasTies }) {
  // Pre-allocate stagger delays in render order so the JSX below can index
  // into them without mutating a captured counter. Order matches the call
  // sites: hero label, hero cards, runner-up label+cards, ranked label+rows,
  // tie note. Plenty of headroom for the largest cluster set we'd ever show.
  const delays = Array.from({ length: 200 }, (_, i) => i * 80);
  let i = 0;
  const nextDelay = () => delays[i++] ?? 0;

  return (
    <div>
      <style>{STAGE_FADE_KEYFRAMES}</style>

      {/* Hero block — winner(s) */}
      {winners.length > 0 && (
        <section className="mb-32">
          <SectionLabel delay={nextDelay()}>
            {winners.length === 1 ? "Winner" : `${winners.length}-way tie at #1`}
          </SectionLabel>
          <div className={winners.length === 1 ? "" : "grid grid-cols-1 lg:grid-cols-2 gap-10"}>
            {winners.map((idea) => (
              <StageHeroCard
                key={idea.id}
                idea={idea}
                solo={winners.length === 1}
                delay={nextDelay()}
              />
            ))}
          </div>
        </section>
      )}

      {/* Other top finishers (#2, #3) — only shown if there's a unique #1 */}
      {winners.length === 1 && otherTop.length > 0 && (
        <section className="mb-32">
          <SectionLabel delay={nextDelay()}>
            {otherTop.length === 1 ? "Runner-up" : "Runners-up"}
          </SectionLabel>
          <div
            className={`grid grid-cols-1 ${
              otherTop.length === 1 ? "" : "lg:grid-cols-2"
            } gap-8`}
          >
            {otherTop.map((idea) => (
              <StageRunnerUpCard key={idea.id} idea={idea} delay={nextDelay()} />
            ))}
          </div>
        </section>
      )}

      {/* All ranked — credits roll */}
      {rest.length > 0 && (
        <section className="mb-12">
          <SectionLabel delay={nextDelay()}>
            All ideas, ranked
          </SectionLabel>
          <ol className="divide-y" style={{ borderColor: C.lightGray }}>
            {rest.map((idea) => (
              <StageRankedRow key={idea.id} idea={idea} delay={nextDelay()} />
            ))}
          </ol>
        </section>
      )}

      {hasTies && (
        <p
          className="text-xs italic text-neutral-500 tracking-wide mt-12"
          style={{
            opacity: 0,
            animation: `stageReveal 600ms ease-out ${nextDelay()}ms forwards`,
          }}
        >
          Ties broken by who first contributed the idea.
        </p>
      )}
    </div>
  );
}

function SectionLabel({ children, delay }) {
  return (
    <div
      className="mb-10 flex items-center gap-5"
      style={{
        opacity: 0,
        animation: `stageReveal 600ms ease-out ${delay}ms forwards`,
      }}
    >
      <span
        className="text-[11px] font-bold uppercase tracking-[0.32em] whitespace-nowrap"
        style={{ color: C.darkGray }}
      >
        {children}
      </span>
      <span
        className="flex-1 h-px"
        style={{ background: C.lightGray }}
      />
    </div>
  );
}

function StageHeroCard({ idea, solo, delay }) {
  const cat = CATEGORIES.find((c) => c.id === idea.categoryId);
  const accent = cat?.color ?? C.electricBlue;

  return (
    <article
      className="relative grid grid-cols-12 gap-8 items-start py-10"
      style={{
        opacity: 0,
        animation: `stageReveal 800ms ease-out ${delay}ms forwards`,
      }}
    >
      {/* Massive numeral, asymmetric left */}
      <div className="col-span-12 lg:col-span-3 flex items-start">
        <div
          className="font-bold leading-[0.85] tabular-nums"
          style={{
            fontSize: solo ? "clamp(8rem, 16vw, 14rem)" : "clamp(6rem, 11vw, 9rem)",
            color: C.red,
            letterSpacing: "-0.04em",
          }}
        >
          1
        </div>
      </div>

      {/* Content right */}
      <div className="col-span-12 lg:col-span-9 lg:pt-6">
        <div className="flex items-center gap-3 mb-5">
          <span
            className="inline-block w-2.5 h-2.5"
            style={{ background: accent, borderRadius: "50%" }}
          />
          <span
            className="text-[11px] font-bold uppercase tracking-[0.28em]"
            style={{ color: C.darkGray }}
          >
            {cat?.title ?? idea.categoryId}
          </span>
        </div>

        <h2
          className="font-bold leading-[1.05] mb-7 tracking-tight"
          style={{
            fontSize: solo ? "clamp(2.25rem, 4vw, 3.5rem)" : "clamp(1.75rem, 3vw, 2.5rem)",
            color: C.black,
          }}
        >
          {idea.title}
        </h2>

        {idea.summary && (
          <p
            className="leading-relaxed mb-8 max-w-3xl"
            style={{
              fontSize: solo ? "clamp(1.05rem, 1.3vw, 1.4rem)" : "clamp(0.95rem, 1.1vw, 1.15rem)",
              color: C.darkGray,
            }}
          >
            {idea.summary}
          </p>
        )}

        <div className="flex items-baseline gap-6 flex-wrap">
          <div
            className="px-4 py-2 font-bold uppercase tracking-[0.2em]"
            style={{
              background: C.black,
              color: C.white,
              fontSize: "0.875rem",
            }}
          >
            {idea.voteCount} {idea.voteCount === 1 ? "vote" : "votes"}
          </div>
          <div className="text-sm" style={{ color: C.darkGray }}>
            <span className="text-neutral-500" style={{ marginRight: "0.5rem" }}>
              Sourced from
            </span>
            <span className="font-semibold text-black">
              {idea.contributorNames.join(" · ")}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function StageRunnerUpCard({ idea, delay }) {
  const cat = CATEGORIES.find((c) => c.id === idea.categoryId);
  const accent = cat?.color ?? C.electricBlue;

  return (
    <article
      className="grid grid-cols-12 gap-6 items-start py-6"
      style={{
        opacity: 0,
        animation: `stageReveal 700ms ease-out ${delay}ms forwards`,
      }}
    >
      <div className="col-span-2 lg:col-span-2">
        <div
          className="font-bold leading-[0.85] tabular-nums"
          style={{
            fontSize: "clamp(3rem, 5vw, 4.5rem)",
            color: C.darkGray,
            letterSpacing: "-0.04em",
          }}
        >
          {idea.rank}
        </div>
      </div>
      <div className="col-span-10 lg:col-span-10 pt-2">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="inline-block w-2 h-2"
            style={{ background: accent, borderRadius: "50%" }}
          />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.28em]"
            style={{ color: C.darkGray }}
          >
            {cat?.title ?? idea.categoryId}
          </span>
        </div>
        <h3
          className="font-bold leading-tight mb-3"
          style={{
            fontSize: "clamp(1.25rem, 1.8vw, 1.6rem)",
            color: C.black,
          }}
        >
          {idea.title}
        </h3>
        <div className="flex items-baseline gap-4 flex-wrap">
          <span
            className="px-3 py-1 font-bold uppercase tracking-[0.2em] text-xs"
            style={{ background: C.surface, color: C.black }}
          >
            {idea.voteCount} {idea.voteCount === 1 ? "vote" : "votes"}
          </span>
          <span className="text-xs" style={{ color: C.darkGray }}>
            {idea.contributorNames.join(" · ")}
          </span>
        </div>
      </div>
    </article>
  );
}

function StageRankedRow({ idea, delay }) {
  const cat = CATEGORIES.find((c) => c.id === idea.categoryId);
  const accent = cat?.color ?? C.electricBlue;

  return (
    <li
      className="grid grid-cols-12 gap-6 items-baseline py-7"
      style={{
        opacity: 0,
        animation: `stageReveal 600ms ease-out ${delay}ms forwards`,
      }}
    >
      <span
        className="col-span-1 font-bold tabular-nums text-neutral-400"
        style={{
          fontSize: "clamp(1.25rem, 1.5vw, 1.5rem)",
          letterSpacing: "-0.02em",
        }}
      >
        {idea.rank}
      </span>
      <div className="col-span-9">
        <h4
          className="font-semibold leading-snug mb-2"
          style={{
            fontSize: "clamp(1rem, 1.2vw, 1.2rem)",
            color: C.black,
          }}
        >
          {idea.title}
        </h4>
        <div className="flex items-center gap-2 text-xs" style={{ color: C.darkGray }}>
          <span
            className="inline-block w-1.5 h-1.5"
            style={{ background: accent, borderRadius: "50%" }}
          />
          <span className="uppercase tracking-[0.18em] font-semibold">
            {cat?.title ?? idea.categoryId}
          </span>
          <span className="text-neutral-400 mx-1">·</span>
          <span>{idea.contributorNames.join(", ")}</span>
        </div>
      </div>
      <span
        className="col-span-2 text-right font-bold tabular-nums uppercase tracking-[0.15em]"
        style={{
          fontSize: "0.75rem",
          color: idea.voteCount === 0 ? "#999" : C.black,
        }}
      >
        {idea.voteCount} {idea.voteCount === 1 ? "vote" : "votes"}
      </span>
    </li>
  );
}

// ===================================================================
// COMPACT VARIANT — for participant board (smaller surface than projection)
// ===================================================================

function CompactVariant({ winners, otherTop, rest, hasTies, participantCount, votesPerParticipant }) {
  return (
    <div className="space-y-10">
      {participantCount && (
        <p className="text-sm text-neutral-700 leading-relaxed">
          Ranked by votes from all <strong>{participantCount}</strong>{" "}
          {participantCount === 1 ? "teammate" : "teammates"} ({votesPerParticipant}{" "}
          {votesPerParticipant === 1 ? "vote" : "votes"} each).
        </p>
      )}

      {winners.length > 0 && (
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.28em] text-neutral-600 mb-5">
            {winners.length === 1 ? "Winner" : `${winners.length}-way tie at #1`}
          </h3>
          <div className="space-y-4">
            {winners.map((idea) => (
              <CompactWinnerCard key={idea.id} idea={idea} />
            ))}
          </div>
        </section>
      )}

      {winners.length === 1 && otherTop.length > 0 && (
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.28em] text-neutral-600 mb-5">
            {otherTop.length === 1 ? "Runner-up" : "Runners-up"}
          </h3>
          <div className="space-y-3">
            {otherTop.map((idea) => (
              <CompactRow key={idea.id} idea={idea} emphasis="runnerUp" />
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.28em] text-neutral-600 mb-5">
            All ideas, ranked
          </h3>
          <ol className="divide-y" style={{ borderColor: C.lightGray }}>
            {rest.map((idea) => (
              <CompactRow key={idea.id} idea={idea} />
            ))}
          </ol>
        </section>
      )}

      {hasTies && (
        <p className="text-xs italic text-neutral-500">
          Ties broken by who first contributed the idea.
        </p>
      )}
    </div>
  );
}

function CompactWinnerCard({ idea }) {
  const cat = CATEGORIES.find((c) => c.id === idea.categoryId);
  const accent = cat?.color ?? C.electricBlue;
  return (
    <div
      className="grid grid-cols-12 gap-4 items-baseline p-5 border"
      style={{ borderColor: C.red, background: C.starredBg }}
    >
      <div className="col-span-2">
        <div
          className="font-bold leading-none tabular-nums"
          style={{ fontSize: "3rem", color: C.red, letterSpacing: "-0.04em" }}
        >
          {idea.rank}
        </div>
      </div>
      <div className="col-span-10">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-block w-1.5 h-1.5"
            style={{ background: accent, borderRadius: "50%" }}
          />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-700">
            {cat?.title ?? idea.categoryId}
          </span>
        </div>
        <h4 className="font-bold text-lg leading-snug mb-2">{idea.title}</h4>
        {idea.summary && (
          <p className="text-sm text-neutral-700 leading-relaxed mb-3">
            {idea.summary}
          </p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: C.black, color: C.white }}
          >
            {idea.voteCount} {idea.voteCount === 1 ? "vote" : "votes"}
          </span>
          <span className="text-xs text-neutral-700">
            {idea.contributorNames.join(", ")}
          </span>
        </div>
      </div>
    </div>
  );
}

function CompactRow({ idea, emphasis }) {
  const cat = CATEGORIES.find((c) => c.id === idea.categoryId);
  const accent = cat?.color ?? C.electricBlue;
  const isRunnerUp = emphasis === "runnerUp";
  return (
    <div className="grid grid-cols-12 gap-3 items-baseline py-4">
      <span
        className="col-span-2 font-bold tabular-nums text-neutral-500"
        style={{ fontSize: isRunnerUp ? "1.5rem" : "1rem", letterSpacing: "-0.02em" }}
      >
        {idea.rank}
      </span>
      <div className="col-span-8">
        <h4 className={`leading-snug ${isRunnerUp ? "font-bold text-base" : "font-semibold text-sm"}`}>
          {idea.title}
        </h4>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-600">
          <span
            className="inline-block w-1.5 h-1.5"
            style={{ background: accent, borderRadius: "50%" }}
          />
          <span>{cat?.title ?? idea.categoryId}</span>
          <span className="text-neutral-400">·</span>
          <span>{idea.contributorNames.join(", ")}</span>
        </div>
      </div>
      <span
        className="col-span-2 text-right text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
        style={{
          color: idea.voteCount === 0 ? "#999" : C.black,
        }}
      >
        {idea.voteCount} {idea.voteCount === 1 ? "vote" : "votes"}
      </span>
    </div>
  );
}
