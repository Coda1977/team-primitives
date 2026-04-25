// Catch-all route for invalid URLs.

import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white text-black p-8 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">404</h1>
        <p className="text-base text-neutral-700 mb-6">
          Workshop not found. Check the URL with whoever invited you.
        </p>
        <Link
          to="/"
          className="inline-block px-5 py-3 bg-black text-white text-sm font-semibold tracking-wider uppercase rounded hover:bg-neutral-800 transition-colors"
        >
          ← Home
        </Link>
      </div>
    </main>
  );
}
