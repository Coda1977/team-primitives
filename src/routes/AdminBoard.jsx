// Route: /s/:code/admin?k=:adminKey
// Persona: session admin (group lead running the workshop).

import { useMemo } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { C } from "../config/constants";
import ShareLinkPanel from "../components/admin/ShareLinkPanel";
import RosterPanel from "../components/admin/RosterPanel";
import RawStarredList from "../components/admin/RawStarredList";
import SynthesizeButton from "../components/admin/SynthesizeButton";
import ClusterCard from "../components/admin/ClusterCard";

export default function AdminBoard() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get("k");

  const session = useQuery(
    api.sessions.getSessionForAdmin,
    code && adminKey ? { code, adminKey } : "skip"
  );

  if (!adminKey) return <Navigate to="/" replace />;

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

  const lockedCount = useMemo(
    () => (participants ?? []).filter((p) => p.phase === "locked").length,
    [participants]
  );
  const totalParticipants = participants?.length ?? 0;
  const totalStarred = starred?.length ?? 0;

  const isRunning = synthesis?.status === "running";
  const hasReady = synthesis?.status === "ready";

  // For ClusterCard rendering: fetch the actual idea texts. Convert the raw
  // starred list (which already has full idea info) into a quick lookup.
  const ideaLookup = useMemo(() => starred ?? [], [starred]);

  return (
    <main className="min-h-screen bg-white text-black px-6 py-6">
      <div className="max-w-7xl mx-auto">
        <header
          className="flex items-center justify-between mb-6 pb-4 border-b"
          style={{ borderColor: C.lightGray }}
        >
          <div className="flex items-baseline gap-4 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">
              Admin board
            </h1>
            <span className="text-xs text-neutral-500">
              Manage the workshop in real time
            </span>
          </div>
        </header>

        <ShareLinkPanel session={session} adminKey={adminKey} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: roster */}
          <section>
            <SectionHeader
              title={`Participants (${totalParticipants})`}
              subtitle={
                totalParticipants === 0
                  ? "Waiting for first joiner"
                  : `${lockedCount} locked, ${totalParticipants - lockedCount} still working`
              }
            />
            <RosterPanel participants={participants ?? []} />
          </section>

          {/* RIGHT: stars + synthesis */}
          <section>
            <SectionHeader
              title={`Starred ideas (${totalStarred})`}
              subtitle={
                totalStarred === 0
                  ? "Once participants lock their stars, they appear here grouped by category"
                  : `${lockedCount} ${lockedCount === 1 ? "person" : "people"} locked`
              }
            />
            {totalStarred > 0 && (
              <details className="mb-6 border" style={{ borderColor: C.lightGray }}>
                <summary className="px-4 py-3 text-xs uppercase tracking-wider font-semibold cursor-pointer hover:bg-neutral-50">
                  Raw starred list — show all
                </summary>
                <div className="px-4 pb-4 pt-2">
                  <RawStarredList starred={starred ?? []} />
                </div>
              </details>
            )}

            <div className="mb-6">
              <SynthesizeButton
                sessionId={session._id}
                adminKey={adminKey}
                lockedCount={lockedCount}
                hasExisting={hasReady}
                isRunning={isRunning}
              />
            </div>

            {/* Synthesis output */}
            {synthesis?.status === "running" && (
              <div
                className="border-l-4 px-4 py-3 text-sm"
                style={{ borderColor: C.electricBlue, background: "rgba(0,163,224,0.06)" }}
              >
                Synthesizing… this takes 10–20 seconds. Refresh-safe.
              </div>
            )}
            {synthesis?.status === "error" && (
              <div
                className="border-l-4 px-4 py-3 text-sm"
                style={{ borderColor: C.red, background: C.redLight, color: C.darkGray }}
              >
                <strong>Synthesis failed:</strong> {synthesis.error || "Unknown error"}.
                Try again.
              </div>
            )}
            {hasReady && synthesis.clusters.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold tracking-tight uppercase text-neutral-600">
                  Synthesized clusters ({synthesis.clusters.length})
                </h3>
                {synthesis.clusters.map((cluster) => (
                  <ClusterCard
                    key={cluster.id}
                    cluster={cluster}
                    ideas={ideaLookup}
                    participants={participants ?? []}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {subtitle && (
        <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>
      )}
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
