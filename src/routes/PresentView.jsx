// Route: /s/:code/present?k=:adminKey
// Persona: facilitator projects this on a screen during the live workshop.
// Designed for projection — editorial broadcast, light theme, generous
// vertical rhythm, dramatic reveal on the post-vote winner.

import { useEffect } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CATEGORIES } from "../config/categories";
import { C } from "../config/constants";
import RankedIdeasView from "../components/views/RankedIdeasView";

const FADE_KEYFRAMES = `
  @keyframes presentReveal {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

export default function PresentView() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get("k");

  const session = useQuery(
    api.sessions.getSessionForAdmin,
    code && adminKey ? { code, adminKey } : "skip"
  );

  useEffect(() => {
    document.body.classList.add("present-mode");
    return () => document.body.classList.remove("present-mode");
  }, []);

  if (!adminKey) return <Navigate to="/" replace />;
  if (session === undefined) return <FullScreenStatus>Loading…</FullScreenStatus>;
  if (session === null) {
    return (
      <FullScreenStatus>
        Workshop not found. Check the admin URL.
      </FullScreenStatus>
    );
  }

  return <PresentInner session={session} adminKey={adminKey} />;
}

function PresentInner({ session, adminKey }) {
  const participants = useQuery(api.participants.listParticipants, {
    sessionId: session._id,
    adminKey,
  });
  const synthesis = useQuery(api.synthesis.getLatestSynthesis, {
    sessionId: session._id,
    adminKey,
  });
  const starred = useQuery(api.synthesis.listRawStarred, {
    sessionId: session._id,
    adminKey,
  });
  const rankedResults = useQuery(api.votes.getRankedResults, {
    sessionId: session._id,
  });

  const lockedCount = (participants ?? []).filter((p) => p.phase === "locked").length;
  const totalParticipants = participants?.length ?? 0;
  const inProgress = totalParticipants - lockedCount;

  const hasSynthesis = synthesis?.status === "ready" && synthesis.clusters.length > 0;
  const synthRunning = synthesis?.status === "running";

  const votingOpen = session.votingStatus === "open";
  const votingClosed = session.votingStatus === "closed_with_results";

  // ============================================================
  // POST-VOTE: ranked results reveal — the workshop's payoff moment
  // ============================================================
  if (votingClosed && rankedResults) {
    return (
      <main className="min-h-screen" style={{ background: C.white, color: C.black }}>
        <style>{FADE_KEYFRAMES}</style>
        <div className="max-w-[1600px] mx-auto px-12 lg:px-20 py-16 lg:py-24">
          <BroadcastHeader
            session={session}
            kicker="Final results"
            metadata={
              <>
                {rankedResults.participantCount}{" "}
                {rankedResults.participantCount === 1 ? "person voted" : "people voted"}
                <span className="mx-3" style={{ color: C.lightGray }}>·</span>
                {rankedResults.votesPerParticipant}{" "}
                {rankedResults.votesPerParticipant === 1 ? "vote" : "votes"} each
              </>
            }
          />
          <RankedIdeasView
            ranked={rankedResults.ranked}
            participantCount={rankedResults.participantCount}
            votesPerParticipant={rankedResults.votesPerParticipant}
            variant="stage"
          />
        </div>
      </main>
    );
  }

  // ============================================================
  // VOTING OPEN or POST-SYNTHESIS or PRE-SYNTHESIS or WAITING
  // ============================================================
  return (
    <main className="min-h-screen" style={{ background: C.white, color: C.black }}>
      <style>{FADE_KEYFRAMES}</style>
      <div className="max-w-[1600px] mx-auto px-12 lg:px-20 py-16 lg:py-24">
        <BroadcastHeader
          session={session}
          kicker={
            votingOpen
              ? "Voting in progress"
              : hasSynthesis
              ? "Team's ideas — duplicates removed"
              : starred && starred.length > 0
              ? "Live: ideas as the team locks them in"
              : "Workshop"
          }
          metadata={
            <>
              <span className="font-bold text-black">{totalParticipants}</span>{" "}
              {totalParticipants === 1 ? "participant" : "participants"}
              <span className="mx-3" style={{ color: C.lightGray }}>·</span>
              <span className="font-bold text-black">{lockedCount}</span> locked
              {inProgress > 0 && (
                <>
                  <span className="mx-3" style={{ color: C.lightGray }}>·</span>
                  <span className="font-bold text-black">{inProgress}</span> still working
                </>
              )}
            </>
          }
        />

        {votingOpen && (
          <div
            className="mb-16 p-6 lg:p-8 flex items-center gap-5"
            style={{
              background: C.starredBg,
              borderLeft: `4px solid ${C.red}`,
              opacity: 0,
              animation: `presentReveal 600ms ease-out 100ms forwards`,
            }}
          >
            <div
              className="text-4xl font-bold leading-none tabular-nums"
              style={{ color: C.red }}
            >
              {session.votesPerParticipant ?? 3}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.28em] mb-1">
                Voting is open
              </div>
              <div className="text-sm" style={{ color: C.darkGray }}>
                Each teammate has{" "}
                {session.votesPerParticipant ?? 3}{" "}
                {(session.votesPerParticipant ?? 3) === 1 ? "vote" : "votes"}.
                Totals are revealed when the admin closes voting.
              </div>
            </div>
          </div>
        )}

        {hasSynthesis ? (
          <IdeasGrid
            ideas={synthesis.clusters}
            participants={participants ?? []}
          />
        ) : synthRunning ? (
          <CenteredMessage
            title="Synthesizing…"
            subtitle="Removing duplicates and pulling the team's ideas together."
          />
        ) : starred && starred.length > 0 ? (
          <PreSynthesisGrid starred={starred} />
        ) : (
          <CenteredMessage
            title="Waiting for the team"
            subtitle={
              inProgress > 0
                ? `${inProgress} ${
                    inProgress === 1 ? "person is" : "people are"
                  } still working through their canvas. As they lock their stars, ideas will appear here.`
                : totalParticipants === 0
                ? "Share the participant URL with your team to begin."
                : "Everyone's ready. Run synthesis from the admin board."
            }
          />
        )}
      </div>
    </main>
  );
}

// ============================================================
// HEADER — the broadcast-style title block
// ============================================================
function BroadcastHeader({ session, kicker, metadata }) {
  return (
    <header
      className="mb-20 lg:mb-24"
      style={{
        opacity: 0,
        animation: `presentReveal 700ms ease-out 0ms forwards`,
      }}
    >
      <div className="flex items-end justify-between gap-8 flex-wrap mb-12">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-5">
            <span
              className="inline-block w-1 h-6"
              style={{ background: C.red }}
            />
            <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-neutral-500">
              Team Primitives
            </span>
          </div>
          <h1
            className="font-bold leading-[0.95] tracking-tight"
            style={{
              fontSize: "clamp(3.5rem, 7vw, 6rem)",
              letterSpacing: "-0.025em",
            }}
          >
            {session.functionName}
          </h1>
          <p
            className="mt-5 max-w-2xl"
            style={{
              fontSize: "clamp(1rem, 1.2vw, 1.25rem)",
              color: C.darkGray,
            }}
          >
            {session.industry ? `${session.industry} · ` : ""}
            {session.teamSize ? `team of ${session.teamSize} · ` : ""}
            where AI fits in our function
          </p>
        </div>
        <div
          className="text-right text-sm leading-relaxed whitespace-nowrap"
          style={{ color: C.darkGray }}
        >
          {metadata}
        </div>
      </div>

      {kicker && (
        <div className="flex items-center gap-5">
          <span
            className="text-[11px] font-bold uppercase tracking-[0.32em] whitespace-nowrap"
            style={{ color: C.darkGray }}
          >
            {kicker}
          </span>
          <span
            className="flex-1 h-px"
            style={{ background: C.lightGray }}
          />
        </div>
      )}
    </header>
  );
}

// ============================================================
// PRE-SYNTHESIS — sticky-note wall as ideas come in
// ============================================================
function PreSynthesisGrid({ starred }) {
  const byCategory = {};
  for (const idea of starred) {
    if (!byCategory[idea.categoryId]) byCategory[idea.categoryId] = [];
    byCategory[idea.categoryId].push(idea);
  }
  const filledCategories = CATEGORIES.filter(
    (cat) => (byCategory[cat.id] ?? []).length > 0
  );

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16"
      style={{
        opacity: 0,
        animation: `presentReveal 700ms ease-out 200ms forwards`,
      }}
    >
      {filledCategories.map((cat, i) => (
        <CategoryZone key={cat.id} category={cat} ideas={byCategory[cat.id]}>
          {byCategory[cat.id].map((idea, j) => (
            <StickyNote
              key={idea._id}
              text={idea.text}
              contributors={[idea.participantName]}
              accentColor={cat.color}
              delay={i * 60 + j * 40 + 300}
            />
          ))}
        </CategoryZone>
      ))}
    </div>
  );
}

// ============================================================
// POST-SYNTHESIS — deduplicated ideas grid
// ============================================================
function IdeasGrid({ ideas, participants }) {
  const byCategory = {};
  for (const idea of ideas) {
    if (!byCategory[idea.categoryId]) byCategory[idea.categoryId] = [];
    byCategory[idea.categoryId].push(idea);
  }
  const filledCategories = CATEGORIES.filter(
    (cat) => (byCategory[cat.id] ?? []).length > 0
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
      {filledCategories.map((cat, i) => (
        <CategoryZone key={cat.id} category={cat} ideas={byCategory[cat.id]}>
          {byCategory[cat.id].map((idea, j) => {
            const contributorNames = idea.participantIds
              .map((pid) => participants.find((p) => p._id === pid)?.name)
              .filter(Boolean);
            return (
              <StickyNote
                key={idea.id}
                text={idea.title}
                subtext={idea.summary}
                contributors={contributorNames}
                accentColor={cat.color}
                emphasized={contributorNames.length >= 2}
                delay={i * 80 + j * 50 + 200}
              />
            );
          })}
        </CategoryZone>
      ))}
    </div>
  );
}

function CategoryZone({ category, ideas, children }) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-7 pb-4 border-b" style={{ borderColor: C.lightGray }}>
        <span
          className="inline-block w-2.5 h-2.5 flex-shrink-0"
          style={{ background: category.color, borderRadius: "50%" }}
        />
        <h2 className="text-xl font-bold tracking-tight" style={{ letterSpacing: "-0.01em" }}>
          {category.title}
        </h2>
        <span
          className="ml-auto text-xs font-bold uppercase tracking-[0.2em] tabular-nums"
          style={{ color: C.darkGray }}
        >
          {ideas.length}
        </span>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function StickyNote({ text, subtext, contributors, accentColor, emphasized, delay = 0 }) {
  return (
    <div
      className="relative pl-6 pr-5 py-5"
      style={{
        background: emphasized ? C.starredBg : C.surface,
        borderLeft: `${emphasized ? 4 : 2}px solid ${accentColor}`,
        opacity: 0,
        animation: `presentReveal 600ms ease-out ${delay}ms forwards`,
      }}
    >
      <p
        className={`leading-snug ${emphasized ? "font-bold" : ""}`}
        style={{
          fontSize: emphasized ? "1.0625rem" : "0.95rem",
          color: C.black,
          letterSpacing: emphasized ? "-0.005em" : "0",
        }}
      >
        {text}
      </p>
      {subtext && emphasized && (
        <p
          className="mt-3 leading-relaxed"
          style={{ fontSize: "0.875rem", color: C.darkGray }}
        >
          {subtext}
        </p>
      )}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        {emphasized && contributors.length >= 2 && (
          <span
            className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ background: accentColor, color: C.white }}
          >
            {contributors.length} ✕
          </span>
        )}
        <span
          className="text-[11px] uppercase tracking-[0.15em] font-semibold"
          style={{ color: C.darkGray }}
        >
          {contributors.join(" · ")}
        </span>
      </div>
    </div>
  );
}

function CenteredMessage({ title, subtitle }) {
  return (
    <div
      className="min-h-[55vh] flex items-center justify-center text-center"
      style={{
        opacity: 0,
        animation: `presentReveal 700ms ease-out 200ms forwards`,
      }}
    >
      <div className="max-w-2xl">
        <h2
          className="font-bold tracking-tight mb-5"
          style={{
            fontSize: "clamp(2rem, 3vw, 2.75rem)",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h2>
        <p
          className="leading-relaxed"
          style={{
            fontSize: "clamp(1rem, 1.2vw, 1.2rem)",
            color: C.darkGray,
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function FullScreenStatus({ children }) {
  return (
    <main
      className="min-h-screen flex items-center justify-center text-center"
      style={{ background: C.white, color: C.black }}
    >
      <p className="text-lg max-w-md px-6">{children}</p>
    </main>
  );
}
