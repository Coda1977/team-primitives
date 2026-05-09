// Route: /s/:code/join
// First impression for participants. Editorial welcome treatment — kicker rule,
// the function name as the hero, name field below.

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  setParticipantId,
  setParticipantSlug,
  getParticipantId,
  getParticipantSlug,
} from "../utils/localParticipant";
import { C } from "../config/constants";
import StatusBlock from "../components/shared/StatusBlock";

const FADE_KEYFRAMES = `
  @keyframes joinReveal {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

export default function Join() {
  const { code } = useParams();
  const navigate = useNavigate();
  const session = useQuery(api.sessions.getSession, code ? { code } : "skip");
  const joinSession = useMutation(api.participants.joinSession);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (session === undefined) {
    return <FullPageStatus>Loading workshop…</FullPageStatus>;
  }
  if (session === null) {
    return (
      <FullPageStatus>
        Workshop not found. Check the URL with whoever invited you.
      </FullPageStatus>
    );
  }
  if (session.status === "closed") {
    return <FullPageStatus>This workshop is closed to new joiners.</FullPageStatus>;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await joinSession({
        sessionId: session._id,
        name: name.trim(),
      });
      setParticipantId(code, result.participantId);
      setParticipantSlug(code, result.slug);
      navigate(`/s/${code}/p/${result.slug}`);
    } catch (err) {
      setError(err?.message ?? "Could not join. Try again?");
      setSubmitting(false);
    }
  };

  const existing = getParticipantId(code);
  const existingSlug = getParticipantSlug(code);

  return (
    <main className="min-h-screen bg-white text-black flex flex-col">
      <style>{FADE_KEYFRAMES}</style>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-xl w-full">
          <div
            style={{
              opacity: 0,
              animation: `joinReveal 700ms ease-out 0ms forwards`,
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <span
                className="inline-block w-1 h-5"
                style={{ background: C.red }}
              />
              <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-neutral-500">
                Team Primitives · Workshop
              </span>
            </div>
            <h1
              className="font-bold leading-[1] tracking-tight mb-6"
              style={{
                fontSize: "clamp(2.75rem, 6vw, 4.5rem)",
                letterSpacing: "-0.03em",
              }}
            >
              {session.functionName}
            </h1>
            <p
              className="leading-relaxed mb-12"
              style={{
                fontSize: "clamp(1.05rem, 1.3vw, 1.2rem)",
                color: C.darkGray,
              }}
            >
              You're about to brainstorm where AI fits in your function.
              {" "}<span style={{ color: C.gray500 }}>About 20 minutes. Make sure you have time to focus.</span>
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            style={{
              opacity: 0,
              animation: `joinReveal 700ms ease-out 200ms forwards`,
            }}
          >
            <label className="block mb-5">
              <span className="block text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-700 mb-3">
                Your name
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jordan, Priya, Alex"
                autoFocus
                required
                inputMode="text"
                className="w-full px-5 py-4 text-lg bg-white border focus:outline-none transition-colors"
                style={{
                  borderColor: name ? C.darkGray : C.lightGray,
                }}
              />
            </label>

            {error && (
              <StatusBlock variant="alert" kicker="Couldn't join" className="mb-5">
                {error}
              </StatusBlock>
            )}

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full px-6 py-4 text-sm font-semibold uppercase tracking-[0.22em] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-3 transition-colors"
              style={{
                // gray500 on white = 5.74:1, passes WCAG AA. gray300 (#999)
                // was 2.85:1, borderline readable.
                background: name.trim() ? C.red : C.gray500,
                color: C.white,
                minHeight: "var(--touch-min)",
              }}
            >
              {submitting ? "Joining…" : (
                <>
                  Enter the workshop
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          {existing && existingSlug && (
            <div
              className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap"
              style={{
                borderColor: C.lightGray,
                opacity: 0,
                animation: `joinReveal 700ms ease-out 400ms forwards`,
              }}
            >
              <p className="text-xs" style={{ color: C.gray500 }}>
                Already joined on this device?
              </p>
              <button
                type="button"
                onClick={() => navigate(`/s/${code}/p/${existingSlug}`)}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] border touch-min"
                style={{
                  borderColor: C.charcoal,
                  color: C.charcoal,
                  background: "transparent",
                }}
              >
                Resume your board →
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function FullPageStatus({ children }) {
  return (
    <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="kicker-row" style={{ justifyContent: "center" }}>
          <span className="kicker-tick kicker-tick--sm" aria-hidden="true" />
          <span className="kicker-label kicker-label--sm">
            Team Primitives · Workshop
          </span>
        </div>
        <p
          className="text-base"
          style={{ color: C.darkGray, lineHeight: 1.55 }}
        >
          {children}
        </p>
      </div>
    </main>
  );
}
