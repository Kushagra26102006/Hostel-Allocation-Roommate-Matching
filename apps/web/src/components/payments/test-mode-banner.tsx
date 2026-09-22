"use client";

import React from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

interface TestModeBannerProps {
  className?: string;
  compact?: boolean;
}

export function TestModeBanner({ className = "", compact = false }: TestModeBannerProps) {
  if (compact) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-500 dark:text-amber-400 ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <span>TEST MODE — NO REAL MONEY</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`relative overflow-hidden rounded-xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/15 p-4 shadow-sm backdrop-blur-sm ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase px-2 py-0.5 rounded bg-amber-500 text-black font-mono">
                TEST MODE
              </span>
              <span className="font-bold text-sm text-foreground">
                Razorpay Sandbox Environment
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Nothing here handles real money. All orders, payments, and refunds are simulated using
              integer amounts in paise.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 self-stretch sm:self-auto justify-center">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>AES-256-GCM & HMAC-SHA256 Sandbox</span>
        </div>
      </div>
    </div>
  );
}
