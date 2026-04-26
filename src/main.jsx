import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ToastProvider } from "./context/ToastContext";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import App from "./App";
import "./index.css";

// Trim aggressively. Pasting a URL into a hosting provider's env-var UI is
// the most common source of stray leading/trailing whitespace, and the
// ConvexReactClient constructor (rightly) refuses URLs that don't start with
// http(s):// — a leading space crashes the whole app behind the error boundary.
const rawConvexUrl = import.meta.env.VITE_CONVEX_URL;
const convexUrl = typeof rawConvexUrl === "string" ? rawConvexUrl.trim() : "";
if (!convexUrl) {
  console.warn(
    "VITE_CONVEX_URL not set. Run `npx convex dev` to provision a deployment, then add VITE_CONVEX_URL to .env.local"
  );
}

const convex = new ConvexReactClient(convexUrl || "https://placeholder.convex.cloud");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <ConvexProvider client={convex}>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </ConvexProvider>
    </ErrorBoundary>
  </StrictMode>
);
