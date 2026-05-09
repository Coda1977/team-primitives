// Route: /s/:code/admin#k=:adminKey
// Persona: session admin (group lead running the workshop).
// Editorial control room — strong typographic hierarchy, refined section
// labels, no heavy chrome.
//
// adminKey lives in the URL fragment (not query string) so it doesn't leak via
// Referer headers, server access logs, or browser history. Stripped from the
// address bar after parse — see src/utils/adminKey.js.

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { Tv, Download } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { C } from "../config/constants";
import { exportTopIdeasDocx, exportSynthesisDocx } from "../utils/export";
import {
  buildPresentUrl,
  consumeAdminKeyFromHash,
  hasCachedAdminKey,
  readCachedAdminKey,
} from "../utils/adminKey";
import { useToast } from "../context/useToast";
import ShareLinkPanel from "../components/admin/ShareLinkPanel";
import RosterPanel from "../components/admin/RosterPanel";
import RawStarredList from "../components/admin/RawStarredList";
import SynthesizeButton from "../components/admin/SynthesizeButton";
import ClusterCard from "../components/admin/ClusterCard";
import VotingControlsPanel from "../components/admin/VotingControlsPanel";
import StatusBlock from "../components/shared/StatusBlock";
import RankedIdeasView from "../components/views/RankedIdeasView";

