"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { StatCard } from "@/components/ui/stat-card";
import { BarChart3, TrendingUp, Users, Scale, Sparkles } from "lucide-react";

export default function ChiefWardenAnalyticsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-200/80 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 dark:border-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
          <BarChart3 className="h-3.5 w-3.5" />
          <span>Fairness & Optimization Metrics</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">
          Fairness & Satisfaction Analytics
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Algorithmic balance, preference satisfaction distribution, and demographic parity reports.
        </p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Gini Inequality Score"
          value="0.08"
          icon={Scale}
          variant="success"
          description="Near-perfect preference equity (<0.15)"
        />
        <StatCard
          title="First-Choice Rate"
          value={81.2}
          suffix="%"
          icon={Sparkles}
          variant="brand"
          description="1,502 of 1,850 matched to #1"
        />
        <StatCard
          title="Average Rank Satisfied"
          value="1.28"
          icon={TrendingUp}
          variant="brand"
          description="Out of top 3 ranked preferences"
        />
        <StatCard
          title="Roommate Compatibility"
          value={87.4}
          suffix="%"
          icon={Users}
          variant="accent"
          description="Mean lifestyle alignment score"
        />
      </div>

      {/* Fairness & Distribution Breakdown Bento */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h3 className="font-heading text-base font-bold text-foreground">
            Preference Rank Distribution
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Distribution of awarded choices across 1,850 assigned students
          </p>

          <div className="mt-6 space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-bold mb-1">
                <span>1st Choice (Aryabhata, Gargi, etc.)</span>
                <span>81.2% (1,502 students)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: "81.2%" }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold mb-1">
                <span>2nd Choice</span>
                <span>14.6% (270 students)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-surface-muted overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full" style={{ width: "14.6%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold mb-1">
                <span>3rd Choice</span>
                <span>4.2% (78 students)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-surface-muted overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: "4.2%" }}></div>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="font-heading text-base font-bold text-foreground">
            Occupancy by Residence Tower
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Capacity utilization across campus residential complexes
          </p>

          <div className="mt-6 space-y-4 text-xs">
            {[
              { name: "Aryabhata Hall (Men Senior UG)", pct: "94.0%", beds: "395 / 420" },
              { name: "Gargi Residence (Women UG/PG)", pct: "94.2%", beds: "358 / 380" },
              { name: "Ramanujan Tower (Research Enclave)", pct: "90.0%", beds: "360 / 400" },
              { name: "Kalpana Chawla Hall (Women Freshmen)", pct: "89.1%", beds: "285 / 320" },
              { name: "Vikram Sarabhai Hall (Men General)", pct: "91.1%", beds: "410 / 450" },
            ].map((h, i) => (
              <div key={i}>
                <div className="flex justify-between font-bold mb-1">
                  <span>{h.name}</span>
                  <span className="text-muted-foreground">
                    {h.beds} ({h.pct})
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-600 to-purple-600 rounded-full"
                    style={{ width: h.pct }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
