"use client";

import * as React from "react";
import { motion } from "framer-motion";

interface CompatibilityRingProps {
  score: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  animate?: boolean;
}

export function CompatibilityRing({
  score,
  size = 110,
  strokeWidth = 10,
  animate = true,
}: CompatibilityRingProps) {
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.min(100, Math.max(0, score));
  const offset = circumference - (circumference * normalizedScore) / 100;

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-800"
          fill="transparent"
        />
        {/* Animated Progress Ring */}
        {animate ? (
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
            strokeLinecap="round"
          />
        ) : (
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-emerald-500"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        )}
      </svg>
      {/* Center percentage readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-2xl font-black text-white tracking-tight leading-none">
          {normalizedScore}%
        </span>
        <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mt-0.5">
          Match
        </span>
      </div>
    </div>
  );
}
