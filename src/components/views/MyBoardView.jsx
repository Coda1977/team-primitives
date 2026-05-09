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
import { exportParticipantDocx } from "../../utils/export";
import VoteView from "./VoteView";
import RankedIdeasView from "./RankedIdeasView";
import ConfirmModal from "../shared/ConfirmModal";
import StatusBlock from "../shared/StatusBlock";
import { useToast } from "../../context/useToast";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

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
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const { showToast } = useToast();

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

  const onReset = () => setResetConfirmOpen(true);

  const onResetConfirm = () => {
    clearParticipantId(session.code);
    window.location.href = `/s/${session.code}/join`;
  };

  // Vote tab is a full screen — render directly (it has its own sticky header)
  const resetModal = (
    <ConfirmModal
      open={resetConfirmOpen}
      title="Reset this device?"
      message="You'll need to re-enter your name to rejoin from this browser. Your contributions stay in the workshop. Only the local link to this device is cleared."
      confirmLabel="Reset"
      cancelLabel="Cancel"
      onConfirm={onResetConfirm}
      onCancel={() => setResetConfirmOpen(false)}
    />
  );

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
        {resetModal}
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

        {activeTab === "my" && (
          <div role="tabpanel" id="panel-my" aria-labelledby="tab-my">
            <MyBoardContent canvas={canvas} />
          </div>
        )}

        {activeTab === "team" && synthesis && (
          <div role="tabpanel" id="panel-team" aria-labelledby="tab-team">
            <TeamBoardContent synthesis={synthesis} />
          </div>
        )}

        {activeTab === "ranked" && rankedResults && (
          <div
            role="tabpanel"
            id="panel-ranked"
            aria-labelledby="tab-ranked"
            className="mt-6"
          >
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
            onClick={async () => {
              try {
                await exportParticipantDocx({ session, participant, canvas });
              } catch (err) {
                console.error("Export failed", err);
                showToast(err?.message ?? "Couldn't generate the Word file.");
              }
            }}
            className="px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] border flex items-center gap-2 hover:bg-black hover:text-white transition-colors"
            style={{ borderColor: C.black }}
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
      {resetModal}
    </main>
  );
}

function TabBar({ tabs, activeTab, onChange, session, participant }) {
  const online = useOnlineStatus();
  return (
    <div className="max-w-3xl mx-auto">
      <header
        className="flex items-center justify-between border-b pb-3 mb-6"
        style={{ borderColor: C.lightGray }}
      >
        <div className="flex items-center gap-3 text-xs">
          <span
            className="inline-block w-1 h-4"
            style={{ background: C.red }}
          />
          <span
            className="uppercase tracking-[0.28em] font-bold"
            style={{ color: C.darkGray }}
          >
            {session.functionName}
          </span>
          <span style={{ color: C.lightGray }}>·</span>
          <span style={{ color: C.darkGray }}>{participant.name}</span>
        </div>
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{
            background: online ? C.electricBlue : C.gray500,
            border: online ? "none" : `1px solid ${C.lightGray}`,
          }}
          aria-label={online ? "online" : "offline"}
          title={online ? "Online" : "Offline. Changes save when you reconnect."}
        />
      </header>
      {tabs.length > 1 && (
        <nav
          role="tablist"
          aria-label="Workshop sections"
          className="flex gap-6 mb-8 border-b overflow-x-auto"
          style={{ borderColor: C.lightGray }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className="py-3 text-[11px] font-bold uppercase tracking-[0.22em] whitespace-nowrap transition-colors"
              style={{
                color: activeTab === tab.id ? C.black : C.gray500,
                borderBottom: `2px solid ${
                  activeTab === tab.id ? C.red : "transparent"
                }`,
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
      <StatusBlock variant="success" kicker="Voting open" className="mb-6">
        You have <strong>{session.votesPerParticipant ?? 3}</strong> votes. Open
        the "Vote" tab to choose your team's priorities.
      </StatusBlock>
    );
  }
  if (session.votingStatus === "closed_with_results") {
    return (
      <StatusBlock variant="info" kicker="Voting complete" className="mb-6">
        See the team's top ideas in the "Final results" tab.
      </StatusBlock>
    );
  }
  if (synthesis) {
    return (
      <StatusBlock variant="info" kicker="Team board ready" className="mb-6">
        Open the "Team board" tab to see how everyone's ideas come together.
      </StatusBlock>
    );
  }
  return (
    <div
      className="px-5 py-4 mb-6"
      style={{ background: "rgba(0,163,224,0.06)" }}
    >
      <div className="flex items-center gap-3 mb-2">
        <span
          aria-hidden="true"
          className="inline-block w-1 h-4"
          style={{ background: C.electricBlue }}
        />
        <span
          className="text-[10px] font-bold uppercase tracking-[0.28em]"
          style={{ color: C.electricBlue }}
        >
          Locked in
        </span>
      </div>
      <h1 className="text-xl font-bold tracking-tight">
        Your contribution is in ✓
      </h1>
      <p className="text-sm mt-2" style={{ color: C.darkGray, lineHeight: 1.55 }}>
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