const FADE_KEYFRAMES = `
  @keyframes adminReveal {
    0% { opacity: 0; transform: translateY(16px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

export default function AdminBoard() {
  const { code } = useParams();
  const navigate = useNavigate();
  const pathname = `/s/${code}/admin`;
  const [adminKey, setAdminKey] = useState(() => readCachedAdminKey(pathname));
  const [keyChecked, setKeyChecked] = useState(() => hasCachedAdminKey(pathname));
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const key = consumeAdminKeyFromHash(pathname);
    if (!key) {
      navigate("/", { replace: true });
      return;
    }
    setAdminKey(key);
    setKeyChecked(true);
  }, [navigate, pathname]);

  const session = useQuery(
    api.sessions.getSessionForAdmin,
    code && adminKey ? { code, adminKey } : "skip"
  );

  if (!keyChecked) return null;

  if (session === undefined) {
    return <FullPageStatus>Loading admin board…</FullPageStatus>;
  }
  if (session === null) {
    return (
      <FullPageStatus title="Workshop not found">
        Either the session code is wrong or the admin key doesn't match. Check the URL with whoever set up the workshop.
      </FullPageStatus>
    );
  }

  return <AdminInner session={session} adminKey={adminKey} />;
}

function AdminInner({ session, adminKey }) {
  const participants = useQuery(api.participants.listParticipants, {
    sessionId: session._id,
    adminKey,
  });
  const starred = useQuery(api.synthesis.listRawStarred, {
    sessionId: session._id,
    adminKey,
  });
  const synthesis = useQuery(api.synthesis.getLatestSynthesis, {
    sessionId: session._id,
    adminKey,
  });
  const rankedResults = useQuery(api.votes.getRankedResults, {
    sessionId: session._id,
  });
  const adminTallies = useQuery(api.votes.getAdminTallies, {
    sessionId: session._id,
    adminKey,
  });
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();

  const lockedCount = useMemo(
    () => (participants ?? []).filter((p) => p.phase === "locked").length,
    [participants]
  );
  const totalParticipants = participants?.length ?? 0;
  const totalStarred = starred?.length ?? 0;

  const isRunning = synthesis?.status === "running";
  const hasReady = synthesis?.status === "ready";

  const ideaLookup = useMemo(() => starred ?? [], [starred]);

  return (
    <main className="min-h-screen bg-white text-black">
      <style>{FADE_KEYFRAMES}</style>
      <div className="max-w-[1400px] mx-auto px-8 lg:px-12 py-12">
        {/* Editorial header */}
        <header
          className="mb-12"
          style={{
            opacity: 0,
            animation: `adminReveal 700ms ease-out 0ms forwards`,
          }}
        >
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="inline-block w-1 h-4"
                  style={{ background: C.red }}
                />
                <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-neutral-500">
                  Workshop control
                </span>
              </div>
              <h1
                className="font-bold leading-[1] tracking-tight"
                style={{
                  fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                  letterSpacing: "-0.025em",
                }}
              >
                Admin board
              </h1>
            </div>
            <a
              href={buildPresentUrl(window.location.origin, session.code, adminKey)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] border hover:bg-black hover:text-white transition-colors"
              style={{ borderColor: C.black }}
              title="Open the projector-friendly view in a new tab"
            >
              <Tv size={14} />
              Open presentation
            </a>
          </div>
        </header>

        <div
          style={{
            opacity: 0,
            animation: `adminReveal 700ms ease-out 100ms forwards`,
          }}
        >
          <ShareLinkPanel session={session} adminKey={adminKey} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* LEFT: roster */}
          <section
            style={{
              opacity: 0,
              animation: `adminReveal 700ms ease-out 200ms forwards`,
            }}
          >
            <SectionHeader
              kicker="Roster"
              title={`Participants · ${totalParticipants}`}
              subtitle={
                totalParticipants === 0
                  ? "Waiting for first joiner"
                  : `${lockedCount} locked, ${totalParticipants - lockedCount} still working`
              }
            />
            <RosterPanel participants={participants ?? []} />
          </section>

          {/* RIGHT: stars + synthesis + voting */}
          <section
            style={{
              opacity: 0,
              animation: `adminReveal 700ms ease-out 300ms forwards`,
            }}
          >
            <SectionHeader
              kicker="Stars & synthesis"
              title={`Starred ideas · ${totalStarred}`}
              subtitle={
                totalStarred === 0
                  ? "Once participants lock their stars, they appear here grouped by category"
                  : `${lockedCount} ${lockedCount === 1 ? "person" : "people"} locked`
              }
            />

            {totalStarred > 0 && (
              <details
                className="mb-8 border"
                style={{ borderColor: C.lightGray }}
              >
                <summary
                  className="px-4 py-3 text-[10px] uppercase tracking-[0.22em] font-semibold cursor-pointer hover:bg-neutral-50 select-none"
                  style={{ color: C.darkGray }}
                >
                  Raw starred list (show all)
                </summary>
                <div className="px-5 pb-5 pt-2">
                  <RawStarredList starred={starred ?? []} />
                </div>
              </details>
            )}

            <div className="mb-10">
              <SynthesizeButton
                sessionId={session._id}
                adminKey={adminKey}
                lockedCount={lockedCount}
                hasExisting={hasReady}
                isRunning={isRunning}
              />
            </div>

            {synthesis?.status === "running" && (
              <StatusBlock variant="info" kicker="Synthesizing" className="mb-6">
                This takes 10–20 seconds. Refresh-safe.
              </StatusBlock>
            )}
            {synthesis?.status === "error" && (
              <StatusBlock
                variant="alert"
                kicker="Synthesis failed"
                className="mb-6"
                action={
                  <SynthesizeButton
                    sessionId={session._id}
                    adminKey={adminKey}
                    lockedCount={lockedCount}
                    hasExisting={hasReady}
                    isRunning={isRunning}
                  />
                }
              >
                {synthesis.error || "Unknown error"}. Try again.
              </StatusBlock>
            )}

            {hasReady && synthesis.clusters.length > 0 && (
              <div className="space-y-4">
                <SectionHeader
                  kicker="Output"
                  title={`Team's ideas · ${synthesis.clusters.length}`}
                  subtitle="Duplicates removed"
                  small
                />
                <div className="space-y-4">
                  {synthesis.clusters.map((cluster) => (
                    <ClusterCard
                      key={cluster.id}
                      cluster={cluster}
                      ideas={ideaLookup}
                      participants={participants ?? []}
                    />
                  ))}
                </div>
                <div className="pt-6 mt-6 border-t" style={{ borderColor: C.lightGray }}>
                  <VotingControlsPanel session={session} adminKey={adminKey} />
                </div>
                {session.votingStatus === "closed_with_results" &&
                  rankedResults?.ranked?.length > 0 && (
                    <div
                      className="pt-6 mt-6 border-t"
                      style={{ borderColor: C.lightGray }}
                    >
                      <SectionHeader
                        kicker="Final results"
                        title="Team's ranked priorities"
                        subtitle={`${rankedResults.participantCount} ${
                          rankedResults.participantCount === 1
                            ? "person voted"
                            : "people voted"
                        }`}
                        small
                      />
                      <RankedIdeasView
                        ranked={rankedResults.ranked}
                        participantCount={rankedResults.participantCount}
                        votesPerParticipant={rankedResults.votesPerParticipant}
                        variant="compact"
                      />
                    </div>
                  )}
                {(rankedResults?.ranked?.length > 0 ||
                  adminTallies?.ranked?.length > 0) && (
                  <div
                    className="pt-6 mt-6 border-t"
                    style={{ borderColor: C.lightGray }}
                  >
                    <SectionHeader
                      kicker="Export"
                      title="Download workshop"
                      subtitle="Share results with stakeholders"
                      small
                    />
                    <div className="flex flex-wrap gap-3">
                      <button
                        disabled={exporting}
                        onClick={async () => {
                          setExporting(true);
                          try {
                            const ranked =
                              rankedResults?.ranked ?? adminTallies?.ranked ?? [];
                            await exportTopIdeasDocx({
                              session,
                              ranked,
                              totalVotes:
                                rankedResults?.ranked?.reduce(
                                  (s, x) => s + x.voteCount,
                                  0
                                ) ?? adminTallies?.totalVotes ?? 0,
                              participants: participants ?? [],
                            });
                          } catch (err) {
                            console.error("Top ideas export failed", err);
                            showToast(
                              err?.message ?? "Top ideas export failed."
                            );
                          } finally {
                            setExporting(false);
                          }
                        }}
                        className="px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] inline-flex items-center gap-2 disabled:opacity-50"
                        style={{ background: C.red, color: C.white }}
                      >
                        <Download size={13} /> Top ideas (Word)
                      </button>
                      <button
                        disabled={exporting}
                        onClick={async () => {
                          setExporting(true);
                          try {
                            await exportSynthesisDocx({
                              session,
                              ranked:
                                rankedResults?.ranked ??
                                adminTallies?.ranked ??
                                [],
                              synthesis,
                              starred: starred ?? [],
                              participants: participants ?? [],
                            });
                          } catch (err) {
                            console.error("Full board export failed", err);
                            showToast(
                              err?.message ?? "Full board export failed."
                            );
                          } finally {
                            setExporting(false);
                          }
                        }}
                        className="px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] inline-flex items-center gap-2 border disabled:opacity-50 hover:bg-black hover:text-white transition-colors"
                        style={{ borderColor: C.black }}
                      >
                        <Download size={13} /> Full board (Word)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function SectionHeader({ kicker, title, subtitle, small }) {
  return (
    <div className={small ? "mb-4" : "mb-6"}>
      {kicker && (
        <p
          className={`font-bold uppercase tracking-[0.32em] mb-3 ${
            small ? "text-[9px]" : "text-[10px]"
          }`}
          style={{ color: C.gray500 }}
        >
          {kicker}
        </p>
      )}
      <h2
        className={`font-bold tracking-tight ${
          small ? "text-base" : "text-xl"
        }`}
        style={{ letterSpacing: "-0.015em" }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-1.5 ${small ? "text-xs" : "text-sm"}`}
          style={{ color: C.gray500 }}
        >
          {subtitle}
        </p>
      )}
      <hr
        className={`border-0 h-px ${small ? "mt-3" : "mt-5"}`}
        style={{ background: C.lightGray }}
      />
    </div>
  );
}

function FullPageStatus({ title, children }) {
  return (
    <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
      <div className="max-w-md text-center">
        {title && (
          <h1 className="text-2xl font-bold tracking-tight mb-2">{title}</h1>
        )}
        <p className="text-sm text-neutral-700">{children}</p>
      </div>
    </main>
  );
}
