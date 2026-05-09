// Route: /owner#k=:ownerKey
// THE owner home page. All session management happens here:
//   - List all sessions (current + past)
//   - Create new sessions via modal (replaces the old AdminCreate route)
//   - Open any session's admin board in a new tab
//   - Delete any session
//
// Key lives in URL fragment, NOT query string. Stripped from address bar after parse.
//
// Once the server validates the key (sessions !== null), it's cached in
// localStorage so the next visit to `/` from this browser auto-redirects
// here without the user retyping the bookmark. On rejection (sessions ===
// null) the cached key is cleared so we don't loop.
//
// Visual scaffold + the four orchestration concerns (parse + cache the
// owner key, render header / list / modals, kick off bulk export, kick off
// per-row export) live here. Everything else is a leaf in `components/owner/`.

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useConvex } from "convex/react";
import { Download } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { C } from "../config/constants";
import { exportTopIdeasDocx, exportAllSessionsZip } from "../utils/export";
import { useToast } from "../context/useToast";
import {
  setOwnerKey as persistOwnerKey,
  clearOwnerKey,
} from "../utils/localOwner";
import EmptyState from "../components/owner/EmptyState";
import SessionsTable from "../components/owner/SessionsTable";
import CreateModal from "../components/owner/CreateModal";
import DeleteModal from "../components/owner/DeleteModal";

// Module-scoped cache: in React 19 strict mode useEffect runs twice; the
// second run would see an already-stripped hash and incorrectly redirect.
// Cache the parsed key by pathname so repeat invocations are stable.
const KEY_CACHE = new Map();

