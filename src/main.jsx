import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ToastProvider } from "./context/ToastContext";
import App from "./App";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  console.warn(
    "VITE_CONVEX_URL not set. Run `npx convex dev` to provision a deployment, then add VITE_CONVEX_URL to .env.local"
  );
}

const convex = new ConvexReactClient(convexUrl ?? "https://placeholder.convex.cloud");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </ConvexProvider>
  </StrictMode>
);
