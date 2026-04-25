// Route: /s/:code/p/:slug
// Persona: participant going through intake -> canvas -> locked phases.
// Dispatches to the correct view based on participant.phase.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getParticipantId } from "../utils/localParticipant";
import IntakeView from "../components/views/IntakeView";
import { C } from "../config/constants";

export default function Participant() {
  const { code, slug } = useParams();
  const session = useQuery(api.sessions.getSession, code ? { code } : "skip");
  const participantBySlug = useQuery(
    api.participants.getParticipantBySlug,
    session && slug ? { sessionId: session._id, slug } : "skip"
  );

  if (session === undefined || participantBySlug === undefined) {
    return <FullPageStatus>Loading…</FullPageStatus>;
  }
  if (session === null) {
    return <FullPageStatus>Workshop not found.</FullPageStatus>;
  }
  if (participantBySlug === null) {
    return <FullPageStatus>Participant not found in this workshop.</FullPageStatus>;
  }

  // Verify localStorage links this participant to this device (for soft identity check)
  const localId = getParticipantId(code);
  const isOwner = localId === participantBySlug._id;

  return (
    <ParticipantInner
      session={session}
      participant={participantBySlug}
      isOwner={isOwner}
    />
  );
}

function ParticipantInner({ session, participant, isOwner }) {
  const generateCanvas = useAction(api.ai.generateCanvas.run);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  const onIntakeSubmitted = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      await generateCanvas({ participantId: participant._id });
    } catch (err) {
      setGenError(err?.message ?? "Could not generate your canvas. Try again?");
      setGenerating(false);
    }
  };

  // Phase dispatch
  if (participant.phase === "intake") {
    if (generating) {
      return <CanvasGeneratingScreen error={genError} onRetry={onIntakeSubmitted} />;
    }
    return (
      <IntakeView
        session={session}
        participant={participant}
        onSubmitted={onIntakeSubmitted}
      />
    );
  }

  if (participant.phase === "canvas") {
    return <CanvasPlaceholder session={session} participant={participant} />;
  }

  if (participant.phase === "locked") {
    return (
      <FullPageStatus>
        Your contribution is locked in ✓
        <br />
        <span className="text-sm text-neutral-500">
          [stub] MyBoardView (Phase B step 13) will render here.
        </span>
      </FullPageStatus>
    );
  }

  return <FullPageStatus>Unknown participant phase.</FullPageStatus>;
}

function CanvasGeneratingScreen({ error, onRetry }) {
  if (error) {
    return (
      <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div
            className="text-sm px-4 py-3 border-l-4 mb-6 text-left"
            style={{ borderColor: C.red, background: C.redLight, color: C.darkGray }}
          >
            {error}
          </div>
          <button
            onClick={onRetry}
            className="px-6 py-3 text-sm font-semibold uppercase tracking-wider"
            style={{ background: C.red, color: C.white }}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Generating your AI canvas…
        </h1>
        <p className="text-sm text-neutral-600">
          This takes 6–10 seconds. We're brainstorming use cases across all 6 primitive categories based on your answers.
        </p>
      </div>
    </main>
  );
}

function CanvasPlaceholder({ session, participant }) {
  return (
    <main className="min-h-screen bg-white text-black px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Your {session.functionName} AI canvas
        </h1>
        <p className="text-sm text-neutral-500 mb-6">
          Welcome, {participant.name} ({participant.slug}). [stub] CanvasView arrives in Phase B step 10.
        </p>
        <p className="text-xs text-neutral-400">
          Canvas was generated. Ideas live in Convex — check the dashboard or query the `ideas` table.
        </p>
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
