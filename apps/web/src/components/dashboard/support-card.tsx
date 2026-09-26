"use client";

import * as React from "react";
import Link from "next/link";
import {
  Wrench,
  Zap,
  Droplets,
  Armchair,
  Wifi,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Headphones,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";

const FAULT_TAGS = [
  { name: "Electrical", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
  { name: "Plumbing", icon: Droplets, color: "text-blue-500", bg: "bg-blue-500/10" },
  { name: "Furniture", icon: Armchair, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { name: "Internet", icon: Wifi, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { name: "Other", icon: HelpCircle, color: "text-violet-500", bg: "bg-violet-500/10" },
];

export function SupportCard() {
  return (
    <GlassCard className="p-6 border-border/80 shadow-lg flex flex-col justify-between h-full relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sm">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Need Help?
              </span>
              <h3 className="font-heading text-base font-bold text-text">
                Maintenance &amp; Helpdesk
              </h3>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3 w-3" /> SLA: 4 Hours
          </span>
        </div>

        <p className="text-xs text-muted leading-relaxed">
          Report in-room fixture damages, Wi-Fi connectivity drops, plumbing leaks, or carpentry
          issues directly to the campus facility engineering squad.
        </p>

        {/* Fault Category Chips */}
        <div className="mt-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-2">
            Instant Fault Dispatch
          </span>
          <div className="flex flex-wrap gap-1.5">
            {FAULT_TAGS.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.name}
                  href={`/complaints?category=${t.name.toLowerCase()}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-surface/80 px-2.5 py-1.5 text-xs font-medium text-text hover:border-amber-500/50 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all hover:scale-102"
                >
                  <Icon className={`h-3.5 w-3.5 ${t.color}`} />
                  <span>{t.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="mt-6 pt-4 border-t border-border/50">
        <Link
          href="/complaints"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-600/20 transition-all hover:scale-[1.01] active:scale-[0.98]"
        >
          <Wrench className="h-4 w-4" />
          <span>Raise Maintenance Request</span>
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Link>
      </div>
    </GlassCard>
  );
}
