// Route: /s/:code/admin?k=:adminKey
// Persona: session admin (group lead running the workshop)
// Phase C wires roster + raw starred + synthesize. Phase D adds voting controls.

import { useParams, useSearchParams } from "react-router-dom";

export default function AdminBoard() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get("k");

  return (
    <main className="min-h-screen bg-white text-black p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Admin board — {code}
        </h1>
        <p className="text-sm text-neutral-500 italic">
          [stub] Roster + Synthesize + Voting controls go here in Phases C–D.
        </p>
        <p className="text-xs text-neutral-400 mt-4">
          {adminKey ? "(admin key present)" : "(no admin key — should redirect home)"}
        </p>
      </div>
    </main>
  );
}
