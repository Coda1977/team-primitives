// Locked-phase participant view — full editorial broadcast pattern.
//
// Architecture:
//   1. Editorial header: kicker tick + "Workshop · ${functionName}" label +
//      display title that changes per active tab + participant byline + hairline.
//   2. Tab nav at primary-nav scale (text-sm, generous gap), single hairline.
//   3. Per-state subheader: each of the 4 phases gets its own architecture
//      (not 4 near-identical tinted banners).
//   4. Tab content with no extra chrome competing with the page header.

import { useMemo, useState, useEffect } from "react";
import { Star, Download } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CATEGORIES } from "../../config/categories";
import { C } from "../../config/constants";
import { clearParticipantId } from "../../utils/localParticipant";
import {
  exportParticipantDocx,
  exportTeamBoardDocx,
  exportTopIdeasDocx,
} from "../../utils/export";
import VoteView from "./VoteView";
import RankedIdeasView from "./RankedIdeasView";
import ConfirmModal from "../shared/ConfirmModal";
import { useToast } from "../../context/useToast";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

// Per-tab page identity. The display title changes with the active tab so
// the page reads as "you are here" without relying solely on the strip.
const TAB_TITLES = {
  my:     { kicker: "Your contributions", title: "My board" },
  team:   { kicker: "Team's deduplicated ideas", title: "Team board" },
  vote:   { kicker: "Cast your votes", title: "Vote" },
  ranked: { kicker: "Final ranked priorities", title: "Final results" },
};

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

  const tabs = useMemo(() => {
    const t = [{ id: "my", label: "My board" }];
    if (synthesis && synthesis.clusters.length > 0) {
      t.push({ id: "team", label: "Team board" });
    }
    if (session.votingStatus === "open") t.push({ id: "vote", label: "Vote" });
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
    return <FullScreenLoading>Loading your board…</FullScreenLoading>;
  }

  const onReset = () => setResetConfirmOpen(true);
  const onResetConfirm = () => {
    clearParticipantId(session.code);
    window.location.href = `/s/${session.code}/join`;
  };

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

  // Vote tab is its own full screen — VoteView's own header takes over,
  // and we drop the page-level Hero (otherwise the user sees two heroes
  // stacked on top of each other).
  if (activeTab === "vote") {
    return (
      <>
        <main className="min-h-screen bg-white text-black px-4 md:px-8 lg:px-12 pt-8">
          <div className="max-w-7xl mx-auto">
            <PageHero
              session={session}
              participant={participant}
              stats={stats}
              activeTab={activeTab}
            />
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          </div>
        </main>
        <VoteView session={session} participant={participant} embedded />
        {resetModal}
      </>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black px-4 md:px-8 lg:px-12 pt-8 pb-16">
      <div className="max-w-7xl mx-auto">
        <PageHero
          session={session}
          participant={participant}
          stats={stats}
          activeTab={activeTab}
        />
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Desktop: 12-col grid with sticky aside (3/12) + main (9/12).
            Aside trimmed from 4/12 -> 3/12 so its content (compact state
            chip) doesn't have a giant empty column under it.
            Mobile: stacks vertically. */}
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-10">
          <aside className="lg:col-span-3 mb-6 lg:mb-0">
            <div className="lg:sticky lg:top-8">
              <SubheaderForState
                session={session}
                stats={stats}
                synthesis={synthesis}
              />
            </div>
          </aside>
          <div className="lg:col-span-9">
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
              >
                <RankedIdeasView
                  ranked={rankedResults.ranked}
                  participantCount={rankedResults.participantCount}
                  votesPerParticipant={rankedResults.votesPerParticipant}
                  variant="compact"
                />
              </div>
            )}
          </div>
        </div>

        <Footer
          activeTab={activeTab}
          session={session}
          participant={participant}
          canvas={canvas}
          synthesis={synthesis}
          rankedResults={rankedResults}
          onReset={onReset}
          showToast={showToast}
        />
      </div>
      {resetModal}
    </main>
  );
}

