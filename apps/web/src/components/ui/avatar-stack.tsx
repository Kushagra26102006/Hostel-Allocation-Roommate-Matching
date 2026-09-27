"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarItem {
  name: string;
  avatarUrl?: string;
  fallback?: string;
}

export interface AvatarStackProps {
  avatars: AvatarItem[];
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AvatarStack({ avatars, max = 4, size = "md", className }: AvatarStackProps) {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  const sizeClasses = {
    sm: "h-7 w-7 text-[10px] ring-2",
    md: "h-9 w-9 text-xs ring-2",
    lg: "h-11 w-11 text-sm ring-3",
  };

  return (
    <div className={cn("flex items-center -space-x-2.5 overflow-hidden", className)}>
      {visible.map((av, idx) => (
        <div
          key={idx}
          title={av.name}
          className={cn(
            "relative inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 ring-background dark:bg-brand-900/60 dark:text-brand-300",
            sizeClasses[size],
          )}
        >
          {av.avatarUrl ? (
            <img
              src={av.avatarUrl}
              alt={av.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            av.fallback || av.name.slice(0, 2).toUpperCase()
          )}
        </div>
      ))}

      {remaining > 0 && (
        <div
          className={cn(
            "relative inline-flex shrink-0 items-center justify-center rounded-full bg-surface-muted font-bold text-muted-foreground ring-background",
            sizeClasses[size],
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
