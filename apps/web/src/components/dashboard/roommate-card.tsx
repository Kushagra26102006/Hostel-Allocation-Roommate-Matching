"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Sparkles, HeartHandshake, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { CompatibilityRing } from "@/components/dashboard/compatibility-ring";

interface RoommateCardProps {
  roommate: {
    name: string;
    department: string;
    bed: string;
    compatibility: number;
    traits?: string[];
  };
}

const HABIT_BREAKDOWN = [
  { label: "Sleep Schedule", score: 98, note: "Early Bird (11 PM - 7 AM)", color: "bg-indigo-500" },
  {
    label: "Study Quiet Hours",
    score: 92,
    note: "Silent library & room study",
    color: "bg-cyan-500",
  },
  {
    label: "Room Cleanliness",
    score: 95,
    note: "High daily organization",
    color: "bg-emerald-500",
  },
  {
    label: "Guest & Social Policy",
    score: 91,
    note: "Moderate weekends only",
    color: "bg-violet-500",
  },
];

export function RoommateCard({ roommate }: RoommateCardProps) {
  return (
    <GlassCard className="p-6 border-border/80 shadow-lg flex flex-col justify-between h-full">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-text">Roommate Profile</h3>
              <p className="text-[11px] text-muted">MCDA &amp; Gale-Shapley Pair Match</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 border border-brand-500/20 px-2.5 py-0.5 text-xs font-bold text-brand-600 dark:text-brand-400">
            <Sparkles className="h-3 w-3" /> Confirmed
          </span>
        </div>

        {/* Roommate Profile Highlight with Animated Circular Ring */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-2xl border border-border/60 bg-muted/5">
          {/* Animated Compatibility Ring */}
          <div className="shrink-0 flex flex-col items-center">
            <CompatibilityRing score={roommate.compatibility} size={96} strokeWidth={8} />
          </div>

          {/* Bio Details */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-cyan-500 text-white font-bold text-sm shadow-sm ring-2 ring-white/10">
                KM
              </div>
              <div>
                <h4 className="font-heading text-base font-bold text-text">{roommate.name}</h4>
                <p className="text-xs text-muted">B.Tech Computer Science &amp; Eng.</p>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              <span className="rounded-lg bg-surface border border-border/70 px-2 py-0.5 text-[10px] font-semibold text-text">
                {roommate.bed}
              </span>
              <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Compatible Sleep &amp; Study
              </span>
            </div>
          </div>
        </div>

        {/* Compatibility Habit Breakdown Bars */}
        <div className="mt-5 space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
            Multi-Criteria Compatibility Breakdown
          </span>

          <div className="space-y-2.5">
            {HABIT_BREAKDOWN.map((habit) => (
              <div key={habit.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text text-[11px]">{habit.label}</span>
                  <span className="font-bold text-muted text-[11px]">{habit.score}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-border/50 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${habit.score}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    className={`h-full rounded-full ${habit.color}`}
                  />
                </div>
                <p className="text-[10px] text-muted">{habit.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA to Roommate Page */}
      <div className="mt-6 border-t border-border/50 pt-4">
        <Link
          href="/roommate"
          className="flex items-center justify-between rounded-xl bg-surface border border-border/70 p-3 hover:border-brand-500/50 hover:bg-brand-50/50 dark:hover:bg-brand-900/20 transition-all group"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400">
            <HeartHandshake className="h-4 w-4" />
            <span>View Compatibility Questionnaire</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-brand-600 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </GlassCard>
  );
}