const FADE_KEYFRAMES = `
  @keyframes ownerReveal {
    0% { opacity: 0; transform: translateY(16px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [ownerKey, setOwnerKey] = useState(() => KEY_CACHE.get("/owner") ?? null);
  const [keyChecked, setKeyChecked] = useState(() => KEY_CACHE.has("/owner"));
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const cached = KEY_CACHE.get("/owner");
    if (cached) {
      setOwnerKey(cached);
      setKeyChecked(true);
      return;
    }

    const hash = window.location.hash;
    const match = hash.match(/k=([^&]+)/);
    if (!match) {
      navigate("/", { replace: true });
      return;
    }
    const key = decodeURIComponent(match[1]);
    KEY_CACHE.set("/owner", key);
    setOwnerKey(key);
    setKeyChecked(true);
    // Strip the fragment from the address bar so screenshots don't expose the key
    window.history.replaceState(null, "", window.location.pathname);
  }, [navigate]);

  const sessions = useQuery(
    api.ownerQueries.listAllSessions,
    ownerKey ? { ownerKey } : "skip"
  );

  // Persist the key once the server has validated it. On rejection, clear
  // any prior cache so visits to `/` don't loop on a stale key.
  useEffect(() => {
    if (sessions === null) {
      clearOwnerKey();
    } else if (sessions !== undefined && ownerKey) {
      persistOwnerKey(ownerKey);
    }
  }, [sessions, ownerKey]);

  if (!keyChecked) return null;

  if (sessions === null) {
    return (
      <FullPageStatus title="Invalid owner key">
        <span>
          The key in your URL doesn't match this deployment. Check your bookmark.
          Keys are environment-specific.
        </span>
        <span className="block mt-6">
          <Link
            to="/owner/restore"
            className="text-xs underline hover:text-black"
            style={{ color: C.darkGray }}
          >
            Restore from a backup file →
          </Link>
        </span>
      </FullPageStatus>
    );
  }

  if (sessions === undefined) {
    return <FullPageStatus title="Loading…">Fetching your sessions.</FullPageStatus>;
  }

  return <DashboardInner ownerKey={ownerKey} sessions={sessions} />;
}

function DashboardInner({ ownerKey, sessions }) {
  const convex = useConvex();
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [zipState, setZipState] = useState({ active: false, current: 0, total: 0 });

  const onDownloadBackup = async () => {
    const env = import.meta.env;
    const backup = {
      version: 1,
      ownerKey,
      convexUrl: env.VITE_CONVEX_URL ?? "",
      savedAt: new Date().toISOString(),
      origin: window.location.origin,
      note:
        "Restore at /owner/restore. This file contains your owner key. Store it like any other secret (1Password, encrypted note app, etc.). Anyone with this file can access every workshop in this deployment.",
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const date = new Date().toISOString().slice(0, 10);
    // file-saver is bundled with the export libs; lazy-load it the same way.
    const { saveAs } = await import("file-saver");
    saveAs(blob, `team-primitives-owner-${date}.json`);
  };

  const onExportAll = async () => {
    if (zipState.active) return;
    setZipState({ active: true, current: 0, total: sessions.length });
    try {
      const result = await exportAllSessionsZip({
        sessions,
        fetchBundle: (sessionId) =>
          convex.query(api.ownerQueries.getSessionExportBundle, {
            ownerKey,
            sessionId,
          }),
        onProgress: ({ current, total, sessionCode }) => {
          setZipState({ active: true, current, total, sessionCode });
        },
      });
      const summary = `Bundled ${result.included} session${
        result.included === 1 ? "" : "s"
      }${result.skipped ? `, skipped ${result.skipped} (pre-vote)` : ""}.`;
      showToast(summary);
    } catch (err) {
      showToast(err?.message ?? "Bulk export failed");
    } finally {
      setZipState({ active: false, current: 0, total: 0 });
    }
  };

  const onDownload = async (session) => {
    setDownloadingId(session._id);
    try {
      const bundle = await convex.query(api.ownerQueries.getSessionExportBundle, {
        ownerKey,
        sessionId: session._id,
      });
      if (!bundle) throw new Error("Could not fetch session data");
      if (bundle.ranked.length === 0) {
        showToast(
          "No ranked ideas yet. Run synthesis and voting from the admin board first."
        );
        return;
      }
      await exportTopIdeasDocx({
        session: bundle.session,
        ranked: bundle.ranked,
        totalVotes: bundle.totalVotes,
        participants: bundle.participants,
      });
    } catch (err) {
      console.error("Export failed", err);
      showToast(`Export failed: ${err?.message ?? "unknown error"}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const totalSessions = sessions.length;
  const totalParticipants = sessions.reduce((s, x) => s + x.participantCount, 0);
  const totalIdeas = sessions.reduce((s, x) => s + x.ideaCount, 0);

  return (
    <main className="min-h-screen bg-white text-black">
      <style>{FADE_KEYFRAMES}</style>
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 py-10 md:py-14">
        <header
          className="mb-16"
          style={{
            opacity: 0,
            animation: `ownerReveal 700ms ease-out 0ms forwards`,
          }}
        >
          <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="inline-block w-1 h-5"
                  style={{ background: C.red }}
                />
                <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-neutral-500">
                  Owner library
                </span>
              </div>
              <h1
                className="font-bold leading-[1] tracking-tight"
                style={{
                  fontSize: "clamp(2.75rem, 5vw, 4rem)",
                  letterSpacing: "-0.03em",
                }}
              >
                Team Primitives
              </h1>
              <div
                className="mt-5 flex items-baseline gap-6 flex-wrap text-sm"
                style={{ color: C.darkGray }}
              >
                <span>
                  <span className="font-bold text-black tabular-nums">{totalSessions}</span>{" "}
                  {totalSessions === 1 ? "workshop" : "workshops"}
                </span>
                {totalParticipants > 0 && (
                  <>
                    <span style={{ color: C.lightGray }}>·</span>
                    <span>
                      <span className="font-bold text-black tabular-nums">{totalParticipants}</span>{" "}
                      {totalParticipants === 1 ? "participant" : "participants"}
                    </span>
                  </>
                )}
                {totalIdeas > 0 && (
                  <>
                    <span style={{ color: C.lightGray }}>·</span>
                    <span>
                      <span className="font-bold text-black tabular-nums">{totalIdeas}</span>{" "}
                      ideas total
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={onDownloadBackup}
                className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] inline-flex items-center gap-2 border hover:bg-black hover:text-white transition-colors"
                style={{ borderColor: C.darkGray, color: C.darkGray }}
                title="Save your owner key as a JSON file for safe-keeping. Restore at /owner/restore."
              >
                <Download size={12} /> Save backup
              </button>
              {sessions.length > 0 && (
                <button
                  type="button"
                  onClick={onExportAll}
                  disabled={zipState.active}
                  className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] inline-flex items-center gap-2 border disabled:opacity-50 hover:bg-black hover:text-white transition-colors"
                  style={{ borderColor: C.black }}
                  title="Bundle all sessions with ranked results into a ZIP"
                >
                  <Download size={12} />
                  {zipState.active
                    ? `Bundling… ${zipState.current}/${zipState.total}`
                    : "Export all as ZIP"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.22em] inline-flex items-center gap-2"
                style={{ background: C.red, color: C.white }}
              >
                <span aria-hidden="true">+</span> New workshop
              </button>
            </div>
          </div>
          <hr className="border-0 h-px" style={{ background: C.lightGray }} />
        </header>

        {sessions.length === 0 ? (
          <EmptyState onCreate={() => setCreating(true)} />
        ) : (
          <SessionsTable
            sessions={sessions}
            onDelete={(s) => setDeleteTarget(s)}
            onDownload={onDownload}
            downloadingId={downloadingId}
          />
        )}
      </div>

      {creating && (
        <CreateModal
          ownerKey={ownerKey}
          onClose={() => setCreating(false)}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          session={deleteTarget}
          ownerKey={ownerKey}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </main>
  );
}

function FullPageStatus({ title, children }) {
  return (
    <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="kicker-row" style={{ justifyContent: "center" }}>
          <span className="kicker-tick" aria-hidden="true" />
          <span className="kicker-label">Owner library</span>
        </div>
        <h1 className="text-center font-bold leading-[1.05] mb-5 display-sm">
          {title}
        </h1>
        <div
          className="text-sm text-center"
          style={{ color: C.darkGray, lineHeight: 1.6 }}
        >
          {children}
        </div>
      </div>
    </main>
  );
}
