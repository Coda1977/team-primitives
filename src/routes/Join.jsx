// Route: /s/:code/join
// Persona: participant arriving from a shared link.
// On submit: joinSession mutation -> store participantId in localStorage -> navigate to participant URL.

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { setParticipantId, getParticipantId } from "../utils/localParticipant";
import { C } from "../config/constants";

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
    return <FullPageStatus>Workshop not found. Check the URL with whoever invited you.</FullPageStatus>;
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
      navigate(`/s/${code}/p/${result.slug}`);
    } catch (err) {
      setError(err?.message ?? "Could not join. Try again?");
      setSubmitting(false);
    }
  };

  // Existing participant on this device? Offer a quick re-entry.
  const existing = getParticipantId(code);

  return (
    <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
      <div className="max-w-md w-full">
        <h1 className="text-4xl font-bold tracking-tight mb-2 text-center">
          Team Primitives
        </h1>
        <p className="text-base text-neutral-700 mb-8 text-center">
          {session.functionName} workshop — brainstorm where AI fits in your function
        </p>
        <p className="text-sm text-neutral-600 mb-8">
          Enter your name to start. This will take about 20 minutes — make sure you have time to focus.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-semibold mb-2 text-neutral-800">
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
              className="w-full px-4 py-3 border text-base focus:outline-none focus:ring-2"
              style={{ borderColor: C.lightGray }}
            />
          </label>

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
            disabled={submitting || !name.trim()}
            className="w-full px-6 py-3 text-sm font-semibold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: C.red, color: C.white }}
          >
            {submitting ? "Joining…" : "Join workshop →"}
          </button>
        </form>

        {existing && (
          <p className="text-xs text-center text-neutral-500 mt-6">
            You've already joined this workshop on this device.{" "}
            <button
              onClick={() => navigate(`/s/${code}/p/`)}
              className="underline hover:text-black"
            >
              Resume
            </button>
          </p>
        )}
      </div>
    </main>
  );
}

function FullPageStatus({ children }) {
  return (
    <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
      <p className="text-base text-neutral-700 text-center max-w-md">{children}</p>
    </main>
  );
}
