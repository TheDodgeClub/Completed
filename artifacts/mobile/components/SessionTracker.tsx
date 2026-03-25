import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { recordSession } from "@/lib/api";

export function SessionTracker() {
  const { isAuthenticated } = useAuth();
  const sessionStart = useRef<Date | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!isAuthenticated) return;

    sessionStart.current = new Date();

    const handleChange = async (nextState: AppStateStatus) => {
      const prev = appState.current;
      appState.current = nextState;

      if ((prev === "active" || prev === "inactive") && nextState === "background") {
        if (sessionStart.current) {
          const duration = Math.round((Date.now() - sessionStart.current.getTime()) / 1000);
          const startedAt = sessionStart.current.toISOString();
          sessionStart.current = null;
          if (duration >= 5) {
            try { await recordSession(duration, startedAt); } catch { /* best-effort */ }
          }
        }
      }

      if (prev === "background" && nextState === "active") {
        sessionStart.current = new Date();
      }
    };

    const sub = AppState.addEventListener("change", handleChange);
    return () => {
      sub.remove();
      if (sessionStart.current) {
        const duration = Math.round((Date.now() - sessionStart.current.getTime()) / 1000);
        const startedAt = sessionStart.current.toISOString();
        sessionStart.current = null;
        if (duration >= 5) {
          recordSession(duration, startedAt).catch(() => {});
        }
      }
    };
  }, [isAuthenticated]);

  return null;
}
