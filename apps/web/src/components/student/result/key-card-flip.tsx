"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  Building,
  BedDouble,
  ShieldCheck,
  CheckCircle2,
  RotateCw,
  Wifi,
  Radio,
} from "lucide-react";
import { CompatibilityRing } from "./compatibility-ring";

interface KeyCardFlipProps {
  hostelName: string;
  blockName: string;
  floor?: number | string;
  roomNumber: string;
  bedNo: string;
  roomType: string;
  score: number;
  studentName?: string;
  cycleName?: string;
  onRevealed?: () => void;
}

export function KeyCardFlip({
  hostelName,
  blockName,
  floor,
  roomNumber,
  bedNo,
  roomType,
  score,
  studentName = "Student Resident",
  cycleName = "Autumn 2026",
  onRevealed,
}: KeyCardFlipProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isFlipped, setIsFlipped] = React.useState<boolean>(shouldReduceMotion ?? false);
  const [displayRoomNum, setDisplayRoomNum] = React.useState<string>(
    shouldReduceMotion ? roomNumber : "---",
  );

  const numericTarget = parseInt(roomNumber.replace(/\D/g, ""), 10) || 304;

  const triggerConfetti = React.useCallback(async () => {
    if (shouldReduceMotion) return;
    try {
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6, x: 0.35 },
        colors: ["#22d3ee", "#38bdf8", "#34d399", "#818cf8", "#fbbf24"],
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6, x: 0.65 },
          colors: ["#22d3ee", "#38bdf8", "#34d399", "#818cf8", "#fbbf24"],
        });
      }, 220);
    } catch {
      // Confetti non-fatal
    }
  }, [shouldReduceMotion]);

  const handleFlip = () => {
    if (isFlipped) return;
    setIsFlipped(true);

    if (shouldReduceMotion) {
      setDisplayRoomNum(roomNumber);
      onRevealed?.();
      return;
    }

    triggerConfetti();

    // Counting effect
    let current = Math.max(1, numericTarget - 24);
    const stepTime = Math.max(25, Math.floor(600 / (numericTarget - current + 1)));

    const timer = setInterval(() => {
      current += 2;
      if (current >= numericTarget) {
        setDisplayRoomNum(roomNumber);
        clearInterval(timer);
      } else {
        setDisplayRoomNum(String(current));
      }
    }, stepTime);

    onRevealed?.();
  };

  return (
    <div className="w-full max-w-md mx-auto select-none" style={{ perspective: "1400px" }}>
      <motion.div
        className="relative w-full aspect-[1/1.42] cursor-pointer group"
        style={{ transformStyle: "preserve-3d" }}
        animate={{
          rotateY: isFlipped ? 180 : 0,
          rotateZ: isFlipped ? 0 : [0, -1, 1, 0],
        }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.75,
          ease: [0.16, 1, 0.3, 1],
        }}
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? "Allocated room card" : "Tap to reveal your allocated room"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleFlip();
          }
        }}
      >
        {/* FRONT CARD: Digital Key-Card */}
        <div
          className="absolute inset-0 rounded-[30px] p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xl border border-cyan-500/30 bg-gradient-to-br from-[#0c162e] via-[#071026] to-[#020617] text-white"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            boxShadow:
              "0 0 50px rgba(6, 182, 212, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
          }}
        >
          {/* Subtle Ambient Light Spot */}
          <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl group-hover:bg-cyan-500/25 transition-colors duration-500" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl group-hover:bg-indigo-500/25 transition-colors duration-500" />

          {/* Light Sweep Shimmer */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-400/5 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

          {/* Card Top: Branding & Cycle */}
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 block font-mono">
                OFFICIAL KEY-CARD
              </span>
              <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                HostelHub Digital Access
              </h3>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/60 px-3 py-1 text-[11px] font-semibold text-cyan-300 backdrop-blur-md">
              <Radio className="h-3 w-3 text-cyan-400 animate-pulse" />
              <span>{cycleName}</span>
            </div>
          </div>

          {/* Center: Smart Chip + Resident Name + Tap to Reveal CTA */}
          <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center space-y-4">
            {/* Realistic Gold Contact Smart Chip */}
            <div className="relative flex items-center justify-center">
              <div className="h-14 w-18 rounded-xl bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-[1.5px] shadow-lg shadow-amber-500/20">
                <div className="h-full w-full rounded-[10px] bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-1 flex flex-col justify-between overflow-hidden">
                  <div className="flex justify-between items-center px-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-800/40" />
                    <span className="h-0.5 w-6 bg-amber-900/30" />
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-800/40" />
                  </div>
                  <div className="grid grid-cols-3 gap-0.5 px-0.5 py-1">
                    <div className="h-4 border-r border-amber-900/30 bg-amber-300/30 rounded-xs" />
                    <div className="h-4 border-r border-amber-900/30 bg-amber-300/20" />
                    <div className="h-4 bg-amber-300/30 rounded-xs" />
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="h-0.5 w-4 bg-amber-900/30" />
                    <span className="h-0.5 w-4 bg-amber-900/30" />
                  </div>
                </div>
              </div>

              {/* NFC Contactless waves icon */}
              <Wifi className="absolute -right-7 h-5 w-5 text-cyan-400 rotate-90 opacity-75" />
            </div>

            {/* Resident Status */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Allotment Decision Finalized
              </p>
              <h4 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-slate-200 mt-0.5">
                {studentName}
              </h4>
            </div>

            {/* Tap to Reveal Glowing CTA Button */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-xl shadow-cyan-500/25 transition-all duration-300 group-hover:shadow-cyan-400/40"
            >
              <Sparkles className="h-4 w-4 text-slate-950" />
              <span>✦ Tap to Reveal Your Room</span>
            </motion.div>
          </div>

          {/* Card Footer: NFC / RFID + Card Number */}
          <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              NFC • RFID PASS
            </span>
            <span className="tracking-widest text-slate-400">•••• •••• •••• 2026</span>
          </div>
        </div>

        {/* BACK CARD: Revealed Room Allotment */}
        <div
          className="absolute inset-0 rounded-[30px] p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xl border-2 border-cyan-500/50 bg-gradient-to-br from-[#0c162e] via-[#071330] to-[#030b1c] text-white"
          style={{
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            boxShadow: "0 0 60px rgba(6, 182, 212, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)",
          }}
        >
          {/* Ambient Cyan/Emerald Glow Spot */}
          <div className="pointer-events-none absolute top-0 right-0 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />

          {/* Top Badges */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-400 shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Allocated Room
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Confirmed
            </span>
          </div>

          {/* Center Room Details: Big Glowing Number */}
          <div className="relative z-10 my-auto space-y-3.5 text-center">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                <Building className="h-4 w-4" />
                {hostelName}
              </span>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {blockName}
                {floor !== undefined && floor !== null && floor !== 0
                  ? ` • ${floor}${floor === 1 ? "st" : floor === 2 ? "nd" : floor === 3 ? "rd" : "th"} Floor`
                  : ""}
              </p>
            </div>

            {/* Giant Glowing Room Number */}
            <div className="py-1">
              <div className="font-heading text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-slate-200 tracking-tighter drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]">
                {displayRoomNum}
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-cyan-500/40 px-3.5 py-1 text-xs font-bold text-cyan-300 shadow-md">
                <BedDouble className="h-3.5 w-3.5 text-cyan-400" />
                <span>{bedNo}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300 font-medium">{roomType}</span>
              </div>
            </div>

            {/* Circular Compatibility Indicator */}
            <div className="flex justify-center pt-1">
              <CompatibilityRing
                score={score}
                size={88}
                strokeWidth={8}
                animate={!shouldReduceMotion}
              />
            </div>
          </div>

          {/* Back Card Footer: Move-in Date + Flip Back hint */}
          <div className="relative z-10 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Move-in: Sept 25, 2026</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                setIsFlipped(false);
              }}
              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors p-1"
            >
              <RotateCw className="h-3 w-3" /> Flip Back
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
