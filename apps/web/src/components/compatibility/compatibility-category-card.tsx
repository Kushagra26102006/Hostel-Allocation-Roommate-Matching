"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type CategoryTheme = "cyan" | "violet" | "emerald" | "blue" | "orange" | "green";

interface CompatibilityCategoryCardProps {
  name: string;
  score: number;
  note: string;
  icon: LucideIcon;
  theme: CategoryTheme;
  index?: number;
}

const THEME_CONFIG: Record<
  CategoryTheme,
  {
    iconBg: string;
    iconBorder: string;
    iconColor: string;
    pillBg: string;
    pillBorder: string;
    pillText: string;
    barGradient: string;
    barGlow: string;
    hoverBorder: string;
  }
> = {
  cyan: {
    iconBg: "bg-cyan-500/10",
    iconBorder: "border-cyan-500/30",
    iconColor: "text-cyan-400",
    pillBg: "bg-cyan-500/15",
    pillBorder: "border-cyan-500/30",
    pillText: "text-cyan-300",
    barGradient: "from-cyan-400 via-cyan-300 to-sky-400",
    barGlow: "shadow-[0_0_12px_rgba(6,182,212,0.6)]",
    hoverBorder: "hover:border-cyan-400/50",
  },
  violet: {
    iconBg: "bg-indigo-500/10",
    iconBorder: "border-indigo-500/30",
    iconColor: "text-indigo-400",
    pillBg: "bg-indigo-500/15",
    pillBorder: "border-indigo-500/30",
    pillText: "text-indigo-300",
    barGradient: "from-indigo-400 via-violet-400 to-purple-400",
    barGlow: "shadow-[0_0_12px_rgba(99,102,241,0.6)]",
    hoverBorder: "hover:border-indigo-400/50",
  },
  emerald: {
    iconBg: "bg-emerald-500/10",
    iconBorder: "border-emerald-500/30",
    iconColor: "text-emerald-400",
    pillBg: "bg-emerald-500/15",
    pillBorder: "border-emerald-500/30",
    pillText: "text-emerald-300",
    barGradient: "from-emerald-400 via-teal-400 to-cyan-400",
    barGlow: "shadow-[0_0_12px_rgba(16,185,129,0.6)]",
    hoverBorder: "hover:border-emerald-400/50",
  },
  blue: {
    iconBg: "bg-sky-500/10",
    iconBorder: "border-sky-500/30",
    iconColor: "text-sky-400",
    pillBg: "bg-sky-500/15",
    pillBorder: "border-sky-500/30",
    pillText: "text-sky-300",
    barGradient: "from-sky-400 via-blue-400 to-indigo-400",
    barGlow: "shadow-[0_0_12px_rgba(56,189,248,0.6)]",
    hoverBorder: "hover:border-sky-400/50",
  },
  orange: {
    iconBg: "bg-amber-500/10",
    iconBorder: "border-amber-500/30",
    iconColor: "text-amber-400",
    pillBg: "bg-amber-500/15",
    pillBorder: "border-amber-500/30",
    pillText: "text-amber-300",
    barGradient: "from-amber-400 via-orange-400 to-yellow-400",
    barGlow: "shadow-[0_0_12px_rgba(245,158,11,0.6)]",
    hoverBorder: "hover:border-amber-400/50",
  },
  green: {
    iconBg: "bg-emerald-500/10",
    iconBorder: "border-emerald-500/30",
    iconColor: "text-emerald-400",
    pillBg: "bg-emerald-500/15",
    pillBorder: "border-emerald-500/30",
    pillText: "text-emerald-300",
    barGradient: "from-green-400 via-emerald-400 to-teal-400",
    barGlow: "shadow-[0_0_12px_rgba(16,185,129,0.6)]",
    hoverBorder: "hover:border-emerald-400/50",
  },
};

export function CompatibilityCategoryCard({
  name,
  score,
  note,
  icon: Icon,
  theme,
  index = 0,
}: CompatibilityCategoryCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const styles = THEME_CONFIG[theme];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      whileHover={{ y: -3 }}
      className={cn(
        "group relative rounded-3xl border border-[rgba(80,120,170,0.25)] bg-[rgba(8,17,36,0.85)] p-5 sm:p-6 backdrop-blur-xl shadow-xl shadow-black/40 transition-all duration-300 flex flex-col justify-between overflow-hidden",
        styles.hoverBorder,
      )}
    >
      {/* Top subtle highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Card Header: Icon + Pill */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm transition-transform duration-300 group-hover:scale-105",
              styles.iconBg,
              styles.iconBorder,
              styles.iconColor,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold font-mono tracking-tight",
              styles.pillBg,
              styles.pillBorder,
              styles.pillText,
            )}
          >
            <span>{score}% Match</span>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="font-heading text-base font-bold text-white tracking-tight mt-4 group-hover:text-cyan-200 transition-colors">
          {name}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed mt-1.5 font-medium">{note}</p>
      </div>

      {/* Animated Progress Bar */}
      <div className="pt-5 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
          <span className="text-slate-500 uppercase tracking-wider">Alignment</span>
          <span className="text-slate-300">{score}%</span>
        </div>

        <div className="relative h-2 w-full rounded-full bg-slate-900/90 border border-slate-800/80 overflow-hidden">
          {shouldReduceMotion ? (
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r",
                styles.barGradient,
                styles.barGlow,
              )}
              style={{ width: `${score}%` }}
            />
          ) : (
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${score}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: index * 0.08 + 0.1 }}
              className={cn(
                "h-full rounded-full bg-gradient-to-r",
                styles.barGradient,
                styles.barGlow,
              )}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
