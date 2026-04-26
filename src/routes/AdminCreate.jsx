// Route: /
// Minimal landing for visitors with no credentials. If this browser has a
// previously-validated owner key in localStorage, we auto-redirect to
// `/owner` so the owner doesn't have to retype their bookmark every time.
// Otherwise we show the front door.
//
// Participants don't visit `/` — they use a /s/:code/join link.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { C } from "../config/constants";
import { getOwnerKey } from "../utils/localOwner";

export default function AdminCreate() {
  const navigate = useNavigate();
  // Don't render anything until we've checked localStorage. Avoids a flash
  // of the front door before redirect.
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = getOwnerKey();
    if (stored) {
      navigate(`/owner#k=${encodeURIComponent(stored)}`, { replace: true });
      return;
    }
    setChecked(true);
  }, [navigate]);

  if (!checked) return null;

  return (
    <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
      <div className="max-w-md text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <span
            className="inline-block w-1 h-5"
            style={{ background: C.red }}
          />
          <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-neutral-500">
            Team Primitives
          </span>
        </div>
        <h1
          className="font-bold tracking-tight mb-6"
          style={{
            fontSize: "clamp(2rem, 4vw, 2.75rem)",
            letterSpacing: "-0.025em",
          }}
        >
          You're at the front door
        </h1>
        <p
          className="leading-relaxed mb-12"
          style={{ color: C.darkGray, fontSize: "1rem" }}
        >
          If you're the <strong>owner</strong>, use your bookmarked{" "}
          <code className="font-mono text-[0.9em]">/owner#k=…</code> URL.
          <br />
          If you're a <strong>participant</strong>, you should have received a
          join link.
        </p>
        <Link
          to="/owner/restore"
          className="text-xs uppercase tracking-[0.22em] font-semibold underline-offset-4 hover:underline"
          style={{ color: C.gray500 }}
        >
          Lost your owner URL? Restore from backup →
        </Link>
      </div>
    </main>
  );
}
