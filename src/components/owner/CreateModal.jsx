import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { C } from "../../config/constants";
import { buildAdminUrl } from "../../utils/adminKey";
import ModalShell from "./ModalShell";
import Field from "./Field";
import UrlBlock from "./UrlBlock";

export default function CreateModal({ ownerKey, onClose }) {
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
      const adminUrl = buildAdminUrl(window.location.origin, result.code, result.adminKey);
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
              role="alert"
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
  const adminUrl = buildAdminUrl(window.location.origin, code, adminKey);
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
          type="button"
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