// ---------------------------------------------------------------
// PageHero — editorial broadcast header
// ---------------------------------------------------------------
function PageHero({ session, participant, stats, activeTab }) {
  const online = useOnlineStatus();
  const tabMeta = TAB_TITLES[activeTab] ?? TAB_TITLES.my;
  return (
    <header className="mb-6">
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="kicker-row" style={{ marginBottom: 0 }}>
          <span className="kicker-tick" aria-hidden="true" />
          <span className="kicker-label kicker-label--sm">
            {session.functionName} · Workshop
          </span>
        </div>
        <span
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-semibold"
          style={{ color: online ? C.darkGray : C.warning }}
          aria-label={online ? "online" : "offline"}
          title={online ? "Online" : "Offline. Changes save when you reconnect."}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: online ? C.electricBlue : "transparent",
              border: online ? "none" : `1px solid ${C.warning}`,
            }}
          />
          {online ? "Online" : "Offline"}
        </span>
      </div>
      <h1
        className="font-bold leading-[1] mb-3 display-md"
      >
        {tabMeta.title}
      </h1>
      <p
        className="text-sm"
        style={{ color: C.darkGray, lineHeight: 1.5 }}
      >
        <span className="font-semibold" style={{ color: C.black }}>
          {participant.name}
        </span>
        <span className="mx-2" style={{ color: C.lightGray }}>·</span>
        <span className="tabular-nums">{stats.starred}</span> starred of{" "}
        <span className="tabular-nums">{stats.total}</span> ideas
      </p>
      <hr
        className="border-0 h-px mt-7"
        style={{ background: C.lightGray }}
      />
    </header>
  );
}

