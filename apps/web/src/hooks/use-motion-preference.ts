"use client";

import { useEffect, useState } from "react";
import { useMotionStore } from "@/stores/motion-store";

/**
 * Returns whether reduced-motion is in effect.
 *
 * Priority:
 *  1. In-app user setting (Zustand, persisted) — explicit true/false
 *  2. OS `prefers-reduced-motion: reduce` media query
 *
 * Components should use this instead of reading the media query directly
 * so the in-app toggle takes effect immediately.
 */
export function useMotionPreference(): { prefersReducedMotion: boolean } {
  const inAppPreference = useMotionStore((s) => s.reduceMotion);

  // SSR-safe: default to false until we can read the media query on client
  const [systemPrefers, setSystemPrefers] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSystemPrefers(mq.matches);

    const handler = (e: MediaQueryListEvent) => setSystemPrefers(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const prefersReducedMotion =
    inAppPreference !== null ? (inAppPreference ?? false) : systemPrefers;

  return { prefersReducedMotion };
}
