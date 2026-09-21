"use client";

import React from "react";
import { Footprints } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoutePreviewBadgeProps {
  walkingMinutes: number;
  distanceMeters?: number;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Inline walking-distance badge for hostel preference cards.
 * Shows walking time with a footprint icon and color-coded urgency.
 */
export function RoutePreviewBadge({
  walkingMinutes,
  distanceMeters,
  className,
  size = "sm",
}: RoutePreviewBadgeProps) {
  // Color code: green ≤ 8 min, amber ≤ 15 min, red > 15 min
  const colorClass =
    walkingMinutes <= 8
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-700/50"
      : walkingMinutes <= 15
        ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-700/50"
        : "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-700/50";

  const isSmall = size === "sm";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        isSmall ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        colorClass,
        className,
      )}
      title={
        distanceMeters
          ? `${walkingMinutes} min walk (${Math.round(distanceMeters)}m)`
          : `${walkingMinutes} min walk`
      }
      aria-label={`${walkingMinutes} minute walk`}
    >
      <Footprints className={isSmall ? "w-3 h-3" : "w-3.5 h-3.5"} />
      <span>{walkingMinutes} min</span>
    </div>
  );
}
