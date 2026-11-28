"use client";
import { useEffect } from "react";
import { refreshSessionAction } from "@/features/auth/actions";

const STORAGE_KEY = "tuition_last_session_refresh";
const MIN_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export function SessionKeepAlive() {
  useEffect(() => {
    // 1. Register Service Worker for PWA if supported
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Listen for updates
          reg.addEventListener("updatefound", () => {
            const installing = reg.installing;
            if (installing) {
              installing.addEventListener("statechange", () => {
                if (installing.state === "installed" && navigator.serviceWorker.controller) {
                  // New content is available; will be used on next reload
                  console.info("[PWA] New update available.");
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn("[PWA] Service worker registration error:", err);
        });
    }

    // 2. Sliding session token refresh (maintains persistent login in installed PWA)
    async function maybeRefresh() {
      try {
        const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
        const now = Date.now();
        if (now - last < MIN_REFRESH_INTERVAL_MS) return;

        const res = await refreshSessionAction();
        if (res.ok) {
          localStorage.setItem(STORAGE_KEY, String(now));
        }
      } catch {
        // Silently ignore network failures (e.g. offline)
      }
    }

    // Check on mount
    maybeRefresh();

    // Check when user resumes the app or tab becomes visible
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        maybeRefresh();
      }
    }

    window.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onVisibilityChange);

    // Periodic check every 12 hours while open
    const interval = setInterval(maybeRefresh, 12 * 60 * 60 * 1000);

    return () => {
      window.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  return null;
}
