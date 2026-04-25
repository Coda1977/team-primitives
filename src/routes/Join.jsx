// Route: /s/:code/join
// Persona: participant arriving from a shared link
// Phase B step 7 wires this to convex/participants.ts joinSession mutation.

import { useParams } from "react-router-dom";

export default function Join() {
  const { code } = useParams();
  return (
    <main className="min-h-screen bg-white text-black p-8 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Team Primitives</h1>
        <p className="text-base text-neutral-700 mb-2">Workshop session: {code}</p>
        <p className="text-sm text-neutral-500 italic">
          [stub] Name input + Join button go here in Phase B step 7.
        </p>
      </div>
    </main>
  );
}
