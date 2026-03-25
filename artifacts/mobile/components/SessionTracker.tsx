import { useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { recordSession } from "@/lib/api";

const FLUSH_INTERVAL_MS = 5 * 60 * 1000; // flush every 5 minutes
const MIN_DURATION_S = 5;

async function flush(startRef: React.MutableRefObject<Date | null>, resetStart = true) {
  const start = startRef.current;
  if (!start) return;
  const duration = Math.round((Date.now() - start.getTime()) / 1000);
  const startedAt = start.toISOString();
  if (resetStart) startRef.current = new Date();
  if (duration >= MIN_DURATION_S) {
    try { await recordSession(duration, startedAt); } catch { /* best-effort */ }
  }
}

export function SessionTracker() {
  const { isAuthenticated } = useAuth();
  const sessionStart = useRef<Date | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!isAuthenticated) return;

    sessionStart.current = new Date();

    // --- Native: AppState background/active transitions ---
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const prev = appState.current;
      appState.current = nextState;

      if ((prev === "active" || prev === "inactive") && nextState === "background") {
        flush(sessionStart, false).then(() => { sessionStart.current = null; });
      } else if (prev === "background" && nextState === "active") {
        sessionStart.current = new Date();
      }
    };

    // --- Web: document visibilitychange ---
    const handleVisibilityChange = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "hidden") {
        flush(sessionStart, false).then(() => { sessionStart.current = null; });
      } else if (document.visibilityState === "visible") {
        sessionStart.current = new Date();
      }
    };

    // --- Periodic flush for long foreground sessions ---
    const flushInterval = setInterval(() => flush(sessionStart, true), FLUSH_INTERVAL_MS);

    const sub = AppState.addEventListener("change", handleAppStateChange);

    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      sub.remove();
      clearInterval(flushInterval);
      if (Platform.OS === "web" && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      flush(sessionStart, false);
    };
  }, [isAuthenticated]);

  return null;
}