// ---------------------------------------------------------------
// Tabs — primary nav scale, single hairline rule
// ---------------------------------------------------------------
function Tabs({ tabs, activeTab, onChange }) {
  if (tabs.length <= 1) return null;
  return (
    <nav
      role="tablist"
      aria-label="Workshop sections"
      className="flex gap-8 mb-10 overflow-x-auto"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className="text-sm font-semibold whitespace-nowrap touch-min"
            style={{
              padding: "10px 0",
              color: isActive ? C.black : C.gray500,
              borderBottom: `2px solid ${isActive ? C.red : "transparent"}`,
              background: "transparent",
              border: "none",
              borderBottomWidth: 2,
              borderBottomStyle: "solid",
              borderBottomColor: isActive ? C.red : "transparent",
              transition: "color 0.15s ease, border-color 0.15s ease",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------
// SubheaderForState — each phase has its own architecture
// ---------------------------------------------------------------
function SubheaderForState({ session, stats, synthesis }) {
  // Voting OPEN → red kicker + large numeral. Stacked vertically so it
  // reads well in the narrow desktop sidebar; on wider sidebars the row
  // would also work but the vertical stack is more legible.
  if (session.votingStatus === "open") {
    return (
      <div className="p-5" style={{ background: C.starredBg }}>
        <div className="kicker-row" style={{ marginBottom: 12 }}>
          <span className="kicker-tick kicker-tick--sm" aria-hidden="true" />
          <span
            className="kicker-label kicker-label--sm"
            style={{ color: C.red }}
          >
            Voting is open
          </span>
        </div>
        <div
          className="font-bold leading-none tabular-nums mb-3"
          style={{
            fontSize: "3.5rem",
            color: C.red,
            letterSpacing: "-0.04em",
          }}
        >
          {session.votesPerParticipant ?? 3}
        </div>
        <p
          className="text-xs"
          style={{ color: C.darkGray, lineHeight: 1.55 }}
        >
          {(session.votesPerParticipant ?? 3) === 1 ? "vote" : "votes"} per
          person. Open the "Vote" tab to choose the team's priorities.
        </p>
      </div>
    );
  }

  // Voting CLOSED → black celebratory band
  if (session.votingStatus === "closed_with_results") {
    return (
      <div className="p-5" style={{ background: C.black, color: C.white }}>
        <div className="kicker-row" style={{ marginBottom: 8 }}>
          <span
            className="inline-block w-1 h-4"
            aria-hidden="true"
            style={{ background: C.red }}
          />
          <span
            className="kicker-label kicker-label--sm"
            style={{ color: C.white }}
          >
            Voting complete
          </span>
        </div>
        <p
          className="text-xs"
          style={{ color: "rgba(255,255,255,0.8)", lineHeight: 1.55 }}
        >
          See the team's top ideas in the "Final results" tab.
        </p>
      </div>
    );
  }

  // Synthesis ready (pre-voting) → soft blue
  if (synthesis) {
    return (
      <div className="p-5" style={{ background: "rgba(0,163,224,0.06)" }}>
        <div className="kicker-row" style={{ marginBottom: 8 }}>
          <span
            className="inline-block w-1 h-4"
            aria-hidden="true"
            style={{ background: C.electricBlue }}
          />
          <span
            className="kicker-label kicker-label--sm"
            style={{ color: C.electricBlue }}
          >
            Team board ready
          </span>
        </div>
        <p className="text-xs" style={{ color: C.darkGray, lineHeight: 1.55 }}>
          Open the "Team board" tab to see how everyone's ideas come together.
        </p>
      </div>
    );
  }

  // Default: just locked, no synthesis yet → soft confirmation. In the
  // sidebar this reads as a quiet status pill rather than a hero block.
  return (
    <div className="p-5" style={{ background: C.surface }}>
      <div className="kicker-row" style={{ marginBottom: 8 }}>
        <span className="kicker-tick kicker-tick--sm" aria-hidden="true" />
        <span className="kicker-label kicker-label--sm">Locked in</span>
      </div>
      <p
        className="text-xs"
        style={{ color: C.darkGray, lineHeight: 1.55 }}
      >
        Your contribution is in.{" "}
        <span className="tabular-nums">
          <strong style={{ color: C.black }}>{stats.starred}</strong> of{" "}
          <strong style={{ color: C.black }}>{stats.total}</strong>
        </span>{" "}
        ideas starred. The team board, voting, and final results will appear
        here as your admin runs the next phases.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------
// MyBoardContent — read-only personal recap
// Cards use a thin top-accent in the category color, matching
// PresentView's StickyNote pattern (system consistency).
// ---------------------------------------------------------------
function MyBoardContent({ canvas }) {
  return (
    <div className="space-y-12">
      {CATEGORIES.map((cat) => {
        const ideas = canvas[cat.id] ?? [];
        if (ideas.length === 0) return null;
        return (
          <section key={cat.id}>
            <div className="flex items-baseline gap-3 mb-4 pb-3 border-b" style={{ borderColor: C.lightGray }}>
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: cat.color }}
              />
              <h2
                className="font-bold leading-tight"
                style={{
                  fontSize: "1.125rem",
                  letterSpacing: "-0.01em",
                }}
              >
                {cat.title}
              </h2>
              <span
                className="ml-auto text-[10px] uppercase tracking-[0.22em] font-semibold tabular-nums"
                style={{ color: C.darkGray }}
              >
                {ideas.length} {ideas.length === 1 ? "idea" : "ideas"}
              </span>
            </div>
            <div className="space-y-3">
              {ideas.map((idea) => (
                <div
                  key={idea._id}
                  className="flex items-start gap-3 p-4"
                  style={{
                    background: idea.starred ? C.starredBg : C.surface,
                    boxShadow: idea.starred
                      ? `inset 0 2px 0 0 ${C.red}`
                      : `inset 0 1px 0 0 ${cat.color}`,
                  }}
                >
                  <Star
                    size={16}
                    className="flex-shrink-0 mt-0.5"
                    fill={idea.starred ? C.red : "none"}
                    color={idea.starred ? C.red : C.lightGray}
                    aria-hidden="true"
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

// ---------------------------------------------------------------
// TeamBoardContent — synthesized clusters
// ---------------------------------------------------------------
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
    <div className="space-y-12">
      <p className="text-sm" style={{ color: C.darkGray, lineHeight: 1.55 }}>
        The team's ideas after duplicates were removed.
      </p>
      {filledCategories.map((cat) => {
        const items = ideasByCategory[cat.id];
        return (
          <section key={cat.id}>
            <div className="flex items-baseline gap-3 mb-4 pb-3 border-b" style={{ borderColor: C.lightGray }}>
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: cat.color }}
              />
              <h2
                className="font-bold leading-tight"
                style={{
                  fontSize: "1.125rem",
                  letterSpacing: "-0.01em",
                }}
              >
                {cat.title}
              </h2>
              <span
                className="ml-auto text-[10px] uppercase tracking-[0.22em] font-semibold tabular-nums"
                style={{ color: C.darkGray }}
              >
                {items.length}
              </span>
            </div>
            <div className="space-y-3">
              {items.map((c) => {
                const emphasized = c.participantIds.length >= 2;
                return (
                  <div
                    key={c.id}
                    className="p-4"
                    style={{
                      background: emphasized ? C.starredBg : C.surface,
                      boxShadow: emphasized
                        ? `inset 0 2px 0 0 ${cat.color}`
                        : `inset 0 1px 0 0 ${cat.color}`,
                    }}
                  >
                    <p
                      className={emphasized ? "font-bold leading-snug" : "font-semibold leading-snug"}
                      style={{
                        fontSize: emphasized ? "1.0625rem" : "0.95rem",
                      }}
                    >
                      {c.title}
                    </p>
                    {c.summary && (
                      <p
                        className="text-sm mt-2 leading-relaxed"
                        style={{ color: C.darkGray }}
                      >
                        {c.summary}
                      </p>
                    )}
                    {emphasized && (
                      <div className="flex items-center gap-2 mt-3">
                        <span
                          className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]"
                          style={{ background: cat.color, color: C.white }}
                        >
                          {c.participantIds.length} contributors
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------
// Footer — tab-aware Word export + reset link
// The download button changes label and target per active tab so
// "Download" always reflects what the user is currently looking at.
// ---------------------------------------------------------------
function Footer({
  activeTab,
  session,
  participant,
  canvas,
  synthesis,
  rankedResults,
  onReset,
  showToast,
}) {
  // Resolve the right export action + label for the active tab.
  // Returns null when the tab has no exportable artifact yet.
  const exportConfig = (() => {
    if (activeTab === "team") {
      if (!synthesis || synthesis.status !== "ready") return null;
      return {
        label: "Download team board (Word)",
        run: () => exportTeamBoardDocx({ session, synthesis }),
        errorFallback: "Couldn't generate the team board.",
      };
    }
    if (activeTab === "ranked") {
      if (!rankedResults || !rankedResults.ranked?.length) return null;
      const totalVotes = rankedResults.ranked.reduce(
        (sum, r) => sum + (r.voteCount ?? 0),
        0
      );
      return {
        label: "Download final results (Word)",
        run: () =>
          exportTopIdeasDocx({
            session,
            ranked: rankedResults.ranked,
            totalVotes,
            totalParticipants: rankedResults.participantCount,
          }),
        errorFallback: "Couldn't generate the final results.",
      };
    }
    // Default: my tab (also covers any unhandled state).
    return {
      label: "Download my ideas (Word)",
      run: () => exportParticipantDocx({ session, participant, canvas }),
      errorFallback: "Couldn't generate the Word file.",
    };
  })();

  return (
    <div
      className="mt-16 pt-8 border-t flex items-center justify-between flex-wrap gap-4"
      style={{ borderColor: C.lightGray }}
    >
      {exportConfig ? (
        <button
          type="button"
          onClick={async () => {
            try {
              await exportConfig.run();
            } catch (err) {
              console.error("Export failed", err);
              showToast({
                message: err?.message ?? exportConfig.errorFallback,
                variant: "error",
              });
            }
          }}
          className="inline-flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] border touch-min"
          style={{
            borderColor: C.black,
            color: C.black,
            background: "transparent",
            transition: "background 0.15s ease, color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = C.black;
            e.currentTarget.style.color = C.white;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = C.black;
          }}
        >
          <Download size={14} />
          {exportConfig.label}
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onReset}
        className="text-xs underline-offset-4 hover:underline"
        style={{ color: C.gray500 }}
      >
        Not you? Reset and re-enter your name
      </button>
    </div>
  );
}

function FullScreenLoading({ children }) {
  return (
    <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
      <p
        className="text-sm uppercase tracking-[0.22em] font-semibold"
        style={{ color: C.gray500 }}
      >
        {children}
      </p>
    </main>
  );
}
