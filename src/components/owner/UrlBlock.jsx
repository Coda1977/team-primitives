import { useState } from "react";
import { C } from "../../config/constants";

// Read-only URL display with a one-click copy button. Used for both admin
// and participant URLs after a session is created.
export default function UrlBlock({ label, url, privateNote }) {
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
