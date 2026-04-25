// Locked-phase participant view. Shows different tabs based on session state:
//   - Pre-synthesis: just "My board"
//   - Synthesis ready, voting idle: My board + Team board
//   - Voting open: My board + Team board + Vote
//   - Voting closed: My board + Team board + Final results

import { useMemo, useState, useEffect } from "react";
import { Star, Download } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CATEGORIES } from "../../config/categories";
import { C } from "../../config/constants";
import { clearParticipantId } from "../../utils/localParticipant";
import VoteView from "./VoteView";
import RankedIdeasView from "./RankedIdeasView";

export default function MyBoardView({ session, participant }) {
  const canvas = useQuery(api.canvas.getMyCanvas, {
    participantId: participant._id,
  });
  const synthesis = useQuery(api.synthesis.getLatestSynthesisForParticipant, {
    sessionId: session._id,
    participantId: participant._id,
  });
  const rankedResults = useQuery(api.votes.getRankedResults, {
    sessionId: session._id,
  });

  // Build ordered list of available tabs based on session state
  const tabs = useMemo(() => {
    const t = [{ id: "my", label: "My board" }];
    if (synthesis && synthesis.clusters.length > 0) {
      t.push({ id: "team", label: "Team board" });
    }
    if (session.votingStatus === "open") {
      t.push({ id: "vote", label: "Vote" });
    }
    if (session.votingStatus === "closed_with_results") {
      t.push({ id: "ranked", label: "Final results" });
    }
    return t;
  }, [synthesis, session.votingStatus]);

  const [activeTab, setActiveTab] = useState("my");

  // Auto-jump to the latest "interesting" tab when phase advances. Doesn't
  // override an explicit click — just promotes when a new tab unlocks.
  useEffect(() => {
    if (session.votingStatus === "open" && tabs.find((t) => t.id === "vote")) {
      setActiveTab((prev) => (prev === "team" || prev === "my" ? "vote" : prev));
    } else if (
      session.votingStatus === "closed_with_results" &&
      tabs.find((t) => t.id === "ranked")
    ) {
      setActiveTab((prev) => (prev === "vote" ? "ranked" : prev));
    } else if (synthesis && tabs.find((t) => t.id === "team")) {
      setActiveTab((prev) => (prev === "my" ? "team" : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.votingStatus, synthesis?._id]);

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

  // Vote tab is a full screen — render directly (it has its own sticky header)
  if (activeTab === "vote") {
    return (
      <>
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          session={session}
          participant={participant}
          stats={stats}
        />
        <VoteView session={session} participant={participant} />
      </>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black px-6 py-6">
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        session={session}
        participant={participant}
        stats={stats}
      />

      <div className="max-w-3xl mx-auto pt-2">
        <SubheaderForState session={session} stats={stats} synthesis={synthesis} />

        {activeTab === "my" && <MyBoardContent canvas={canvas} />}

        {activeTab === "team" && synthesis && (
          <TeamBoardContent synthesis={synthesis} />
        )}

        {activeTab === "ranked" && rankedResults && (
          <div className="mt-6">
            <RankedIdeasView
              ranked={rankedResults.ranked}
              participantCount={rankedResults.participantCount}
              votesPerParticipant={rankedResults.votesPerParticipant}
              variant="compact"
            />
          </div>
        )}

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

function TabBar({ tabs, activeTab, onChange, session, participant }) {
  return (
    <div className="max-w-3xl mx-auto">
      <header
        className="flex items-center justify-between text-xs text-neutral-500 border-b pb-3 mb-4"
        style={{ borderColor: C.lightGray }}
      >
        <span>
          {session.functionName} · {participant.name}
        </span>
        <span aria-label="online" title="online">●</span>
      </header>
      {tabs.length > 1 && (
        <nav
          className="flex gap-1 mb-6 border-b -mx-2 sm:mx-0 overflow-x-auto"
          style={{ borderColor: C.lightGray }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
              style={{
                color: activeTab === tab.id ? C.black : C.gray500,
                borderBottom: `2px solid ${activeTab === tab.id ? C.red : "transparent"}`,
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

function SubheaderForState({ session, stats, synthesis }) {
  if (session.votingStatus === "open") {
    return (
      <div
        className="border-l-4 px-5 py-3 mb-6"
        style={{ borderColor: C.red, background: C.starredBg }}
      >
        <p className="text-sm">
          <strong>Voting is open.</strong> You have{" "}
          <strong>{session.votesPerParticipant ?? 3}</strong> votes. Click
          "Vote" to choose your team's priorities.
        </p>
      </div>
    );
  }
  if (session.votingStatus === "closed_with_results") {
    return (
      <div
        className="border-l-4 px-5 py-3 mb-6"
        style={{ borderColor: C.electricBlue, background: "rgba(0,163,224,0.06)" }}
      >
        <p className="text-sm">
          <strong>Voting is complete.</strong> See the team's top ideas in
          "Final results".
        </p>
      </div>
    );
  }
  if (synthesis) {
    return (
      <div
        className="border-l-4 px-5 py-3 mb-6"
        style={{ borderColor: C.electricBlue, background: "rgba(0,163,224,0.06)" }}
      >
        <p className="text-sm">
          <strong>The team board is ready.</strong> Click "Team board" to see
          how everyone's ideas come together.
        </p>
      </div>
    );
  }
  return (
    <div
      className="border-l-4 px-5 py-3 mb-6"
      style={{ borderColor: C.electricBlue, background: "rgba(0,163,224,0.06)" }}
    >
      <h1 className="text-xl font-bold tracking-tight">
        Your contribution is locked in ✓
      </h1>
      <p className="text-sm text-neutral-700 mt-1">
        You starred <strong>{stats.starred}</strong> of <strong>{stats.total}</strong>{" "}
        ideas. The team board, voting, and final results will appear here as
        your admin runs the next phases.
      </p>
    </div>
  );
}

function MyBoardContent({ canvas }) {
  return (
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
                  className="flex items-start gap-3 p-3 border"
                  style={{
                    borderColor: idea.starred ? C.red : C.lightGray,
                    background: idea.starred ? C.starredBg : C.surface,
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
  );
}

function TeamBoardContent({ synthesis }) {
  const ideasByCategory = useMemo(() => {
    const grouped = {};
    for (const c of synthesis.clusters) {
      if (!grouped[c.categoryId]) grouped[c.categoryId] = [];
      grouped[c.categoryId].push(c);
    }
    for (const cat of Object.keys(grouped)) {
      grouped[cat].sort((a, b) => a.title.localeCompare(b.title));
    }
    return grouped;
  }, [synthesis]);

  const filledCategories = CATEGORIES.filter(
    (cat) => (ideasByCategory[cat.id] ?? []).length > 0
  );

  return (
    <div className="space-y-8">
      <p className="text-sm text-neutral-700">
        The team's ideas after duplicates were removed.
      </p>
      {filledCategories.map((cat) => {
        const items = ideasByCategory[cat.id];
        return (
          <section key={cat.id}>
            <h2 className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: cat.color }}
              />
              {cat.title}
              <span className="text-xs text-neutral-500 font-normal">
                ({items.length})
              </span>
            </h2>
            <div className="space-y-3">
              {items.map((c) => (
                <div
                  key={c.id}
                  className="p-4 border"
                  style={{
                    borderColor: C.lightGray,
                    background: c.participantIds.length >= 2 ? C.starredBg : C.surface,
                  }}
                >
                  <p className="font-semibold leading-snug">{c.title}</p>
                  {c.summary && (
                    <p className="text-sm text-neutral-600 mt-1 leading-relaxed">
                      {c.summary}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500 mt-2">
                    {c.participantIds.length >= 2 && (
                      <span
                        className="inline-block px-1.5 py-0.5 mr-1 text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: cat.color, color: C.white }}
                      >
                        {c.participantIds.length} ✕
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
