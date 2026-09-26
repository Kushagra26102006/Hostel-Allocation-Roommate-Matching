"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  href?: string;
}

export function HostelHubLogo({
  className,
  showText = true,
  size = "md",
  href = "/dashboard",
}: LogoProps) {
  const iconSizes = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-11 w-11",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  };

  const content = (
    <div className={cn("group inline-flex items-center gap-2.5 select-none", className)}>
      {/* Modern H-shaped geometric smart-building symbol */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-brand-600 to-cyan-500 p-0.5 shadow-md shadow-indigo-500/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-indigo-500/40 group-hover:shadow-lg",
          iconSizes[size],
        )}
      >
        <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950/20 backdrop-blur-xs">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5 text-white transition-transform duration-300 group-hover:rotate-1"
          >
            {/* Left Tower */}
            <rect
              x="3.5"
              y="4"
              width="5"
              height="16"
              rx="1.75"
              fill="currentColor"
              fillOpacity="0.95"
            />
            {/* Right Tower */}
            <rect
              x="15.5"
              y="4"
              width="5"
              height="16"
              rx="1.75"
              fill="currentColor"
              fillOpacity="0.95"
            />
            {/* Central Skybridge / H Crossbar with glowing aperture */}
            <rect
              x="7"
              y="10.5"
              width="10"
              height="3.5"
              rx="1.25"
              fill="currentColor"
              fillOpacity="0.9"
            />
            {/* Smart Beacon / Window Dot */}
            <circle cx="12" cy="6" r="1.5" fill="#38BDF8" />
          </svg>
        </div>
        {/* Subtle Ambient Pulse Dot */}
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
        </span>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span
            className={cn(
              "font-heading font-extrabold tracking-tight text-text leading-none",
              textSizes[size],
            )}
          >
            Hostel
            <span className="bg-gradient-to-r from-indigo-500 via-brand-500 to-cyan-500 bg-clip-text text-transparent">
              Hub
            </span>
          </span>
          <span className="text-[9px] font-semibold tracking-wider uppercase text-muted leading-tight mt-0.5">
            Smart Campus Housing
          </span>
        </div>
      )}
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label="HostelHub Dashboard" className="focus-visible:outline-none">
      {content}
    </Link>
  );
}
