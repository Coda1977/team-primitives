// Route: /s/:code/present?k=:adminKey
// Persona: facilitator projects this on a screen during the live workshop;
// the room sees the team's ideas as a projector-friendly designed grid.
//
// Live-mirrors the session: as participants lock stars and admin runs synthesis,
// this view updates. No controls, no admin chrome — just the workshop output.

import { useEffect } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CATEGORIES } from "../config/categories";
import { C } from "../config/constants";

export default function PresentView() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get("k");

  const session = useQuery(
    api.sessions.getSessionForAdmin,
    code && adminKey ? { code, adminKey } : "skip"
  );

  // Apply a body-level class so the presentation view fills the viewport
  // edge-to-edge regardless of the rest of the app's centered max-width.
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

  const lockedCount = (participants ?? []).filter((p) => p.phase === "locked").length;
  const totalParticipants = participants?.length ?? 0;
  const inProgress = totalParticipants - lockedCount;

  const hasSynthesis = synthesis?.status === "ready" && synthesis.clusters.length > 0;
  const synthRunning = synthesis?.status === "running";

  return (
    <main
      className="min-h-screen"
      style={{ background: C.black, color: C.white }}
    >
      <div className="max-w-[1800px] mx-auto px-12 py-10">
        <Header
          session={session}
          totalParticipants={totalParticipants}
          lockedCount={lockedCount}
          inProgress={inProgress}
          hasSynthesis={hasSynthesis}
        />

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
                ? `${inProgress} ${inProgress === 1 ? "person is" : "people are"} still working through their canvas. As they lock their stars, ideas will appear here.`
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

function Header({ session, totalParticipants, lockedCount, inProgress, hasSynthesis }) {
  return (
    <header className="mb-12 flex items-baseline justify-between flex-wrap gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400 mb-2">
          Team Primitives
        </p>
        <h1 className="text-5xl font-bold tracking-tight">
          {session.functionName}
        </h1>
        <p className="text-lg text-neutral-400 mt-2">
          {session.industry ? `${session.industry} · ` : ""}
          {session.teamSize ? `team of ${session.teamSize} · ` : ""}
          where AI fits in our function
        </p>
      </div>
      <div className="text-right text-sm text-neutral-500 leading-relaxed">
        <div>
          <span className="text-white font-bold tabular-nums">{totalParticipants}</span>{" "}
          {totalParticipants === 1 ? "participant" : "participants"}
        </div>
        <div>
          <span className="text-white font-bold tabular-nums">{lockedCount}</span> locked,{" "}
          <span className="text-white font-bold tabular-nums">{inProgress}</span> in progress
        </div>
      </div>
    </header>
  );
}

function PreSynthesisGrid({ starred }) {
  // Group raw starred ideas by category for a sticky-wall feel during the
  // workshop's "ideas pouring in" moment. When admin runs synthesis, this
  // view auto-flips to the deduplicated grid.
  const byCategory = {};
  for (const idea of starred) {
    if (!byCategory[idea.categoryId]) byCategory[idea.categoryId] = [];
    byCategory[idea.categoryId].push(idea);
  }

  const filledCategories = CATEGORIES.filter(
    (cat) => (byCategory[cat.id] ?? []).length > 0
  );

  return (
    <div className="space-y-12">
      <div className="text-sm uppercase tracking-[0.3em] text-neutral-500">
        Live: ideas as the team locks them in
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
        {filledCategories.map((cat) => (
          <CategoryZone key={cat.id} category={cat} ideas={byCategory[cat.id]}>
            {byCategory[cat.id].map((idea) => (
              <StickyNote
                key={idea._id}
                text={idea.text}
                contributors={[idea.participantName]}
                accentColor={cat.color}
              />
            ))}
          </CategoryZone>
        ))}
      </div>
    </div>
  );
}

function IdeasGrid({ ideas, participants }) {
  // Post-synthesis: deduplicated ideas grouped by category. Each idea shows
  // its canonical text (the synthesis-generated title for multi-source ideas,
  // single-source idea text for solo contributions), category, and contributors.
  const byCategory = {};
  for (const idea of ideas) {
    if (!byCategory[idea.categoryId]) byCategory[idea.categoryId] = [];
    byCategory[idea.categoryId].push(idea);
  }

  const filledCategories = CATEGORIES.filter(
    (cat) => (byCategory[cat.id] ?? []).length > 0
  );

  // Total deduplicated ideas + total contributors (distinct)
  const totalIdeas = ideas.length;
  const distinctVoters = new Set();
  for (const idea of ideas) {
    for (const pid of idea.participantIds) distinctVoters.add(pid);
  }

  return (
    <div className="space-y-10">
      <div className="text-sm uppercase tracking-[0.3em] text-neutral-500 flex items-baseline justify-between gap-4 flex-wrap">
        <span>Team's ideas — duplicates removed</span>
        <span className="text-neutral-400 normal-case tracking-normal">
          <span className="text-white font-bold tabular-nums">{totalIdeas}</span> ideas
          across <span className="text-white font-bold tabular-nums">{filledCategories.length}</span> of 6 categories
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
        {filledCategories.map((cat) => (
          <CategoryZone key={cat.id} category={cat} ideas={byCategory[cat.id]}>
            {byCategory[cat.id].map((idea) => {
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
                />
              );
            })}
          </CategoryZone>
        ))}
      </div>
    </div>
  );
}

function CategoryZone({ category, ideas, children }) {
  return (
    <section>
      <div
        className="flex items-baseline gap-3 mb-4 pb-3 border-b"
        style={{ borderColor: "rgba(255,255,255,0.15)" }}
      >
        <span
          className="inline-block w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: category.color }}
        />
        <h2 className="text-lg font-bold tracking-tight">{category.title}</h2>
        <span className="text-xs text-neutral-500 ml-auto tabular-nums">
          {ideas.length}
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function StickyNote({ text, subtext, contributors, accentColor, emphasized }) {
  // Card surface is white-ish on the dark backdrop, with a left accent stripe
  // in the category color. Multi-contributor cards (emphasized) get a thicker
  // stripe + a contributor count badge.
  return (
    <div
      className="relative pl-5 pr-4 py-4 transition-transform"
      style={{
        background: emphasized ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
        borderLeft: `${emphasized ? 4 : 2}px solid ${accentColor}`,
      }}
    >
      <p
        className={`leading-snug ${emphasized ? "text-base font-semibold" : "text-[15px]"}`}
        style={{ color: C.white }}
      >
        {text}
      </p>
      {subtext && emphasized && (
        <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
          {subtext}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {emphasized && contributors.length >= 2 && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded"
            style={{ background: accentColor, color: C.white }}
          >
            {contributors.length} ✕
          </span>
        )}
        <span className="text-xs text-neutral-500">
          {contributors.join(" · ")}
        </span>
      </div>
    </div>
  );
}

function CenteredMessage({ title, subtitle }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-bold tracking-tight mb-3">{title}</h2>
        <p className="text-lg text-neutral-400 leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}

function FullScreenStatus({ children }) {
  return (
    <main
      className="min-h-screen flex items-center justify-center text-center"
      style={{ background: C.black, color: C.white }}
    >
      <p className="text-lg max-w-md px-6">{children}</p>
    </main>
  );
}
