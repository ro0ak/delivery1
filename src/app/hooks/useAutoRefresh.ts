import { useEffect } from "react";

export function useAutoRefresh(
  callback: () => Promise<void> | void,
  intervalMs: number,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void callback();
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void callback();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [callback, enabled, intervalMs]);
}
