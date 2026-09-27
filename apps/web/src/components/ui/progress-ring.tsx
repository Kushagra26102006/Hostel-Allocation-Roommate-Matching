"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressRingProps {
  value: number; // 0 to 100
  size?: number; // px
  strokeWidth?: number; // px
  color?: string; // CSS color or tailwind class
  trackColor?: string;
  label?: string | undefined;
  sublabel?: string | undefined;
  className?: string;
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  color = "stroke-brand-600 dark:stroke-brand-400",
  trackColor = "stroke-border/40",
  label,
  sublabel,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90 transform">
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeWidth={strokeWidth}
          className={cn("transition-all duration-300", trackColor)}
        />
        {/* Animated progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn("transition-all duration-1000 ease-out", color)}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-heading text-lg font-bold text-foreground sm:text-xl">
          {label ?? `${Math.round(progress)}%`}
        </span>
        {sublabel && (
          <span className="text-[10px] font-medium text-muted-foreground">{sublabel}</span>
        )}
      </div>
    </div>
  );
}
