// Top of the admin board: shows function name, both URLs, copy buttons, +
// the bookmark banner. The admin URL is sensitive (anyone with it gets admin
// powers for this session); the participant URL is shareable.

import { useState } from "react";
import { C } from "../../config/constants";

export default function ShareLinkPanel({ session, adminKey }) {
  const adminUrl = `${window.location.origin}/s/${session.code}/admin?k=${adminKey}`;
  const participantUrl = `${window.location.origin}/s/${session.code}/join`;

  return (
    <div
      className="border-l-4 px-5 py-4 mb-6"
      style={{ borderColor: C.electricBlue, background: "rgba(0,163,224,0.06)" }}
    >
      <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{session.functionName}</h2>
          <p className="text-xs text-neutral-600 mt-0.5">
            <span className="font-mono">{session.code}</span>
            {session.industry ? ` · ${session.industry}` : ""}
            {session.teamSize ? ` · team of ${session.teamSize}` : ""}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <UrlBlock label="Participant URL" url={participantUrl} />
        <UrlBlock label="Admin URL" url={adminUrl} privateNote />
      </div>
    </div>
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
          <span className="text-[10px] italic text-neutral-500">Keep private</span>
        )}
      </div>
      <div className="flex items-stretch border bg-white" style={{ borderColor: C.lightGray }}>
        <input
          readOnly
          value={url}
          className="flex-1 min-w-0 px-3 py-2 text-xs bg-transparent font-mono"
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          onClick={onCopy}
          className="px-3 text-[10px] font-semibold uppercase tracking-wider"
          style={{ background: C.black, color: C.white }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}
