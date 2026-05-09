// Live online/offline state from the browser.
// Replaces hard-coded green dots in participant + admin headers.
// Returns true when navigator.onLine is true. Subscribes to the
// `online`/`offline` window events so the indicator flips in real time.

import { useEffect, useState } from "react";

export function useOnlineStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
    };
  }, []);

  return online;
}
