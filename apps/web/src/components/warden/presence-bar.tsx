"use client";

import { Users, Wifi, WifiOff } from "lucide-react";
import type { ReviewerPresence } from "@/lib/queue/draft-events";

interface PresenceBarProps {
  reviewers: ReviewerPresence[];
  isConnected: boolean;
  currentUserId?: string;
}

export function PresenceBar({ reviewers, isConnected, currentUserId }: PresenceBarProps) {
  // Deduplicate and filter out stale
  const uniqueReviewers = Array.from(new Map(reviewers.map((r) => [r.userId, r])).values());

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 backdrop-blur-md"
      role="region"
      aria-label="Active Reviewers Presence"
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-text">
        <Users className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        <span>Active Reviewers ({uniqueReviewers.length})</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {uniqueReviewers.map((r) => {
          const isMe = r.userId === currentUserId;
          return (
            <div
              key={r.userId}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                isMe
                  ? "border border-brand-500/40 bg-brand-50 text-brand-800 dark:bg-brand-950/40 dark:text-brand-300"
                  : "border border-border/80 bg-muted/20 text-muted-foreground"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-semibold text-text">{isMe ? "You" : r.name}</span>
              <span className="rounded bg-black/10 px-1 py-0.5 text-[10px] dark:bg-white/10">
                Floor {r.floor}
              </span>
            </div>
          );
        })}

        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            isConnected
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          }`}
          title={isConnected ? "Real-time sync active" : "Reconnecting to live sync..."}
        >
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3" />
              <span>Live Sync</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 animate-pulse" />
              <span>Connecting...</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
