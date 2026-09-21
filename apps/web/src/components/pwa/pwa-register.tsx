"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Register service worker after window load to not block initial page rendering
      const registerSw = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });

          // Check for updates periodically
          registration.addEventListener("updatefound", () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener("statechange", () => {
                if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // New update available
                }
              });
            }
          });
        } catch (err) {
          console.error("Service worker registration failed:", err);
        }
      };

      if (document.readyState === "complete") {
        void registerSw();
        return undefined;
      } else {
        window.addEventListener("load", registerSw);
        return () => window.removeEventListener("load", registerSw);
      }
    }
    return undefined;
  }, []);

  return null;
}
