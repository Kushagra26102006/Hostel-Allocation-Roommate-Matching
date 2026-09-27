"use client";

import * as React from "react";
import Link from "next/link";
import { GlassCard } from "@/components/glass-card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { FadeIn, FadeUp } from "@/components/ui/motion-primitives";
import {
  Building,
  UploadCloud,
  PlayCircle,
  Sliders,
  Calendar,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useHostels } from "@/hooks/use-mock-api";

export default function AdminDashboardPage() {
  const { data: hostels } = useHostels();
  const totalBeds = hostels?.reduce((acc, h) => acc + h.totalBeds, 0) || 1970;
  const occupiedBeds = hostels?.reduce((acc, h) => acc + h.occupiedBeds, 0) || 1808;

  return (
    <FadeIn className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* 1. Header Banner */}
      <FadeUp className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
            <Building className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
            <span>Campus Physical Infrastructure</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl text-foreground">
            Hostel Operations Dashboard
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Manage inventory tree, CSV bulk imports, allocation engine cycles, and policy
            constraints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/admin/import">
              <UploadCloud className="mr-2 h-4 w-4" />
              CSV Import
            </Link>
          </Button>
          <Button
            asChild
            className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm"
          >
            <Link href="/admin/allocation">
              <PlayCircle className="mr-2 h-4 w-4" />
              Run Allocation Console
            </Link>
          </Button>
        </div>
      </FadeUp>

      {/* 2. Top Bento Stat Cards */}
      <FadeUp delay={0.05} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Campus Bed Capacity"
          value={totalBeds}
          icon={Building}
          variant="brand"
          description="5 Active Residential Towers"
        />
        <StatCard
          title="Occupied Beds"
          value={occupiedBeds}
          icon={CheckCircle2}
          variant="success"
          description={`${((occupiedBeds / totalBeds) * 100).toFixed(1)}% Capacity Filled`}
        />
        <StatCard
          title="Active Cycle"
          value="Fall 2026"
          icon={Calendar}
          variant="default"
          description="Phase: Draft Approved"
        />
        <StatCard
          title="Policy Rules Active"
          value={12}
          icon={Sliders}
          variant="brand"
          description="AST Verified Invariants"
        />
      </FadeUp>

      {/* 3. Operational Quick Actions Bento */}
      <FadeUp delay={0.1} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GlassCard className="p-5 hover:border-brand-500/40 transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-heading text-sm font-bold text-foreground">
                Inventory Hierarchy Tree
              </h4>
              <p className="text-xs text-muted-foreground">Hostel → Block → Floor → Room → Bed</p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="mt-3 w-full justify-between text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700"
          >
            <Link href="/admin/inventory">
              <span>Manage Inventory</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </GlassCard>

        <GlassCard className="p-5 hover:border-brand-500/40 transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
              <PlayCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-heading text-sm font-bold text-foreground">
                Allocation Engine Run Console
              </h4>
              <p className="text-xs text-muted-foreground">
                Execute deterministic matching algorithms
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="mt-3 w-full justify-between text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700"
          >
            <Link href="/admin/allocation">
              <span>Open Run Console</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </GlassCard>

        <GlassCard className="p-5 hover:border-brand-500/40 transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-heading text-sm font-bold text-foreground">
                Policy & Quota Rule Builder
              </h4>
              <p className="text-xs text-muted-foreground">Configure eligibility & cohort rules</p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="mt-3 w-full justify-between text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700"
          >
            <Link href="/admin/policies">
              <span>Configure Policies</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </GlassCard>
      </FadeUp>
    </FadeIn>
  );
}
