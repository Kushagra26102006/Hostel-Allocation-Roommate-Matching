"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { StatCard } from "@/components/ui/stat-card";
import { FadeIn, FadeUp } from "@/components/ui/motion-primitives";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import {
  BarChart3,
  Scale,
  Sparkles,
  Building,
  Users,
  ShieldCheck,
  Clock,
  Shuffle,
  Accessibility,
} from "lucide-react";

const HOSTEL_OCCUPANCY_DATA = [
  { name: "Aryabhata", occupied: 395, capacity: 420 },
  { name: "Gargi", occupied: 358, capacity: 380 },
  { name: "Ramanujan", occupied: 360, capacity: 400 },
  { name: "Kalpana", occupied: 285, capacity: 320 },
  { name: "Sarabhai", occupied: 410, capacity: 450 },
];

// Single brand monochromatic palette
const BRAND_PRIMARY = "#3155FF";
const BRAND_TINT = "#5B79FF";
const NEUTRAL_SHADE = "#94A3B8";

const SATISFACTION_DATA = [
  { name: "1st Preference", value: 81.2, color: BRAND_PRIMARY },
  { name: "2nd Preference", value: 14.6, color: BRAND_TINT },
  { name: "3rd Preference", value: 4.2, color: NEUTRAL_SHADE },
];

const CONVERGENCE_DATA = [
  { round: "Round 1", unassigned: 2040, stabilityScore: 42 },
  { round: "Round 2", unassigned: 1120, stabilityScore: 68 },
  { round: "Round 3", unassigned: 480, stabilityScore: 84 },
  { round: "Round 4", unassigned: 190, stabilityScore: 94 },
  { round: "Round 5", unassigned: 0, stabilityScore: 100 },
];

export default function DeanAnalyticsPage() {
  return (
    <FadeIn className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <FadeUp>
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
          <BarChart3 className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          <span>Executive Governance Oversight</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl text-foreground">
          Dean Housing Welfare Analytics
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Aggregated institutional governance metrics across campus capacity, preference equity,
          accessibility compliance, and Gale-Shapley cycle performance.
        </p>
      </FadeUp>

      {/* Top 8 Executive KPI Bento Cards */}
      <FadeUp delay={0.05} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Campus Occupancy"
          value={93.9}
          suffix="%"
          icon={Building}
          variant="brand"
          description="1,850 of 1,970 Beds Occupied"
        />
        <StatCard
          title="First-Choice Rate"
          value={81.2}
          suffix="%"
          icon={Sparkles}
          variant="success"
          description="1,502 Students Satisfied"
        />
        <StatCard
          title="Mean Compatibility"
          value={87.4}
          suffix="%"
          icon={Users}
          variant="default"
          description="Lifestyle Alignment Index"
        />
        <StatCard
          title="Gini Equity Score"
          value="0.08"
          icon={Scale}
          variant="success"
          description="Near-Zero Inequality (<0.15 threshold)"
        />
        <StatCard
          title="Manual Overrides"
          value={18}
          icon={Shuffle}
          variant="default"
          description="0.97% of total allocations"
        />
        <StatCard
          title="PwD Accessibility"
          value={100}
          suffix="%"
          icon={Accessibility}
          variant="success"
          description="45 / 45 PwD Ground Floor Units"
        />
        <StatCard
          title="Engine Runtime"
          value={14.2}
          suffix="s"
          icon={Clock}
          variant="brand"
          description="Instant vs. 3 weeks manual"
        />
        <StatCard
          title="Waitlist Retention"
          value={120}
          icon={ShieldCheck}
          variant="default"
          description="Active general merit queue"
        />
      </FadeUp>

      {/* Recharts Analytics Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Occupancy by Hostel (7 cols) - Monochromatic brand indigo */}
        <FadeUp delay={0.1} className="lg:col-span-7">
          <GlassCard className="p-6">
            <h3 className="font-heading text-base font-bold text-foreground">
              Occupancy vs. Capacity by Residence Tower
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live allocation counts across 5 university residential complexes
            </p>

            <div className="mt-6 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={HOSTEL_OCCUPANCY_DATA}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--surface))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="occupied"
                    fill={BRAND_PRIMARY}
                    name="Occupied Beds"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="capacity"
                    fill={NEUTRAL_SHADE}
                    opacity={0.25}
                    name="Total Capacity"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </FadeUp>

        {/* Preference Distribution (5 cols) - Clean Monochromatic Shades */}
        <FadeUp delay={0.12} className="lg:col-span-5">
          <GlassCard className="p-6 flex flex-col justify-between h-full">
            <div>
              <h3 className="font-heading text-base font-bold text-foreground">
                Preference Rank Satisfaction
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Applicant proportion matched to ranked choices
              </p>
            </div>

            <div className="h-48 w-full my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={SATISFACTION_DATA}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {SATISFACTION_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--surface))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {SATISFACTION_DATA.map((s, i) => (
                <div key={i} className="rounded-xl bg-surface-muted/40 p-2 border border-border/40">
                  <span className="text-[10px] text-muted-foreground block truncate">{s.name}</span>
                  <span className="font-bold text-foreground mt-0.5 block">{s.value}%</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </FadeUp>

        {/* Gale-Shapley Convergence Area Chart (12 cols) */}
        <FadeUp delay={0.15} className="lg:col-span-12">
          <GlassCard className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-heading text-base font-bold text-foreground">
                  Gale-Shapley Algorithm Convergence Velocity
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Deferred-acceptance proposal stability index across matching rounds
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                100% Stability Reached in Round 5
              </span>
            </div>

            <div className="mt-6 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={CONVERGENCE_DATA}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRAND_PRIMARY} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={BRAND_PRIMARY} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="round" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--surface))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="stabilityScore"
                    stroke={BRAND_PRIMARY}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#brandGradient)"
                    name="Stability Index (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </FadeUp>
      </div>
    </FadeIn>
  );
}
