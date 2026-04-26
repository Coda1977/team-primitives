import { Download } from "lucide-react";
import { C } from "../../config/constants";

// Sessions list. Two layouts:
// - md+ : data table with the full set of columns. Hover-only opacity is
//   intentionally dropped per the a11y review — buttons stay full-opacity.
// - < md : card stack. Touch devices don't hover, so the action buttons are
//   always visible and at full touch-target size.

export default function SessionsTable({
  sessions,
  onDelete,
  onDownload,
  downloadingId,
}) {
  return (
    <div
      style={{
        opacity: 0,
        animation: `ownerReveal 700ms ease-out 200ms forwards`,
      }}
    >
      <div className="hidden md:block overflow-x-auto">
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
                delay={Math.min(300 + idx * 60, 1500)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-4">
        {sessions.map((s, idx) => (
          <SessionCard
            key={s._id}
            session={s}
            onDelete={() => onDelete(s)}
            onDownload={() => onDownload(s)}
            isDownloading={downloadingId === s._id}
            delay={Math.min(300 + idx * 60, 1500)}
          />
        ))}
      </div>
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
        <div className="flex gap-2 justify-end">
          <a
            href={adminUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] border hover:bg-black hover:text-white transition-colors"
            style={{ borderColor: C.darkGray }}
          >
            Open
          </a>
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] border transition-colors hover:bg-black hover:text-white disabled:opacity-40 disabled:cursor-wait inline-flex items-center gap-1"
            style={{ borderColor: C.darkGray }}
            title="Download top ideas as Word"
          >
            <Download size={11} />
            {isDownloading ? "…" : "DOC"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] border transition-colors hover:bg-red-50"
            style={{ borderColor: C.lightGray, color: C.red }}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function SessionCard({ session, onDelete, onDownload, isDownloading, delay = 0 }) {
  const adminUrl = `${window.location.origin}${session.adminUrl}`;
  const created = new Date(session.createdAt).toISOString().slice(0, 10);
  const top = session.topVotedIdea;

  return (
    <article
      className="border p-5"
      style={{
        borderColor: C.lightGray,
        opacity: 0,
        animation: `ownerReveal 600ms ease-out ${delay}ms forwards`,
      }}
    >
      <header className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h3 className="text-lg font-bold tracking-tight">{session.functionName}</h3>
          <div
            className="text-[11px] mt-1 font-mono uppercase tracking-wider"
            style={{ color: C.gray500 }}
          >
            {session.code} · {created}
          </div>
        </div>
      </header>

      <div className="flex items-center gap-5 text-sm tabular-nums mb-4">
        <span>
          <strong className="text-base">{session.participantCount}</strong>
          <span className="ml-1 text-xs" style={{ color: C.gray500 }}>people</span>
        </span>
        <span>
          <strong className="text-base">{session.ideaCount}</strong>
          <span className="ml-1 text-xs" style={{ color: C.gray500 }}>ideas</span>
        </span>
        <span>
          <strong
            className="text-base"
            style={{ color: session.voteCount > 0 ? C.red : C.black }}
          >
            {session.voteCount}
          </strong>
          <span className="ml-1 text-xs" style={{ color: C.gray500 }}>votes</span>
        </span>
      </div>

      {top ? (
        <p className="text-sm leading-relaxed mb-4" style={{ color: C.darkGray }}>
          <span
            className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: C.black, color: C.white, marginRight: "0.5rem" }}
          >
            {top.voteCount} {top.voteCount === 1 ? "vote" : "votes"}
          </span>
          {truncate(top.text, 120)}
        </p>
      ) : (
        <p className="text-sm italic mb-4" style={{ color: C.gray500 }}>
          No votes yet
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        <a
          href={adminUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-1 min-w-[5rem] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] border text-center hover:bg-black hover:text-white transition-colors"
          style={{ borderColor: C.darkGray }}
        >
          Open
        </a>
        <button
          type="button"
          onClick={onDownload}
          disabled={isDownloading}
          className="flex-1 min-w-[5rem] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] border transition-colors hover:bg-black hover:text-white disabled:opacity-40 disabled:cursor-wait inline-flex items-center justify-center gap-1"
          style={{ borderColor: C.darkGray }}
          title="Download top ideas as Word"
        >
          <Download size={12} />
          {isDownloading ? "…" : "DOC"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex-1 min-w-[5rem] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] border transition-colors hover:bg-red-50"
          style={{ borderColor: C.lightGray, color: C.red }}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}
