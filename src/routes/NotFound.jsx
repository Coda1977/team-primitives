// Catch-all route for invalid URLs. Editorial frame matches ErrorBoundary
// so this isn't the only page that looks like a starter template.

import { Link } from "react-router-dom";
import { C } from "../config/constants";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="kicker-row" style={{ justifyContent: "center" }}>
          <span className="kicker-tick" aria-hidden="true" />
          <span className="kicker-label">Not found · 404</span>
        </div>
        <h1
          className="font-bold leading-[1.05] mb-5 display-sm"
        >
          This page doesn't exist
        </h1>
        <p
          className="text-sm leading-relaxed mb-10"
          style={{ color: C.darkGray }}
        >
          The link you opened either has a typo or points at a workshop that's
          been deleted. Check the URL with whoever invited you.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-3 text-xs font-semibold uppercase tracking-[0.22em] touch-min"
          style={{ background: C.red, color: C.white }}
        >
          ← Back home
        </Link>
      </div>
    </main>
  );
}
