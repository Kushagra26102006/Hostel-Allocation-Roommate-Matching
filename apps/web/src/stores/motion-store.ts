/**
 * Motion preference store (Zustand, persisted to localStorage).
 * Complements the system `prefers-reduced-motion` media query with an
 * in-app toggle so users can override without touching OS settings.
 */

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";

interface MotionStore {
  /** User-set in-app preference. null = follow system default. */
  reduceMotion: boolean | null;
  setReduceMotion: (value: boolean | null) => void;
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useMotionStore = create<MotionStore>()(
  persist(
    (set) => ({
      reduceMotion: null,
      setReduceMotion: (value) => set({ reduceMotion: value }),
    }),
    {
      name: "hostelhub-motion-preference",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage
      ),
    },
  ),
);
