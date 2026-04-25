// Route: /owner#k=:ownerKey
// THE owner home page. All session management happens here:
//   - List all sessions (current + past)
//   - Create new sessions via modal (replaces the old AdminCreate route)
//   - Open any session's admin board in a new tab
//   - Delete any session
//
// Key lives in URL fragment, NOT query string. Stripped from address bar after parse.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useConvex } from "convex/react";
import { Download } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { C } from "../config/constants";
import { exportTopIdeasDocx, exportAllSessionsZip } from "../utils/export";
import { saveAs } from "file-saver";

// Module-scoped cache: in React 19 strict mode useEffect runs twice; the
// second run would see an already-stripped hash and incorrectly redirect.
// Cache the parsed key by pathname so repeat invocations are stable.
const KEY_CACHE = new Map();

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [ownerKey, setOwnerKey] = useState(() => KEY_CACHE.get("/owner") ?? null);
  const [keyChecked, setKeyChecked] = useState(() => KEY_CACHE.has("/owner"));
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    // First check the cache (handles strict-mode double mount + URL strip)
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

  if (!keyChecked) return null;

  // sessions === null means the server rejected the key (mismatch with OWNER_KEY env var)
  if (sessions === null) {
    return (
      <FullPageStatus title="Invalid owner key">
        The key in your URL doesn't match this deployment. Check your bookmark — keys are environment-specific.
      </FullPageStatus>
    );
  }

  // Loading state from Convex
  if (sessions === undefined) {
    return <FullPageStatus title="Loading…">Fetching your sessions.</FullPageStatus>;
  }

  return <DashboardInner ownerKey={ownerKey} sessions={sessions} />;
}

