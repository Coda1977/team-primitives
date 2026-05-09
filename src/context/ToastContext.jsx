import { useState, useCallback } from "react";
import Toast from "../components/shared/Toast";
import { ToastContext } from "./toastContextValue";

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  // showToast accepts either a string (defaults to info) or
  // { message, variant: "info" | "success" | "error" }.
  const showToast = useCallback((messageOrOpts) => {
    if (typeof messageOrOpts === "string") {
      setToast({ message: messageOrOpts, variant: "info" });
    } else if (messageOrOpts && typeof messageOrOpts === "object") {
      setToast({
        message: messageOrOpts.message ?? "",
        variant: messageOrOpts.variant ?? "info",
      });
    }
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
}
