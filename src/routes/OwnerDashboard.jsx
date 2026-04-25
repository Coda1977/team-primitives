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
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { C } from "../config/constants";

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

function DashboardInner({ ownerKey, sessions }) {
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // session row to confirm delete

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <header className="flex items-center justify-between mb-8 pb-6 border-b" style={{ borderColor: C.lightGray }}>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Primitives</h1>
            <p className="text-sm text-neutral-600 mt-1">
              {sessions.length} workshop{sessions.length === 1 ? "" : "s"} in your library
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="px-5 py-3 text-sm font-semibold uppercase tracking-wider"
            style={{ background: C.red, color: C.white }}
          >
            + New workshop
          </button>
        </header>

        {sessions.length === 0 ? (
          <EmptyState onCreate={() => setCreating(true)} />
        ) : (
          <SessionsTable
            sessions={sessions}
            onDelete={(s) => setDeleteTarget(s)}
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
    <div className="border-2 border-dashed py-16 px-6 text-center" style={{ borderColor: C.lightGray }}>
      <h2 className="text-2xl font-bold tracking-tight mb-2">No workshops yet</h2>
      <p className="text-sm text-neutral-600 mb-6 max-w-md mx-auto">
        Create your first workshop. You'll get an admin URL to bookmark and a participant URL to share with your team.
      </p>
      <button
        onClick={onCreate}
        className="px-5 py-3 text-sm font-semibold uppercase tracking-wider"
        style={{ background: C.red, color: C.white }}
      >
        + Create workshop
      </button>
    </div>
  );
}

function SessionsTable({ sessions, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b" style={{ borderColor: C.lightGray }}>
            <Th>Function</Th>
            <Th>Created</Th>
            <Th align="right">Participants</Th>
            <Th align="right">Ideas</Th>
            <Th align="right">Votes</Th>
            <Th>Top voted idea</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <SessionRow key={s._id} session={s} onDelete={() => onDelete(s)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-neutral-600"
      style={{ textAlign: align }}
    >
      {children}
    </th>
  );
}

function SessionRow({ session, onDelete }) {
  const adminUrl = `${window.location.origin}${session.adminUrl}`;
  const created = new Date(session.createdAt).toISOString().slice(0, 10);
  const top = session.topVotedIdea;

  return (
    <tr className="border-b hover:bg-neutral-50" style={{ borderColor: C.lightGray }}>
      <td className="px-3 py-4">
        <div className="font-bold">{session.functionName}</div>
        <div className="text-xs text-neutral-500 font-mono mt-1">{session.code}</div>
      </td>
      <td className="px-3 py-4 text-neutral-700">{created}</td>
      <td className="px-3 py-4 text-right tabular-nums">{session.participantCount}</td>
      <td className="px-3 py-4 text-right tabular-nums">{session.ideaCount}</td>
      <td className="px-3 py-4 text-right tabular-nums">{session.voteCount}</td>
      <td className="px-3 py-4 text-neutral-700 max-w-md">
        {top ? (
          <span title={top.text}>
            <span className="font-semibold">{top.voteCount} votes</span>{" "}
            <span className="text-neutral-600">— {truncate(top.text, 80)}</span>
          </span>
        ) : (
          <span className="text-neutral-400 italic">No votes yet</span>
        )}
      </td>
      <td className="px-3 py-4 text-right">
        <div className="flex gap-2 justify-end">
          <a
            href={adminUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border hover:bg-black hover:text-white transition-colors"
            style={{ borderColor: C.lightGray }}
          >
            Open
          </a>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border hover:text-white transition-colors"
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
