import { useState, useCallback } from "react";
import Toast from "../components/shared/Toast";
import { ToastContext } from "./toastContextValue";

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => {
    setToast(message);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="toast-container">
          <Toast message={toast} onClose={hideToast} />
        </div>
      )}
    </ToastContext.Provider>
  );
}
