"use client";

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";

export type Locale = "en" | "hi" | "pa";

interface LocaleStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale) => {
        if (typeof document !== "undefined") {
          document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
          // Apply locale font class to documentElement
          document.documentElement.lang = locale;
          if (locale === "hi") {
            document.documentElement.classList.add("font-devanagari");
            document.documentElement.classList.remove("font-gurmukhi");
          } else if (locale === "pa") {
            document.documentElement.classList.add("font-gurmukhi");
            document.documentElement.classList.remove("font-devanagari");
          } else {
            document.documentElement.classList.remove("font-devanagari", "font-gurmukhi");
          }
        }
        set({ locale });
      },
    }),
    {
      name: "hostelhub-locale",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
    },
  ),
);
