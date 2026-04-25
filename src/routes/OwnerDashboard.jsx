// Route: /owner#k=:ownerKey
// Persona: tool owner (Yonatan) viewing all sessions
// Phase G wires this to convex/ownerQueries.ts (listAllSessions, deleteSession, exports).
//
// Key lives in URL fragment, NOT query string. Parse via window.location.hash on mount.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [ownerKey, setOwnerKey] = useState(null);

  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/k=([^&]+)/);
    if (!match) {
      navigate("/", { replace: true });
      return;
    }
    setOwnerKey(match[1]);
    // Strip the key from the URL bar so screenshots don't expose it
    window.history.replaceState(null, "", window.location.pathname);
  }, [navigate]);

  if (!ownerKey) return null;

  return (
    <main className="min-h-screen bg-white text-black p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Owner dashboard</h1>
        <p className="text-sm text-neutral-500 italic">
          [stub] Cross-session table + Export all + per-row Open/Download/Delete actions go here in Phase G.
        </p>
      </div>
    </main>
  );
}
