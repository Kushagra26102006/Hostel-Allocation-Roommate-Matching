"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, Clock, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/glass-card";

interface StepItem {
  id: number;
  label: string;
  date: string;
  detail: string;
  status: "completed" | "current" | "upcoming";
}

const STEPS: StepItem[] = [
  {
    id: 1,
    label: "Application Submitted",
    date: "Sep 11, 2026",
    detail: "Application #APP-2026-881 filed with preference weights",
    status: "completed",
  },
  {
    id: 2,
    label: "Documents Verified",
    date: "Sep 13, 2026",
    detail: "Academic transcript and fee eligibility cleared",
    status: "completed",
  },
  {
    id: 3,
    label: "Roommate Matched",
    date: "Sep 16, 2026",
    detail: "Matched with Kabir Mehta (94% compatibility score)",
    status: "completed",
  },
  {
    id: 4,
    label: "Room Allocated",
    date: "Sep 18, 2026",
    detail: "Allotted Room 304 (Bed A-304-1) in Aryabhata Hall",
    status: "completed",
  },
  {
    id: 5,
    label: "Move-in Check-in",
    date: "Sep 25, 2026",
    detail: "Report to North Gate Warden Office for biometric key distribution",
    status: "current",
  },
];

export function HousingJourneyStepper() {
  const [hoveredStep, setHoveredStep] = React.useState<number | null>(null);

  // Completed steps count (4 out of 5)
  const completedCount = STEPS.filter((s) => s.status === "completed").length;
  const progressPercent = (completedCount / (STEPS.length - 1)) * 100;

  return (
    <GlassCard className="p-6 overflow-visible border-border/80 shadow-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-bold text-text">Housing Allocation Journey</h2>
            <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
          </div>
          <p className="text-xs text-muted mt-0.5">
            Automated Gale-Shapley matching, algorithmic verification, and room assignment lifecycle
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 self-start sm:self-auto">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Step 4 of 5 Complete</span>
        </div>
      </div>

      {/* Progress Timeline on Desktop & Tablet */}
      <div className="relative hidden md:block px-6 pb-2">
        {/* Track Line */}
        <div className="absolute top-5 left-12 right-12 h-1 bg-border/60 rounded-full" />

        {/* Animated Progress Line */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-5 left-12 h-1 bg-gradient-to-r from-emerald-500 via-brand-500 to-indigo-600 rounded-full shadow-[0_0_12px_rgba(79,70,229,0.5)]"
        />

        {/* Steps Nodes */}
        <div className="relative flex justify-between">
          {STEPS.map((step) => {
            const isCompleted = step.status === "completed";
            const isCurrent = step.status === "current";
            const isHovered = hoveredStep === step.id;

            return (
              <div
                key={step.id}
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
                className="relative flex flex-col items-center group cursor-pointer focus:outline-none"
              >
                {/* Node Circle */}
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition-all shadow-md ${
                    isCompleted
                      ? "bg-emerald-600 text-white shadow-emerald-500/30 ring-4 ring-emerald-500/15"
                      : isCurrent
                        ? "bg-gradient-to-tr from-brand-600 to-cyan-500 text-white shadow-brand-500/40 ring-4 ring-brand-500/30 animate-pulse"
                        : "bg-surface text-muted border-2 border-border shadow-xs"
                  }`}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Check className="h-5 w-5 stroke-[2.5]" />
                    </motion.div>
                  ) : isCurrent ? (
                    <span className="h-3 w-3 rounded-full bg-white shadow-xs" />
                  ) : (
                    <span>{step.id}</span>
                  )}

                  {/* Beacon pulse for current */}
                  {isCurrent && (
                    <span className="absolute -inset-1 rounded-full bg-brand-500/30 animate-ping pointer-events-none" />
                  )}
                </motion.div>

                {/* Step Titles */}
                <div className="mt-3 text-center max-w-[130px]">
                  <span
                    className={`block text-xs font-bold leading-tight transition-colors ${
                      isCurrent
                        ? "text-brand-600 dark:text-brand-400"
                        : isCompleted
                          ? "text-text"
                          : "text-muted"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="block text-[11px] text-muted mt-1 flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3 text-muted/70" /> {step.date}
                  </span>
                </div>

                {/* Hover Tooltip */}
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -top-16 z-30 w-56 rounded-xl border border-border/80 bg-surface/98 p-2.5 text-center shadow-xl backdrop-blur-xl text-text pointer-events-none"
                  >
                    <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-brand-600 dark:text-brand-400">
                      {isCompleted ? "Completed" : isCurrent ? "Current Action" : "Pending"}
                    </div>
                    <p className="mt-1 text-[11px] text-muted leading-tight">{step.detail}</p>
                    <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 h-3 w-3 rotate-45 border-b border-r border-border/80 bg-surface" />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Stacked Stepper */}
      <div className="block md:hidden space-y-3">
        {STEPS.map((step) => {
          const isCompleted = step.status === "completed";
          const isCurrent = step.status === "current";

          return (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                isCompleted
                  ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
                  : isCurrent
                    ? "border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/30"
                    : "border-border/60 bg-card/40 opacity-70"
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isCompleted
                    ? "bg-emerald-600 text-white"
                    : isCurrent
                      ? "bg-brand-600 text-white animate-pulse"
                      : "bg-muted/30 text-muted"
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-text truncate">{step.label}</h4>
                  <span className="text-[10px] font-medium text-muted shrink-0">{step.date}</span>
                </div>
                <p className="text-[11px] text-muted mt-0.5 leading-snug">{step.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
