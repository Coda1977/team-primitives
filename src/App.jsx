import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

// Eager: the common entry points participants/admins hit first. Keeping these
// in the initial bundle avoids a Suspense flash on the most-trafficked routes.
import AdminCreate from "./routes/AdminCreate";
import Join from "./routes/Join";
import Participant from "./routes/Participant";
import NotFound from "./routes/NotFound";

// Lazy: rare or admin-only routes. A participant joining a workshop never
// downloads OwnerDashboard / AdminBoard / PresentView / OwnerRestore code.
const AdminBoard = lazy(() => import("./routes/AdminBoard"));
const OwnerDashboard = lazy(() => import("./routes/OwnerDashboard"));
const OwnerRestore = lazy(() => import("./routes/OwnerRestore"));
const PresentView = lazy(() => import("./routes/PresentView"));

function RouteFallback() {
  return (
    <main className="min-h-screen bg-white text-black px-6 py-12 flex items-center justify-center">
      <p className="text-sm text-neutral-500">Loading…</p>
    </main>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<AdminCreate />} />
        <Route path="/s/:code/admin" element={<AdminBoard />} />
        <Route path="/s/:code/join" element={<Join />} />
        <Route path="/s/:code/p/:slug" element={<Participant />} />
        <Route path="/s/:code/present" element={<PresentView />} />
        <Route path="/owner" element={<OwnerDashboard />} />
        <Route path="/owner/restore" element={<OwnerRestore />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
