import { C } from "../../config/constants";

// Shown when the owner has zero sessions. The whole dashboard collapses to
// this single CTA so the next action is obvious.
export default function EmptyState({ onCreate }) {
  return (
    <div
      className="text-center py-24"
      style={{
        opacity: 0,
        animation: `ownerReveal 700ms ease-out 200ms forwards`,
      }}
    >
      <h2
        className="font-bold tracking-tight mb-5"
        style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", letterSpacing: "-0.02em" }}
      >
        No workshops yet
      </h2>
      <p
        className="leading-relaxed mb-8 max-w-md mx-auto"
        style={{ color: C.darkGray, fontSize: "1rem" }}
      >
        Create your first workshop. You'll get an admin URL to bookmark and a
        participant URL to share with your team.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.22em]"
        style={{ background: C.red, color: C.white }}
      >
        + Create workshop
      </button>
    </div>
  );
}
