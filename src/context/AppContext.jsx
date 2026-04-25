// Compat shim: the original AI Playbook had a unified AppContext that
// re-exported FlashProvider/useFlash. The inherited primitives components
// (CategorySection, IdeaCard, AddIdeaInput) import from "../../context/AppContext".
// Rather than rewriting their imports, we re-export the same names from here.
//
// Team Primitives doesn't use the rest of the original AppContext (AppProvider,
// useApp) — Convex subscriptions replace the global reducer.

/* eslint-disable react-refresh/only-export-components */
export { FlashProvider, useFlash } from "./FlashContext";
