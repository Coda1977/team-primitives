// Route: /
// Minimal landing. Sessions are created from the owner dashboard, not here.
// Participants don't visit `/` — they use a /s/:code/join link.
// The owner uses their bookmarked /owner#k=... URL.

export default function AdminCreate() {
  return (
    <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-3">Team Primitives</h1>
        <p className="text-sm text-neutral-600 leading-relaxed">
          If you're an <strong>owner</strong>, use your bookmarked owner URL.
          <br />
          If you're a <strong>participant</strong>, you should have received a join link.
        </p>
      </div>
    </main>
  );
}
