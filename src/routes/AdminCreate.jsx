// Route: /
// Persona: facilitator/owner creating a workshop.
// On submit: createSession mutation -> show success state with admin + participant URLs.

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { C } from "../config/constants";

export default function AdminCreate() {
  const createSession = useMutation(api.sessions.createSession);
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
        functionName: functionName.trim(),
        teamSize: teamSize ? Number(teamSize) : undefined,
        industry: industry.trim() || undefined,
      });
      setCreated(result);
      // Auto-copy admin URL to clipboard
      const adminUrl = `${window.location.origin}/s/${result.code}/admin?k=${result.adminKey}`;
      try {
        await navigator.clipboard.writeText(adminUrl);
      } catch {
        // ignore — not critical
      }
    } catch (err) {
      setError(err?.message ?? "Could not create the workshop. Try again?");
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    const adminUrl = `${window.location.origin}/s/${created.code}/admin?k=${created.adminKey}`;
    const participantUrl = `${window.location.origin}/s/${created.code}/join`;
    return (
      <main className="min-h-screen bg-white text-black px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div
            className="border-l-4 px-5 py-4 mb-8 text-sm"
            style={{ borderColor: C.red, background: C.redLight }}
          >
            <strong className="block uppercase tracking-wider text-xs mb-1">
              🔖 Bookmark the admin URL
            </strong>
            It's the only way back to your admin view. We've copied it to your clipboard.
          </div>

          <h1 className="text-4xl font-bold tracking-tight mb-8">
            Workshop created
          </h1>

          <UrlBlock label="Admin URL" url={adminUrl} privateNote />
          <UrlBlock label="Participant URL" url={participantUrl} />

          <a
            href={adminUrl}
            className="inline-block mt-4 px-6 py-3 text-sm font-semibold uppercase tracking-wider"
            style={{ background: C.red, color: C.white }}
          >
            Go to admin board →
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black px-6 py-12">
      <div className="max-w-xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          New workshop
        </h1>
        <p className="text-base text-neutral-700 mb-10">
          Create a session, share the participant URL with your team, and run the workshop together.
        </p>

        <form onSubmit={onSubmit} className="space-y-6">
          <Field
            label="Function (required)"
            value={functionName}
            onChange={setFunctionName}
            placeholder="HR, Product Marketing, Sales…"
            required
            autoFocus
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

          <button
            type="submit"
            disabled={submitting || !functionName.trim()}
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: C.red, color: C.white }}
          >
            {submitting ? "Creating…" : "Create workshop"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required, autoFocus }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold mb-2 text-neutral-800">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        className="w-full px-4 py-3 border text-base focus:outline-none focus:ring-2 focus:ring-offset-2"
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
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-bold uppercase tracking-wider">
          {label}
        </span>
        {privateNote && (
          <span className="text-xs italic text-neutral-500">
            Keep this private. Bookmark it.
          </span>
        )}
      </div>
      <div className="flex items-stretch border" style={{ borderColor: C.lightGray }}>
        <input
          readOnly
          value={url}
          className="flex-1 min-w-0 px-3 py-2 text-sm bg-neutral-50 font-mono"
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          onClick={onCopy}
          className="px-4 text-xs font-semibold uppercase tracking-wider"
          style={{ background: C.black, color: C.white }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}
