"use client";

import * as React from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface CompatibilityRingProps {
  score?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function CompatibilityRing({
  score = 94,
  size = 110,
  strokeWidth = 9,
  className,
}: CompatibilityRingProps) {
  const center = size / 2;
  const radius = center - strokeWidth - 2;
  const circumference = 2 * Math.PI * radius;

  // Spring animation for smooth count from 0 to score
  const springValue = useSpring(0, {
    stiffness: 45,
    damping: 16,
    restDelta: 0.001,
  });

  const displayScore = useTransform(springValue, (latest) => Math.round(latest));
  const strokeDashoffset = useTransform(springValue, (latest) => {
    const progress = latest / 100;
    return circumference - progress * circumference;
  });

  const [currentDisplay, setCurrentDisplay] = React.useState(0);

  React.useEffect(() => {
    springValue.set(score);
    const unsubscribe = displayScore.on("change", (v) => {
      setCurrentDisplay(v);
    });
    return () => unsubscribe();
  }, [score, springValue, displayScore]);

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="rotate-[-90deg]">
        <defs>
          <linearGradient id="compatGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <filter id="compatGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#6366F1" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border/50"
        />

        {/* Animated Progress circle */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="url(#compatGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
          filter="url(#compatGlow)"
        />
      </svg>

      {/* Centered Percentage Score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-heading text-2xl font-black tracking-tight text-text leading-none">
          {currentDisplay}%
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted mt-1 leading-none">
          Match
        </span>
      </div>
    </div>
  );
}
