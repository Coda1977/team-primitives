// Route: /
// Persona: facilitator/owner creating a workshop
// Phase B will wire this to convex/sessions.ts createSession mutation.

export default function AdminCreate() {
  return (
    <main className="min-h-screen bg-white text-black p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight mb-4">New workshop</h1>
        <p className="text-lg text-neutral-700 mb-8">
          Create a session, share the participant URL with your team, and run the workshop together.
        </p>
        <p className="text-sm text-neutral-500 italic">
          [stub] Form goes here in Phase B step 6.
        </p>
      </div>
    </main>
  );
}
