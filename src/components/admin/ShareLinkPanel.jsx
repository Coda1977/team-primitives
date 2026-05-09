// Top of the admin board — function name as hero, both URLs in a refined frame.
// No heavy tinted background; just a clean header card.

import { useState } from "react";
import { C } from "../../config/constants";
import { buildAdminUrl } from "../../utils/adminKey";

export default function ShareLinkPanel({ session, adminKey }) {
  const adminUrl = buildAdminUrl(window.location.origin, session.code, adminKey);
  const participantUrl = `${window.location.origin}/s/${session.code}/join`;

  return (
    <div className="mb-12">
      <div className="flex items-baseline justify-between gap-3 mb-1 flex-wrap">
        <div>
          <h2
            className="font-bold tracking-tight"
            style={{
              fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
              letterSpacing: "-0.025em",
            }}
          >
            {session.functionName}
          </h2>
        </div>
        <p className="text-xs" style={{ color: C.gray500 }}>
          <span className="font-mono uppercase tracking-[0.18em]">{session.code}</span>
          {session.industry ? (
            <>
              <span className="mx-2" style={{ color: C.lightGray }}>·</span>
              {session.industry}
            </>
          ) : null}
          {session.teamSize ? (
            <>
              <span className="mx-2" style={{ color: C.lightGray }}>·</span>
              team of {session.teamSize}
            </>
          ) : null}
        </p>
      </div>

      <hr
        className="my-6 border-0 h-px"
        style={{ background: C.lightGray }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <UrlBlock label="Participant URL" url={participantUrl} kicker="Share with the team" />
        <UrlBlock label="Admin URL" url={adminUrl} kicker="Keep private, bookmark it" privateNote />
      </div>
    </div>
  );
}

function UrlBlock({ label, url, kicker, privateNote }) {
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
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em]">{label}</span>
        <span
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{ color: privateNote ? C.red : C.gray500 }}
        >
          {kicker}
        </span>
      </div>
      <div
        className="flex items-stretch border bg-white"
        style={{ borderColor: C.lightGray }}
      >
        <input
          readOnly
          value={url}
          className="flex-1 min-w-0 px-3 py-2.5 text-xs bg-transparent font-mono"
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          onClick={onCopy}
          className="px-4 text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ background: C.black, color: C.white }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}
