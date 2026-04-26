// Route: /s/:code/p/:slug
// Persona: participant going through intake -> canvas -> locked phases.
// Dispatches to the correct view based on participant.phase.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import IntakeView from "../components/views/IntakeView";
import CanvasView from "../components/views/CanvasView";
import MyBoardView from "../components/views/MyBoardView";
import GeneratingIndicator from "../components/shared/GeneratingIndicator";
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

  return (
    <ParticipantInner
      session={session}
      participant={participantBySlug}
    />
  );
}

function ParticipantInner({ session, participant }) {
  const generateCanvas = useAction(api.ai.generateCanvas.run);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  // Tracks whether the GeneratingIndicator's 6-step animation has finished.
  // Even if the action returns before the animation, we hold on the indicator
  // so the user gets the "AI is working through each primitive" feel.
  const [animationDone, setAnimationDone] = useState(false);

  const onIntakeSubmitted = async () => {
    setGenerating(true);
    setAnimationDone(false);
    setGenError(null);
    try {
      await generateCanvas({ participantId: participant._id });
    } catch (err) {
      setGenError(err?.message ?? "Could not generate your canvas. Try again?");
      setGenerating(false);
    }
  };

  // Once the animation finishes AND the action has flipped the participant
  // phase to "canvas", drop the `generating` flag so the canvas view mounts.
  useEffect(() => {
    if (animationDone && participant.phase === "canvas") {
      setGenerating(false);
    }
  }, [animationDone, participant.phase]);

  if (genError) {
    return <CanvasGenErrorScreen error={genError} onRetry={onIntakeSubmitted} />;
  }

  if (generating) {
    return (
      <GeneratingIndicator
        onReady={() => setAnimationDone(true)}
        apiReady={participant.phase === "canvas"}
      />
    );
  }

  // Phase dispatch
  if (participant.phase === "intake") {
    return (
      <IntakeView
        session={session}
        participant={participant}
        onSubmitted={onIntakeSubmitted}
      />
    );
  }

  if (participant.phase === "canvas") {
    return <CanvasView session={session} participant={participant} />;
  }

  if (participant.phase === "locked") {
    return <MyBoardView session={session} participant={participant} />;
  }

  return <FullPageStatus>Unknown participant phase.</FullPageStatus>;
}

function CanvasGenErrorScreen({ error, onRetry }) {
  return (
    <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
      <div className="max-w-md text-center">
        <div
          role="alert"
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

function FullPageStatus({ children }) {
  return (
    <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
      <p className="text-base text-neutral-700 text-center max-w-md">{children}</p>
    </main>
  );
}
