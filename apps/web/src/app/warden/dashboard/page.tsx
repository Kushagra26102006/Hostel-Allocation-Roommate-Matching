"use client";

import * as React from "react";
import Link from "next/link";
import { GlassCard } from "@/components/glass-card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { FadeIn, FadeUp } from "@/components/ui/motion-primitives";
import {
  ClipboardCheck,
  Grid,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Building,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useAllocationRuns } from "@/hooks/use-mock-api";

export default function WardenDashboardPage() {
  const { data: runs } = useAllocationRuns();
  const run = runs?.[0];

  const pendingReviewItems = [
    {
      student: "Siddharth Rao",
      rollNo: "23CS10090",
      type: "Low Compatibility Assignment",
      detail: "Assigned with room match score 64% (Below 70% threshold)",
      room: "A-302 Bed 1",
      actionHref: "/warden/review",
    },
    {
      student: "Dr. Priya Sundaram",
      rollNo: "25PHD001",
      type: "PwD Accessibility Verification",
      detail: "Requires Ground Floor Wheelchair Accessible Bed (A-101 Bed 1)",
      room: "A-101 Bed 1",
      actionHref: "/warden/review",
    },
    {
      student: "Kabir Mehta",
      rollNo: "24ME10023",
      type: "Warden Manual Override",
      detail: "Inter-university Sports curfew exemption attached",
      room: "A-204 Bed 2",
      actionHref: "/warden/review",
    },
  ];

  return (
    <FadeIn className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* 1. Header Banner with Active Draft Status & SLA */}
      <FadeUp className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
            <ClipboardCheck className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
            <span>Assigned Jurisdiction: Aryabhata Hall (BH-1)</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl text-foreground">
            Warden Operational Review Console
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Fall 2026 Regular Allocation Draft {run ? `#${run.id}` : "#draft-fall-2026-v1"} • 420
            Beds Managed
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/warden/bed-map">
              <Grid className="mr-2 h-4 w-4" />
              Visual Bed Map
            </Link>
          </Button>
          <Button
            asChild
            className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm"
          >
            <Link href="/warden/approvals">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Sign-Off & Approve
            </Link>
          </Button>
        </div>
      </FadeUp>

      {/* 2. Top Bento Stat Cards */}
      <FadeUp delay={0.05} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Occupancy Ratio"
          value={94.0}
          suffix="%"
          icon={Building}
          variant="brand"
          description="395 / 420 beds allocated"
        />
        <StatCard
          title="Pending Reviews"
          value={3}
          icon={AlertTriangle}
          variant="warning"
          description="SLA Window: 18h remaining"
        />
        <StatCard
          title="Satisfaction Rate"
          value={81.2}
          suffix="%"
          icon={Sparkles}
          variant="success"
          description="1st choice fulfilled"
        />
        <StatCard
          title="Waitlist Queue"
          value={24}
          icon={Users}
          variant="default"
          description="Eligible general merited"
        />
      </FadeUp>

      {/* 3. Operational Review Bento Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Pending Attention Cases (8 cols) */}
        <FadeUp delay={0.1} className="space-y-6 lg:col-span-8">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-base font-bold text-foreground">
                  Cases Requiring Warden Decision & Override
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Low compatibility matches, special medical needs, or manual override requests
                </p>
              </div>
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                3 Pending
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {pendingReviewItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-surface-muted/30 p-4 transition-all hover:bg-surface-muted/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm font-bold text-foreground">
                        {item.student}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        ({item.rollNo})
                      </span>
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200/50 dark:border-brand-800/50">
                        {item.room}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      <strong className="text-amber-600 dark:text-amber-400">{item.type}: </strong>
                      {item.detail}
                    </div>
                  </div>

                  <Button asChild size="sm" variant="outline" className="shrink-0 rounded-xl">
                    <Link href={item.actionHref}>
                      Review Case
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Quick Access Operational Modules */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GlassCard className="p-5 hover:border-brand-500/40 transition-all">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
                  <Grid className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-heading text-sm font-bold text-foreground">
                    Interactive Bed Map
                  </h4>
                  <p className="text-xs text-muted-foreground">Floor-by-floor visual room matrix</p>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="mt-3 w-full justify-between text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700"
              >
                <Link href="/warden/bed-map">
                  <span>Open 4-Floor Bed Matrix</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </GlassCard>

            <GlassCard className="p-5 hover:border-brand-500/40 transition-all">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-heading text-sm font-bold text-foreground">
                    Waitlist Management
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Promote students into released beds
                  </p>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="mt-3 w-full justify-between text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700"
              >
                <Link href="/warden/waitlist">
                  <span>View Quota Buckets</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </GlassCard>
          </div>
        </FadeUp>

        {/* Right: SLA Timers & Draft Invariants (4 cols) */}
        <FadeUp delay={0.15} className="space-y-6 lg:col-span-4">
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-4 w-4 text-amber-500" />
              <span>Review SLA Timer</span>
            </div>
            <div className="mt-2 font-heading text-3xl font-extrabold text-foreground">
              18h : 22m
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Remaining window before draft auto-escalates to Chief Warden for emergency sign-off.
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <h3 className="font-heading text-base font-bold text-foreground">
                Mathematical Invariants
              </h3>
            </div>
            <div className="mt-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-surface-muted/50 p-2.5 border border-border/40">
                <span className="text-muted-foreground font-medium">Single Occupancy (P1):</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  0 Overlaps ✓
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface-muted/50 p-2.5 border border-border/40">
                <span className="text-muted-foreground font-medium">Gender Cohorts (P2):</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  100% Match ✓
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface-muted/50 p-2.5 border border-border/40">
                <span className="text-muted-foreground font-medium">Priority Inversions (P3):</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  0 Inversions ✓
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface-muted/50 p-2.5 border border-border/40">
                <span className="text-muted-foreground font-medium">Deterministic Seed:</span>
                <span className="font-mono text-foreground font-bold">421098</span>
              </div>
            </div>
          </GlassCard>
        </FadeUp>
      </div>
    </FadeIn>
  );
}