const FADE_KEYFRAMES = `
  @keyframes ownerReveal {
    0% { opacity: 0; transform: translateY(16px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

function DashboardInner({ ownerKey, sessions }) {
  const convex = useConvex();
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // session row to confirm delete
  const [downloadingId, setDownloadingId] = useState(null);
  const [zipState, setZipState] = useState({ active: false, current: 0, total: 0 });

  const onDownloadBackup = () => {
    const env = import.meta.env;
    const backup = {
      version: 1,
      ownerKey,
      convexUrl: env.VITE_CONVEX_URL ?? "",
      savedAt: new Date().toISOString(),
      origin: window.location.origin,
      note:
        "Restore at /owner/restore. This file contains your owner key — store it like any other secret (1Password, encrypted note app, etc.). Anyone with this file can access every workshop in this deployment.",
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const date = new Date().toISOString().slice(0, 10);
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
      // Quick toast-style feedback. window.alert is acceptable for this rare action.
      console.log("Bulk export complete:", summary);
    } catch (err) {
      alert(err?.message ?? "Bulk export failed");
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
        // Pre-vote: nothing to rank yet — user-friendly notice
        alert(
          "This session has no ranked ideas yet. Run synthesis and voting from the admin board first."
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
      alert("Export failed: " + (err?.message ?? "unknown error"));
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
      <div className="max-w-[1400px] mx-auto px-8 lg:px-12 py-14">
        {/* Editorial header */}
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
                onClick={onDownloadBackup}
                className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] inline-flex items-center gap-2 border hover:bg-black hover:text-white transition-colors"
                style={{ borderColor: C.darkGray, color: C.darkGray }}
                title="Save your owner key as a JSON file for safe-keeping. Restore at /owner/restore."
              >
                <Download size={12} /> Save backup
              </button>
              {sessions.length > 0 && (
                <button
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

function EmptyState({ onCreate }) {
  return (
    <div
      className="py-24 px-6 text-center"
      style={{
        opacity: 0,
        animation: `ownerReveal 700ms ease-out 200ms forwards`,
      }}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-neutral-500 mb-5">
        Empty library
      </p>
      <h2
        className="font-bold tracking-tight mb-5"
        style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", letterSpacing: "-0.02em" }}
      >
        No workshops yet
      </h2>
      <p
        className="leading-relaxed mb-8 max-w-md mx-auto"
        style={{ color: C.darkGray, fontSize: "1rem" }}
      >
        Create your first workshop. You'll get an admin URL to bookmark and a
        participant URL to share with your team.
      </p>
      <button
        onClick={onCreate}
        className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.22em]"
        style={{ background: C.red, color: C.white }}
      >
        + Create workshop
      </button>
    </div>
  );
}

function SessionsTable({ sessions, onDelete, onDownload, downloadingId }) {
  return (
    <div
      className="overflow-x-auto"
      style={{
        opacity: 0,
        animation: `ownerReveal 700ms ease-out 200ms forwards`,
      }}
    >
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b" style={{ borderColor: C.darkGray }}>
            <Th>Function</Th>
            <Th>Created</Th>
            <Th align="right">Participants</Th>
            <Th align="right">Ideas</Th>
            <Th align="right">Votes</Th>
            <Th>Top voted idea</Th>
            <Th align="right">&nbsp;</Th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s, idx) => (
            <SessionRow
              key={s._id}
              session={s}
              onDelete={() => onDelete(s)}
              onDownload={() => onDownload(s)}
              isDownloading={downloadingId === s._id}
              delay={300 + idx * 60}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-600"
      style={{ textAlign: align }}
    >
      {children}
    </th>
  );
}

function SessionRow({ session, onDelete, onDownload, isDownloading, delay = 0 }) {
  const adminUrl = `${window.location.origin}${session.adminUrl}`;
  const created = new Date(session.createdAt).toISOString().slice(0, 10);
  const top = session.topVotedIdea;

  return (
    <tr
      className="border-b group transition-colors hover:bg-neutral-50"
      style={{
        borderColor: C.lightGray,
        opacity: 0,
        animation: `ownerReveal 600ms ease-out ${delay}ms forwards`,
      }}
    >
      <td className="px-4 py-6 align-top">
        <div className="text-base font-bold tracking-tight" style={{ letterSpacing: "-0.005em" }}>
          {session.functionName}
        </div>
        <div className="text-[11px] mt-1 font-mono uppercase tracking-wider" style={{ color: C.gray500 }}>
          {session.code}
        </div>
      </td>
      <td className="px-4 py-6 text-sm align-top tabular-nums" style={{ color: C.darkGray }}>
        {created}
      </td>
      <td className="px-4 py-6 text-right tabular-nums align-top">
        <span className="text-base font-bold">{session.participantCount}</span>
      </td>
      <td className="px-4 py-6 text-right tabular-nums align-top">
        <span className="text-base font-bold">{session.ideaCount}</span>
      </td>
      <td className="px-4 py-6 text-right tabular-nums align-top">
        <span
          className="text-base font-bold"
          style={{ color: session.voteCount > 0 ? C.red : C.black }}
        >
          {session.voteCount}
        </span>
      </td>
      <td className="px-4 py-6 align-top max-w-md">
        {top ? (
          <div title={top.text}>
            <span
              className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: C.black, color: C.white, marginRight: "0.5rem" }}
            >
              {top.voteCount} {top.voteCount === 1 ? "vote" : "votes"}
            </span>
            <span className="text-sm" style={{ color: C.darkGray }}>
              {truncate(top.text, 80)}
            </span>
          </div>
        ) : (
          <span className="text-sm italic" style={{ color: C.gray500 }}>
            No votes yet
          </span>
        )}
      </td>
      <td className="px-4 py-6 text-right align-top">
        <div className="flex gap-2 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
          <a
            href={adminUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] border hover:bg-black hover:text-white transition-colors"
            style={{ borderColor: C.darkGray }}
          >
            Open
          </a>
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] border transition-colors hover:bg-black hover:text-white disabled:opacity-40 disabled:cursor-wait inline-flex items-center gap-1"
            style={{ borderColor: C.darkGray }}
            title="Download top ideas as Word"
          >
            <Download size={11} />
            {isDownloading ? "…" : "DOC"}
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] border transition-colors hover:bg-red-50"
            style={{ borderColor: C.lightGray, color: C.red }}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

function CreateModal({ ownerKey, onClose }) {
  const createSession = useMutation(api.ownerQueries.createSessionAsOwner);
  const [functionName, setFunctionName] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [industry, setIndustry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!functionName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createSession({
        ownerKey,
        functionName: functionName.trim(),
        teamSize: teamSize ? Number(teamSize) : undefined,
        industry: industry.trim() || undefined,
      });
      setCreated(result);
      const adminUrl = `${window.location.origin}/s/${result.code}/admin?k=${result.adminKey}`;
      try {
        await navigator.clipboard.writeText(adminUrl);
      } catch {
        // ignore
      }
    } catch (err) {
      setError(err?.message ?? "Could not create the workshop. Try again?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title={created ? "Workshop created" : "New workshop"}>
      {created ? (
        <CreatedSuccess
          code={created.code}
          adminKey={created.adminKey}
          onClose={onClose}
        />
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <Field
            label="Function (required)"
            value={functionName}
            onChange={setFunctionName}
            placeholder="HR, Product Marketing, Sales…"
            autoFocus
            required
          />
          <Field
            label="Team size (optional)"
            value={teamSize}
            onChange={setTeamSize}
            placeholder="6"
            type="number"
          />
          <Field
            label="Industry / company context (optional)"
            value={industry}
            onChange={setIndustry}
            placeholder="B2B SaaS, healthcare, manufacturing…"
          />

          {error && (
            <div
              className="text-sm px-4 py-3 border-l-4"
              style={{ borderColor: C.red, background: C.redLight, color: C.darkGray }}
            >
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
              style={{ color: C.darkGray }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !functionName.trim()}
              className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: C.red, color: C.white }}
            >
              {submitting ? "Creating…" : "Create workshop"}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

function CreatedSuccess({ code, adminKey, onClose }) {
  const adminUrl = `${window.location.origin}/s/${code}/admin?k=${adminKey}`;
  const participantUrl = `${window.location.origin}/s/${code}/join`;

  return (
    <div className="space-y-5">
      <div
        className="border-l-4 px-4 py-3 text-sm"
        style={{ borderColor: C.red, background: C.redLight }}
      >
        <strong className="block uppercase tracking-wider text-xs mb-1">
          🔖 Admin URL copied to your clipboard
        </strong>
        It's also visible in your dashboard now. Share the participant URL with your team.
      </div>

      <UrlBlock label="Admin URL" url={adminUrl} privateNote />
      <UrlBlock label="Participant URL" url={participantUrl} />

      <div className="flex items-center justify-end gap-3 pt-2">
        <a
          href={adminUrl}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border hover:bg-black hover:text-white transition-colors"
          style={{ borderColor: C.lightGray }}
        >
          Open admin
        </a>
        <button
          onClick={onClose}
          className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider"
          style={{ background: C.black, color: C.white }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function DeleteModal({ session, ownerKey, onClose }) {
  const deleteSession = useMutation(api.ownerQueries.deleteSessionAsOwner);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const onConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await deleteSession({ ownerKey, sessionId: session._id });
      onClose();
    } catch (err) {
      setError(err?.message ?? "Could not delete. Try again?");
      setSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title="Delete session">
      <p className="text-sm text-neutral-700 mb-5 leading-relaxed">
        Delete session <strong>{session.functionName}</strong> ({session.code})? This permanently deletes all{" "}
        <strong>{session.participantCount}</strong> participants' data and cannot be undone.
      </p>

      {error && (
        <div
          className="text-sm px-4 py-3 border-l-4 mb-4"
          style={{ borderColor: C.red, background: C.redLight, color: C.darkGray }}
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
          style={{ color: C.darkGray }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
          style={{ background: C.red, color: C.white }}
        >
          {submitting ? "Deleting…" : "Delete permanently"}
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="bg-white max-w-lg w-full p-7"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h2 id="modal-title" className="text-2xl font-bold tracking-tight mb-5">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required, autoFocus }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-wider mb-2 text-neutral-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        className="w-full px-4 py-2.5 border text-base focus:outline-none focus:ring-2"
        style={{ borderColor: C.lightGray }}
      />
    </label>
  );
}

function UrlBlock({ label, url, privateNote }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        {privateNote && (
          <span className="text-xs italic text-neutral-500">Keep this private</span>
        )}
      </div>
      <div
        className="flex items-stretch border"
        style={{ borderColor: C.lightGray }}
      >
        <input
          readOnly
          value={url}
          className="flex-1 min-w-0 px-3 py-2 text-xs bg-neutral-50 font-mono"
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          onClick={onCopy}
          className="px-3 text-xs font-semibold uppercase tracking-wider"
          style={{ background: C.black, color: C.white }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function FullPageStatus({ title, children }) {
  return (
    <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold tracking-tight mb-2">{title}</h1>
        <p className="text-sm text-neutral-600">{children}</p>
      </div>
    </main>
  );
}
