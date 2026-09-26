"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Check,
  Sliders,
  Cpu,
  ArrowRight,
  BrainCircuit,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DimensionItem {
  name: string;
  shortName: string;
  score: number;
  color: string;
}

const BREAKDOWN_ITEMS: DimensionItem[] = [
  { name: "Sleep Schedule", shortName: "Sleep", score: 98, color: "from-cyan-400 to-sky-400" },
  {
    name: "Study Quietness",
    shortName: "Study",
    score: 95,
    color: "from-indigo-400 to-violet-400",
  },
  {
    name: "Room Cleanliness",
    shortName: "Cleanliness",
    score: 92,
    color: "from-emerald-400 to-teal-400",
  },
  { name: "Noise & Audio", shortName: "Noise", score: 96, color: "from-sky-400 to-blue-400" },
  { name: "AC Temperature", shortName: "AC", score: 90, color: "from-amber-400 to-orange-400" },
  {
    name: "Substance Policy",
    shortName: "Policy",
    score: 100,
    color: "from-emerald-400 to-teal-400",
  },
];

export function MatchBreakdownCard() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="rounded-3xl border border-[rgba(80,120,170,0.25)] bg-[rgba(8,17,36,0.85)] p-6 sm:p-7 backdrop-blur-xl shadow-xl shadow-black/40 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-white">Compatibility Breakdown</h3>
            <p className="text-xs text-slate-400 font-medium">
              Dimension alignment across 6 vectors
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 text-xs font-bold text-cyan-300 font-mono">
          94.8% Mean
        </span>
      </div>

      {/* Horizontal Vector Comparison Bars */}
      <div className="space-y-3 pt-1">
        {BREAKDOWN_ITEMS.map((item, idx) => (
          <div key={item.shortName} className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-medium">{item.name}</span>
              <span className="font-bold text-white">{item.score}%</span>
            </div>

            <div className="relative h-2 w-full rounded-full bg-slate-900/90 border border-slate-800/80 overflow-hidden">
              {shouldReduceMotion ? (
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r", item.color)}
                  style={{ width: `${item.score}%` }}
                />
              ) : (
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${item.score}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: idx * 0.05 }}
                  className={cn("h-full rounded-full bg-gradient-to-r", item.color)}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExplainableMatchCard() {
  return (
    <div className="rounded-3xl border border-[rgba(80,120,170,0.25)] bg-[rgba(8,17,36,0.85)] p-6 sm:p-7 backdrop-blur-xl shadow-xl shadow-black/40 space-y-4 hover:border-indigo-500/40 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-sm">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-white">Why this roommate?</h3>
            <p className="text-xs text-slate-400 font-medium">
              Explainable algorithmic pairing report
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-950/60 border border-indigo-500/30 px-3 py-1 text-xs font-bold text-indigo-300 font-mono">
          <Sparkles className="h-3 w-3 text-indigo-400" />
          AI Match
        </span>
      </div>

      <div className="p-4 rounded-2xl bg-[#050b1d]/90 border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider text-emerald-400 font-mono">
            HIGH COMPATIBILITY
          </span>
          <span className="text-xs text-slate-300 font-medium">
            Bipartite Matching Engine (v2.4)
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
          This allocation was generated by our stable roommate matching engine by balancing
          lifestyle habits with verified deal-breakers. Both students indicated mutually compatible
          study schedules and low room noise tolerances.
        </p>

        {/* 4 Factor Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-slate-300 font-medium">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0 stroke-[3]" />
            <span>Quiet study habits</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0 stroke-[3]" />
            <span>Aligned sleep schedule</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 stroke-[3]" />
            <span>Similar room cleanliness</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <Check className="h-3.5 w-3.5 text-amber-400 shrink-0 stroke-[3]" />
            <span>Compatible temperature</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrivacySecurityCard() {
  return (
    <div className="rounded-3xl border border-[rgba(80,120,170,0.25)] bg-[rgba(8,17,36,0.85)] p-6 sm:p-7 backdrop-blur-xl shadow-xl shadow-black/40 space-y-4 hover:border-cyan-500/40 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-white">Privacy Protected</h3>
            <p className="text-xs text-slate-400 font-medium">
              Differential privacy &amp; zero disclosure
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 text-xs font-bold text-cyan-300 font-mono">
          <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
          Encrypted
        </span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        Mutual preferences are evaluated mathematically inside secure enclaves without exposing
        sensitive questionnaire information to other students or staff unnecessarily.
      </p>

      <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs font-medium">
        <div className="p-3 rounded-2xl bg-[#050b1d]/80 border border-slate-800 flex items-center gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
            <Lock className="h-3.5 w-3.5" />
          </div>
          <span className="text-slate-200">Privacy Protected</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#050b1d]/80 border border-slate-800 flex items-center gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
          <span className="text-slate-200">Mutual Consent</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#050b1d]/80 border border-slate-800 flex items-center gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <span className="text-slate-200">Deal-breaker Check</span>
        </div>

        <div className="p-3 rounded-2xl bg-[#050b1d]/80 border border-slate-800 flex items-center gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
            <Cpu className="h-3.5 w-3.5" />
          </div>
          <span className="text-slate-200">Secure Matching</span>
        </div>
      </div>
    </div>
  );
}

export function DealBreakerGuaranteeCard() {
  const steps = [
    { label: "Preference Check", icon: Sliders },
    { label: "Compatibility Engine", icon: Cpu },
    { label: "Conflict Scan", icon: ShieldCheck },
    { label: "Verified Match", icon: CheckCircle2, isFinal: true },
  ];

  return (
    <div className="rounded-3xl border border-emerald-500/35 bg-gradient-to-br from-[rgba(8,24,36,0.9)] via-[rgba(6,18,32,0.85)] to-[#020617] p-6 sm:p-7 backdrop-blur-xl shadow-xl shadow-black/40 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 shadow-md shadow-emerald-500/10">
            <ShieldCheck className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading text-lg font-bold text-white">
                Mutual Deal-Breaker Guarantee
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 font-mono">
                <Check className="h-3 w-3 stroke-[3]" /> VERIFIED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Both residents&apos; critical preferences were cross-verified by the allocation engine
              before placement.
            </p>
          </div>
        </div>
      </div>

      {/* Security Verification Pipeline Visualization */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#030919]/90 border border-slate-800/80">
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-4 flex items-center justify-between">
          <span>PIPELINE VERIFICATION TRACE</span>
          <span className="text-emerald-400">PASSED • ZERO CONFLICTS DETECTED</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-2 relative items-center">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.label}>
                <div
                  className={cn(
                    "flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 p-3 rounded-2xl border transition-all",
                    step.isFinal
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-500/15"
                      : "bg-[#071328]/80 border-slate-800 text-slate-300",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      step.isFinal
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-cyan-500/10 text-cyan-400",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">{step.label}</span>
                    <span className="text-[10px] text-slate-500 block font-mono">
                      {step.isFinal ? "Status: Passed" : `Step 0${idx + 1}`}
                    </span>
                  </div>
                </div>

                {idx < steps.length - 1 && (
                  <div className="hidden sm:flex justify-center -mx-3 z-10 pointer-events-none">
                    <ArrowRight className="h-4 w-4 text-cyan-500/60" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
