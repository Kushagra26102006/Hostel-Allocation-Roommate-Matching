"use client";

import React from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";

interface OfflineSyncBannerProps {
  isOnline: boolean;
  syncStatus: "synced" | "pending_sync" | "syncing" | "conflict";
  lastSavedText?: string | undefined;
  onManualSync?: () => void;
}

export function OfflineSyncBanner({
  isOnline,
  syncStatus,
  lastSavedText,
  onManualSync,
}: OfflineSyncBannerProps) {
  // If online and fully synced, do not show any distracting banner
  if (isOnline && syncStatus === "synced") {
    return null;
  }

  const isOffline = !isOnline;
  const isSyncing = syncStatus === "syncing";
  const hasConflict = syncStatus === "conflict";

  return (
    <div
      role="status"
      aria-live="polite"
      id="offline-sync-banner"
      className={`mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border p-4 text-xs shadow-md transition-all duration-300 ${
        isOffline
          ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
          : isSyncing
            ? "border-brand-500/40 bg-brand-500/10 text-brand-900 dark:text-brand-200"
            : hasConflict
              ? "border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-200"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
            isOffline
              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
              : isSyncing
                ? "bg-brand-500/20 text-brand-700 dark:text-brand-300"
                : hasConflict
                  ? "bg-red-500/20 text-red-700 dark:text-red-300"
                  : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {isOffline ? (
            <WifiOff className="h-4 w-4 animate-pulse" />
          ) : isSyncing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : hasConflict ? (
            <WifiOff className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
        </div>

        <div>
          <span className="font-bold block text-sm">
            {isOffline
              ? "Offline — your changes will sync"
              : isSyncing
                ? "Connection restored — syncing your changes..."
                : hasConflict
                  ? "Version conflict detected"
                  : "Changes synced with server"}
          </span>
          <span className="text-[11px] opacity-80 block">
            {isOffline
              ? "All your application edits are saved locally in IndexedDB and will automatically submit when online."
              : isSyncing
                ? "Communicating with campus server to update your application draft..."
                : hasConflict
                  ? "A newer version exists on the server. Please review and choose which version to keep."
                  : lastSavedText || "Your application draft is fully up to date."}
          </span>
        </div>
      </div>

      {isOnline && syncStatus === "pending_sync" && onManualSync && (
        <button
          type="button"
          onClick={onManualSync}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 font-bold text-white shadow-sm hover:bg-brand-500 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Sync Now</span>
        </button>
      )}
    </div>
  );
}
