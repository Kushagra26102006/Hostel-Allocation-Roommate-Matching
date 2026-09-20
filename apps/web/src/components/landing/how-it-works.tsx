"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  SlidersHorizontal,
  FileCheck2,
  KeyRound,
  Check,
  QrCode,
  Sparkles,
  ShieldCheck,
  Moon,
  Volume2,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/glass-card";
import { useMotionPreference } from "@/hooks/use-motion-preference";
import { getMessages } from "@/lib/i18n";

export function HowItWorks() {
  const [activeStep, setActiveStep] = React.useState(0);
  const { prefersReducedMotion } = useMotionPreference();
  const messages = getMessages();
  const copy = messages.howItWorks;

  const stepIcons = [
    ClipboardList,
    SlidersHorizontal,
    FileCheck2,
    KeyRound,
  ];

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="relative px-4 py-24 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{copy.badge}</span>
          </div>
          <h2
            id="how-it-works-heading"
            className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-text sm:text-4xl lg:text-5xl"
          >
            {copy.title}
          </h2>
          <p className="mt-4 text-base text-muted sm:text-lg">
            {copy.subtitle}
          </p>
        </div>

        {/* 2-Column Storytelling container */}
        <div className="mt-16 grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Column: 4 Step Cards */}
          <div className="flex flex-col gap-4 lg:col-span-6">
            {copy.steps.map((step, idx) => {
              const Icon = stepIcons[idx] ?? ClipboardList;
              const isActive = activeStep === idx;

              return (
                <div
                  key={step.number}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveStep(idx)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveStep(idx);
                    }
                  }}
                  className={cn(
                    "group relative cursor-pointer rounded-card p-6 transition-all duration-300",
                    isActive
                      ? "border-2 border-brand-500 bg-surface shadow-lg dark:bg-surface/90"
                      : "border border-border/70 bg-surface/50 hover:border-brand-300 hover:bg-surface/80",
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  <div className="flex items-start gap-4">
                    {/* Step number and icon badge */}
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors duration-280",
                        isActive
                          ? "bg-gradient-brand text-brand-foreground shadow-md"
                          : "bg-surface/80 text-muted group-hover:bg-brand-50 group-hover:text-brand-600 dark:group-hover:bg-brand-900/30",
                      )}
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                            Step {step.number}
                          </span>
                          <span className="rounded-full bg-border/50 px-2 py-0.5 text-[10px] font-medium text-muted">
                            {step.badge}
                          </span>
                        </div>
                        {isActive && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>

                      <h3 className="mt-1 font-heading text-lg font-bold text-text">
                        {step.title}
                      </h3>
                      <p className="text-xs font-semibold text-muted">
                        {step.tagline}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Morphing Illustration / Interactive Stage Preview */}
          <div className="lg:col-span-6">
            <GlassCard
              spotlight={!prefersReducedMotion}
              className="min-h-[460px] overflow-hidden border border-border/80 bg-surface/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
            >
              <div className="flex items-center justify-between border-b border-border/70 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-danger/80" />
                  <div className="h-3 w-3 rounded-full bg-warning/80" />
                  <div className="h-3 w-3 rounded-full bg-success/80" />
                  <span className="ml-2 text-xs font-medium text-muted font-mono">
                    HostelHub Interactive Engine
                  </span>
                </div>
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                  Stage 0{activeStep + 1} / 04
                </span>
              </div>

              {/* Morphing Visual Views */}
              <div className="relative mt-6 min-h-[340px]">
                <AnimatePresence mode="wait">
                  {/* Step 1 Illustration: Questionnaire */}
                  {activeStep === 0 && (
                    <motion.div
                      key="step-0"
                      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.28 }}
                      className="space-y-4"
                    >
                      <div className="rounded-xl border border-border/80 bg-surface/60 p-4">
                        <span className="text-xs font-bold text-text">
                          Student Chronotype & Study Preferences
                        </span>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50/50 p-2.5 dark:border-brand-800 dark:bg-brand-900/20">
                            <Moon className="h-4 w-4 text-brand-600" />
                            <div>
                              <div className="text-[11px] font-bold text-text">Night Owl</div>
                              <div className="text-[10px] text-muted">Sleeps after 1:00 AM</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2.5">
                            <Volume2 className="h-4 w-4 text-muted" />
                            <div>
                              <div className="text-[11px] font-bold text-text">Study Mode</div>
                              <div className="text-[10px] text-muted">Prefers silence</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/80 bg-surface/60 p-4">
                        <span className="text-xs font-bold text-text">
                          Tower Preference Ranking
                        </span>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs border border-border">
                            <span className="font-semibold text-text">1. Aryabhata Hall (Single AC)</span>
                            <span className="rounded bg-brand-100 dark:bg-brand-900/40 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:text-brand-300">Choice 1</span>
                          </div>
                          <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs border border-border">
                            <span className="font-semibold text-text">2. Gargi Residence (Double)</span>
                            <span className="rounded bg-border/50 px-1.5 py-0.5 text-[10px] font-medium text-muted">Choice 2</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2 Illustration: Gale-Shapley Matrix */}
                  {activeStep === 1 && (
                    <motion.div
                      key="step-1"
                      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.28 }}
                      className="space-y-4"
                    >
                      <div className="rounded-xl border border-border/80 bg-surface/60 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-text">
                            Gale-Shapley Stability Convergence
                          </span>
                          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                            Stable Match Found
                          </span>
                        </div>

                        {/* Roommate vector score */}
                        <div className="mt-4 rounded-lg bg-surface p-3 border border-border">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-text">Compatibility Quotient</span>
                            <span className="font-heading font-extrabold text-gradient text-sm">98.4%</span>
                          </div>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
                            <div className="h-full w-[98.4%] rounded-full bg-gradient-brand" />
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] text-muted">
                            <div className="rounded bg-brand-50 dark:bg-brand-900/30 p-1 font-medium text-text">Chronotype: 99%</div>
                            <div className="rounded bg-brand-50 dark:bg-brand-900/30 p-1 font-medium text-text">Cleanliness: 97%</div>
                            <div className="rounded bg-brand-50 dark:bg-brand-900/30 p-1 font-medium text-text">Academics: 99%</div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                          <ShieldCheck className="h-4 w-4 text-brand-500" />
                          <span>No blocking pairs detected across 1,520 applications</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3 Illustration: Warden Review Board */}
                  {activeStep === 2 && (
                    <motion.div
                      key="step-2"
                      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.28 }}
                      className="space-y-4"
                    >
                      <div className="rounded-xl border border-border/80 bg-surface/60 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-text">
                            Welfare Committee Audit Ledger
                          </span>
                          <span className="rounded bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">
                            Audited by Dr. R. Sharma (Chief Warden)
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/5 p-3 text-xs">
                            <div className="flex items-center gap-2.5">
                              <Check className="h-4 w-4 text-success" />
                              <div>
                                <span className="font-bold text-text">Medical Ground Allocation Approved</span>
                                <span className="block text-[10px] text-muted">Ground floor room assigned (Block B, 104)</span>
                              </div>
                            </div>
                            <span className="font-mono text-[10px] text-muted">14:32 IST</span>
                          </div>

                          <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-xs">
                            <div className="flex items-center gap-2.5">
                              <FileCheck2 className="h-4 w-4 text-brand-500" />
                              <div>
                                <span className="font-bold text-text">Provisional Roster Sign-Off</span>
                                <span className="block text-[10px] text-muted">Cryptographic hash appended to audit ledger</span>
                              </div>
                            </div>
                            <span className="font-mono text-[10px] text-muted">15:10 IST</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4 Illustration: Verified Allotment Pass */}
                  {activeStep === 3 && (
                    <motion.div
                      key="step-3"
                      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.28 }}
                      className="space-y-4"
                    >
                      <div className="rounded-xl border-2 border-brand-500/40 bg-gradient-to-br from-surface to-brand-50/20 p-5 shadow-lg dark:to-brand-950/20">
                        <div className="flex items-center justify-between border-b border-border/70 pb-3">
                          <div>
                            <span className="font-heading text-sm font-bold text-text">
                              Hostel Allotment Certificate
                            </span>
                            <span className="block text-[10px] text-muted">
                              Academic Session 2026-2027
                            </span>
                          </div>
                          <Award className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-4">
                          <div className="space-y-1 text-xs">
                            <div className="text-[11px] text-muted">Allotted Residence:</div>
                            <div className="font-heading text-base font-bold text-text">
                              Aryabhata Hall • Room 304
                            </div>
                            <div className="text-[11px] text-muted">Roommate: Advait K. (CS '28)</div>
                            <div className="inline-flex items-center gap-1 rounded bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                              <Check className="h-3 w-3" />
                              Verified Digital Allotment
                            </div>
                          </div>

                          {/* QR Code preview */}
                          <div className="flex flex-col items-center rounded-lg border border-border bg-surface p-2 shadow-sm">
                            <QrCode className="h-14 w-14 text-text" />
                            <span className="mt-1 text-[9px] font-mono text-muted">GATE PASS</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
}
