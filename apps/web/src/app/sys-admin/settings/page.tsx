"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { useWeightVersions } from "@/hooks/use-mock-api";
import { Sliders } from "lucide-react";

export default function SysAdminSettingsPage() {
  const { data: weights } = useWeightVersions();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface-muted px-3 py-1 text-xs font-semibold text-foreground">
          <Sliders className="h-3.5 w-3.5" />
          <span>System Parameters & Diffs</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">
          Weight Version Diff Viewer
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Compare versioned scoring weights (wP, wC, wF, wD, wK) with audit timestamps and policy
          justifications.
        </p>
      </div>

      {/* Active Weight Formula Banner */}
      <GlassCard className="p-6 border-brand-500/40 bg-gradient-to-r from-brand-500/10 via-transparent to-accent/5">
        <div className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
          Active Production Scoring Formula
        </div>
        <div className="mt-2 font-mono text-base font-extrabold text-foreground">
          S(u, r) = 0.45·P + 0.30·C + 0.10·F + 0.10·D + 0.05·K
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          P = Preference Rank, C = Compatibility Match, F = Room Fill, D = Academic Proximity, K =
          Year Continuity
        </p>
      </GlassCard>

      {/* Weight History Diffs */}
      <div className="space-y-4">
        <h3 className="font-heading text-base font-bold text-foreground">
          Versioned Policy History
        </h3>
        {weights?.map((w, idx) => (
          <GlassCard key={w.id} className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-heading text-base font-bold text-foreground">
                  {w.version}
                </span>
                {idx === 0 && (
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    Active
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Changed by: <strong>{w.changedBy}</strong> • {w.createdAt}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="rounded-xl bg-surface-muted/50 p-3 border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Preference (wP)
                </span>
                <div className="font-mono text-base font-bold text-foreground mt-0.5">{w.wP}</div>
              </div>
              <div className="rounded-xl bg-surface-muted/50 p-3 border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Compatibility (wC)
                </span>
                <div className="font-mono text-base font-bold text-foreground mt-0.5">{w.wC}</div>
              </div>
              <div className="rounded-xl bg-surface-muted/50 p-3 border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Room Fill (wF)
                </span>
                <div className="font-mono text-base font-bold text-foreground mt-0.5">{w.wF}</div>
              </div>
              <div className="rounded-xl bg-surface-muted/50 p-3 border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Proximity (wD)
                </span>
                <div className="font-mono text-base font-bold text-foreground mt-0.5">{w.wD}</div>
              </div>
              <div className="rounded-xl bg-surface-muted/50 p-3 border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Continuity (wK)
                </span>
                <div className="font-mono text-base font-bold text-foreground mt-0.5">{w.wK}</div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-surface-muted/40 p-3 text-xs text-muted-foreground border border-border/40">
              <strong className="text-foreground">Policy Justification:</strong> {w.reason}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
