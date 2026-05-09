// Route: /
// Minimal landing for visitors with no credentials. If this browser has a
// previously-validated owner key in localStorage, we auto-redirect to
// `/owner` so the owner doesn't have to retype their bookmark every time.
// Otherwise we show the front door (editorial broadcast scale, matches
// the rest of the system).
//
// Participants don't visit `/` — they use a /s/:code/join link.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { C } from "../config/constants";
import { getOwnerKey } from "../utils/localOwner";

const FADE_KEYFRAMES = `
  @keyframes frontDoorReveal {
    0% { opacity: 0; transform: translateY(16px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

export default function AdminCreate() {
  const navigate = useNavigate();
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
    <main className="min-h-screen bg-white text-black flex flex-col">
      <style>{FADE_KEYFRAMES}</style>
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-2xl w-full">
          <div
            style={{
              opacity: 0,
              animation: "frontDoorReveal 700ms ease-out 0ms forwards",
            }}
          >
            <div className="kicker-row">
              <span className="kicker-tick kicker-tick--lg" aria-hidden="true" />
              <span className="kicker-label">Team Primitives</span>
            </div>
            <h1 className="font-bold leading-[1] mb-8 display-xl">
              You're at the <span style={{ color: C.red }}>front door</span>
            </h1>
          </div>
          <div
            style={{
              opacity: 0,
              animation: "frontDoorReveal 700ms ease-out 150ms forwards",
            }}
          >
            <hr className="border-0 h-px mb-10" style={{ background: C.lightGray }} />
            <p
              className="leading-relaxed mb-4 max-w-xl"
              style={{ color: C.darkGray, fontSize: "1.0625rem" }}
            >
              If you're the <strong>owner</strong>, use your bookmarked{" "}
              <code
                className="font-mono px-1.5 py-0.5 text-[0.95em]"
                style={{ background: C.surface }}
              >
                /owner#k=…
              </code>{" "}
              URL.
            </p>
            <p
              className="leading-relaxed mb-12 max-w-xl"
              style={{ color: C.darkGray, fontSize: "1.0625rem" }}
            >
              If you're a <strong>participant</strong>, you should have received
              a join link from your facilitator.
            </p>
          </div>
          <div
            style={{
              opacity: 0,
              animation: "frontDoorReveal 700ms ease-out 350ms forwards",
            }}
          >
            <Link
              to="/owner/restore"
              className="inline-flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] border touch-min"
              style={{
                borderColor: C.charcoal,
                color: C.charcoal,
                background: "transparent",
                transition:
                  "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.black;
                e.currentTarget.style.color = C.white;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = C.charcoal;
              }}
            >
              Restore owner access from backup
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
