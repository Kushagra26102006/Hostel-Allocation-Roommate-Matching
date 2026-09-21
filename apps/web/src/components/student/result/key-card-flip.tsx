"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Building, BedDouble, ShieldCheck, CheckCircle2, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CompatibilityRing } from "./compatibility-ring";

interface KeyCardFlipProps {
  hostelName: string;
  blockName: string;
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
  roomNumber,
  bedNo,
  roomType,
  score,
  studentName = "Student Resident",
  cycleName = "Autumn 2026 Housing Cycle",
  onRevealed,
}: KeyCardFlipProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isFlipped, setIsFlipped] = React.useState<boolean>(shouldReduceMotion ?? false);
  const [displayRoomNum, setDisplayRoomNum] = React.useState<string>(
    shouldReduceMotion ? roomNumber : "---",
  );

  const numericTarget = parseInt(roomNumber.replace(/\D/g, ""), 10) || 101;

  const triggerConfetti = React.useCallback(async () => {
    if (shouldReduceMotion) return;
    try {
      const confetti = (await import("canvas-confetti")).default;
      // Dual cannon burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6, x: 0.3 },
        colors: ["#38bdf8", "#34d399", "#818cf8", "#f43f5e", "#fbbf24"],
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6, x: 0.7 },
          colors: ["#38bdf8", "#34d399", "#818cf8", "#f43f5e", "#fbbf24"],
        });
      }, 200);
    } catch {
      // Confetti optional
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

    // Trigger confetti burst
    triggerConfetti();

    // Animated room number count-up
    let current = Math.max(1, numericTarget - 30);
    const stepTime = Math.max(20, Math.floor(800 / (numericTarget - current + 1)));

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
    <div className="w-full max-w-sm mx-auto select-none" style={{ perspective: "1200px" }}>
      <motion.div
        className="relative w-full aspect-[1/1.4] cursor-pointer"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.8,
          ease: [0.34, 1.56, 0.64, 1], // bouncy spring
        }}
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? "Allocated room card" : "Click to reveal your allocated room"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleFlip();
          }
        }}
      >
        {/* FRONT CARD (Holographic University Key-Card Pass) */}
        <div
          className="absolute inset-0 rounded-3xl p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xl border border-sky-500/30 bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-950"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {/* Holographic shimmer effect */}
          <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-sky-400/10 to-transparent rotate-45 pointer-events-none animate-[pulse_4s_ease-in-out_infinite]" />

          {/* Header */}
          <div className="relative z-10 flex items-start justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">
                Official Key-Card
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                HostelHub Digital Access
              </h3>
            </div>
            <Badge
              variant="outline"
              className="bg-sky-500/10 border-sky-400/30 text-sky-300 text-[10px]"
            >
              {cycleName.slice(0, 11)}
            </Badge>
          </div>

          {/* Center chip & emblem */}
          <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-12 rounded-xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border border-amber-200/50 shadow-md shadow-amber-500/20 flex items-center justify-center">
              <div className="w-10 h-8 border border-amber-900/30 rounded grid grid-cols-2 gap-1 p-0.5 opacity-60">
                <div className="bg-amber-700/20 rounded-sm" />
                <div className="bg-amber-700/20 rounded-sm" />
                <div className="bg-amber-700/20 rounded-sm" />
                <div className="bg-amber-700/20 rounded-sm" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-300 font-medium">Allotment Decision Finalized</p>
              <h4 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-white to-sky-200">
                {studentName}
              </h4>
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-semibold shadow-lg shadow-sky-500/10 group-hover:scale-105 transition-transform animate-bounce">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              Tap to Reveal Your Room
            </div>
          </div>

          {/* Footer barcode/watermark */}
          <div className="relative z-10 pt-4 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>NFC · RFID PASS</span>
            <span>•••• •••• •••• 2026</span>
          </div>
        </div>

        {/* BACK CARD (Revealed Room Allocation Pass) */}
        <div
          className="absolute inset-0 rounded-3xl p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40"
          style={{
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {/* Ambient emerald glow */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Top Status */}
          <div className="flex items-center justify-between z-10">
            <Badge className="bg-emerald-500 text-slate-950 font-bold text-xs gap-1 shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Allocated Room
            </Badge>
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Confirmed
            </span>
          </div>

          {/* Center Details: Hostel, Room & Compatibility */}
          <div className="my-auto z-10 space-y-4 text-center">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-center gap-1">
                <Building className="w-3.5 h-3.5" />
                {hostelName}
              </span>
              <p className="text-xs text-slate-400 font-medium">{blockName}</p>
            </div>

            {/* Glowing Big Room Number */}
            <div className="py-2">
              <div className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300 drop-shadow-[0_0_20px_rgba(255,255,255,0.25)] tracking-tighter">
                {displayRoomNum}
              </div>
              <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-bold text-slate-200">
                <BedDouble className="w-3.5 h-3.5 text-emerald-400" />
                {bedNo} · {roomType}
              </div>
            </div>

            {/* Compatibility Ring Indicator */}
            <div className="flex justify-center pt-1">
              <CompatibilityRing
                score={score}
                size={86}
                strokeWidth={8}
                animate={!shouldReduceMotion}
              />
            </div>
          </div>

          {/* Flip back button hint */}
          <div className="z-10 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Move-in: Sept 25, 2026</span>
            <span className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300">
              <RotateCw className="w-3 h-3" /> Flip
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
