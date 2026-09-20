"use client";

import * as React from "react";
import { Globe, Check } from "lucide-react";
import { useLocaleStore, type Locale } from "@/stores/locale-store";
import { useMessages } from "@/lib/i18n";

export function LanguageSwitcher() {
  const [open, setOpen] = React.useState(false);
  const { locale, setLocale } = useLocaleStore();
  const messages = useMessages();

  const languages: { id: Locale; label: string; native: string }[] = [
    { id: "en", label: messages.common.langEn, native: "English" },
    { id: "hi", label: messages.common.langHi, native: "हिन्दी" },
    { id: "pa", label: messages.common.langPa, native: "ਪੰਜਾਬੀ" },
  ];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={messages.navbar.language.select}
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-ctrl border border-border/70 bg-surface/60 px-2.5 text-xs font-medium text-muted transition-colors hover:border-border hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Globe className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
        <span className="font-bold uppercase tracking-wider">{locale}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={messages.navbar.language.select}
          className="absolute right-0 top-full mt-2 w-44 rounded-card border border-border bg-surface p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95"
        >
          {languages.map((lang) => {
            const isSelected = lang.id === locale;
            return (
              <button
                key={lang.id}
                type="button"
                onClick={() => {
                  setLocale(lang.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                  isSelected
                    ? "bg-brand-50 text-brand-700 font-bold dark:bg-brand-900/40 dark:text-brand-300"
                    : "text-text hover:bg-surface/80"
                }`}
              >
                <span>{lang.native}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-brand-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
