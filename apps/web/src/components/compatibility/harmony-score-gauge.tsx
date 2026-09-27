"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

interface HarmonyScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export function HarmonyScoreGauge({ score, size = 140, strokeWidth = 12 }: HarmonyScoreGaugeProps) {
  const shouldReduceMotion = useReducedMotion();
  const [displayScore, setDisplayScore] = React.useState(shouldReduceMotion ? score : 0);

  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.min(100, Math.max(0, score));
  const targetOffset = circumference - (circumference * normalizedScore) / 100;

  // Animated Count-up Effect
  React.useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayScore(normalizedScore);
      return;
    }

    let start = 0;
    const duration = 1200; // ms
    const startTime = performance.now();

    const animateNumber = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.round(start + (normalizedScore - start) * ease);
      setDisplayScore(currentVal);

      if (progress < 1) {
        requestAnimationFrame(animateNumber);
      } else {
        setDisplayScore(normalizedScore);
      }
    };

    const handle = requestAnimationFrame(animateNumber);
    return () => cancelAnimationFrame(handle);
  }, [normalizedScore, shouldReduceMotion]);

  return (
    <div
      className="relative flex flex-col items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="harmonyRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00B8FF" />
            <stop offset="50%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <filter id="harmonyGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(30, 41, 59, 0.6)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Animated Progress Ring */}
        {shouldReduceMotion ? (
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#harmonyRingGrad)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={targetOffset}
            strokeLinecap="round"
            filter="url(#harmonyGlow)"
          />
        ) : (
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#harmonyRingGrad)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: targetOffset }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            strokeLinecap="round"
            filter="url(#harmonyGlow)"
          />
        )}
      </svg>

      {/* Center Readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="font-heading text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-emerald-200 tracking-tight leading-none drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
          {displayScore}%
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mt-1">
          Harmony Score
        </span>
      </div>
    </div>
  );
}
