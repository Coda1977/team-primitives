/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from "react";

const FlashContext = createContext({ flash: null, triggerFlash: () => {} });

export function FlashProvider({ children }) {
  const [flash, setFlash] = useState(null);
  const triggerFlash = useCallback((id) => {
    setFlash(id);
    setTimeout(() => setFlash(null), 1200);
  }, []);
  return (
    <FlashContext.Provider value={{ flash, triggerFlash }}>
      {children}
    </FlashContext.Provider>
  );
}

export function useFlash() {
  return useContext(FlashContext);
}
