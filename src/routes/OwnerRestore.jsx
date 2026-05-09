// Route: /owner/restore
// Lost your /owner#k=... bookmark? Drop the backup JSON here and we'll
// validate it against this Convex deployment, then redirect to /owner with
// the key in the fragment so you can re-bookmark.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConvex } from "convex/react";
import { Upload, AlertTriangle } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { C } from "../config/constants";
import StatusBlock from "../components/shared/StatusBlock";

const FADE_KEYFRAMES = `
  @keyframes restoreReveal {
    0% { opacity: 0; transform: translateY(16px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

export default function OwnerRestore() {
  const convex = useConvex();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filename, setFilename] = useState(null);

  const onFile = async (file) => {
    if (!file) return;
    setFilename(file.name);
    setBusy(true);
    setError(null);
    try {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(
          "That doesn't look like a valid backup file. Expected JSON."
        );
      }
      if (!parsed || typeof parsed.ownerKey !== "string" || !parsed.ownerKey) {
        throw new Error(
          "Backup file is missing an `ownerKey` field. Did you upload the right file?"
        );
      }
      // Validate by attempting to list sessions. listAllSessions returns null
      // when the key doesn't match this deployment's OWNER_KEY env var.
      const ownerKey = parsed.ownerKey.trim();
      const sessions = await convex.query(api.ownerQueries.listAllSessions, {
        ownerKey,
      });
      if (sessions === null) {
        throw new Error(
          "This key doesn't match the current deployment. The backup might be from a different environment (e.g., from prod when you're now on dev), or the OWNER_KEY env var has been rotated since this backup was made."
        );
      }
      // Success — hand off to OwnerDashboard via fragment
      navigate(`/owner#k=${encodeURIComponent(ownerKey)}`, { replace: true });
    } catch (err) {
      setError(err?.message ?? "Could not restore from this file.");
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-black flex flex-col">
      <style>{FADE_KEYFRAMES}</style>
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-xl w-full">
          <div
            style={{
              opacity: 0,
              animation: `restoreReveal 700ms ease-out 0ms forwards`,
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <span
                className="inline-block w-1 h-5"
                style={{ background: C.red }}
              />
              <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-neutral-500">
                Owner · Restore
              </span>
            </div>
            <h1
              className="font-bold leading-[1] tracking-tight mb-6"
              style={{
                fontSize: "clamp(2.5rem, 5vw, 3.75rem)",
                letterSpacing: "-0.025em",
              }}
            >
              Restore owner access
            </h1>
            <p
              className="leading-relaxed mb-12 max-w-lg"
              style={{
                fontSize: "1rem",
                color: C.darkGray,
              }}
            >
              Drop in the <strong>backup JSON file</strong> you saved from your
              owner dashboard. We'll validate the key against this deployment
              and put you back into the dashboard.
            </p>
          </div>

          <div
            style={{
              opacity: 0,
              animation: `restoreReveal 700ms ease-out 200ms forwards`,
            }}
          >
            <label
              className="block border-2 border-dashed cursor-pointer hover:bg-neutral-50 focus-within:bg-neutral-50 p-12 text-center"
              style={{
                borderColor: C.lightGray,
                transition: "background-color 0.2s ease, border-color 0.2s ease",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = C.electricBlue)}
              onBlur={(e) => (e.currentTarget.style.borderColor = C.lightGray)}
            >
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                disabled={busy}
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              <Upload
                size={28}
                className="mx-auto mb-4"
                style={{ color: C.darkGray }}
              />
              <p className="text-sm font-semibold mb-1">
                {busy
                  ? "Validating…"
                  : filename
                  ? filename
                  : "Click to choose a backup file"}
              </p>
              <p className="text-xs" style={{ color: C.gray500 }}>
                {filename && !busy && !error
                  ? "Restored. Redirecting…"
                  : "team-primitives-owner-*.json"}
              </p>
            </label>

            {error && (
              <div className="mt-6">
                <StatusBlock
                  variant="alert"
                  kicker="Restore failed"
                  icon={<AlertTriangle size={16} />}
                >
                  {error}
                </StatusBlock>
              </div>
            )}

            <div
              className="mt-12 pt-6 border-t text-xs leading-relaxed"
              style={{ borderColor: C.lightGray, color: C.gray500 }}
            >
              <p className="mb-2">
                <strong style={{ color: C.darkGray }}>
                  No backup file?
                </strong>{" "}
                Run{" "}
                <code className="font-mono px-1 py-0.5 bg-neutral-100">
                  npx convex env set OWNER_KEY $(openssl rand -hex 16)
                </code>{" "}
                to rotate the key, then visit{" "}
                <code className="font-mono px-1 py-0.5 bg-neutral-100">
                  /owner#k=&lt;new-key&gt;
                </code>{" "}
                and immediately download a fresh backup.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
