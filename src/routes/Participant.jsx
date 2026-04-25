// Route: /s/:code/p/:slug
// Persona: participant going through intake -> canvas -> locked phases
// Phase B steps 8-13 wire this shell to dispatch by participant.phase.

import { useParams } from "react-router-dom";

export default function Participant() {
  const { code, slug } = useParams();
  return (
    <main className="min-h-screen bg-white text-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {code} / {slug}
        </h1>
        <p className="text-sm text-neutral-500 italic">
          [stub] Participant shell. Will dispatch IntakeView / CanvasView / MyBoardView based on phase.
        </p>
      </div>
    </main>
  );
}
