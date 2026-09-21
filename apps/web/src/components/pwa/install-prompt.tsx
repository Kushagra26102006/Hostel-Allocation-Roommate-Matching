"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Sparkles } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone PWA mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed within last 7 days
    const lastDismissed = localStorage.getItem("hostelhub_pwa_dismissed");
    if (lastDismissed) {
      const daysSince = (Date.now() - parseInt(lastDismissed, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === "accepted") {
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("hostelhub_pwa_dismissed", Date.now().toString());
  };

  if (!isVisible || isInstalled) return null;

  return (
    <aside
      aria-label="Install HostelHub application"
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border border-brand-500/30 bg-card/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md">
          <Smartphone className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Install HostelHub</span>
          </div>
          <p className="mt-0.5 text-xs text-muted leading-relaxed">
            Install the app for instant access, offline application drafts, and real-time allotment
            alerts.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              id="pwa-install-button"
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand-500 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install App</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:text-text hover:bg-muted/20 transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close install prompt"
          className="shrink-0 rounded-lg p-1 text-muted hover:text-text hover:bg-muted/20 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
