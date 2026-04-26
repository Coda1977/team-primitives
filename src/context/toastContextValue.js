import { createContext } from "react";

// Plain context object. Lives in its own file so the provider component file
// (`ToastContext.jsx`) only exports components — required for Vite fast-refresh.
export const ToastContext = createContext(null);
