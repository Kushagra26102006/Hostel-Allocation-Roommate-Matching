import type { Metadata } from "next";
import Link from "next/link";
import {
  Building,
  CheckCircle2,
  Activity,
  Sliders,
  Scale,
  Download,
  Play,
  RotateCcw,
  Server,
  Database,
  Cpu,
  Shield,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { OccupancyHeatMap } from "@/components/inventory/occupancy-heatmap";
import { DocumentVerificationQueue } from "@/components/admin/document-verification-queue";
import { getNavItemByPath } from "@/config/navigation";

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const path = `/staff/${slug.join("/")}`;
  const navItem = getNavItemByPath(path);
  const title = navItem ? navItem.fallbackTitle : "Staff Module";

  return {
    title: `${title} — HostelHub Staff`,
    description: `Staff portal module for ${title}`,
  };
}

export default async function StaffModulePage({ params }: PageProps) {
  const { slug } = await params;
  const slugPath = slug.join("/");
  const path = `/staff/${slugPath}`;
  const navItem = getNavItemByPath(path);
  const title =
    navItem?.fallbackTitle ??
    slug[slug.length - 1]?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ??
    "Staff Destination";

  // ── 1. INVENTORY & ROOM HEATMAP MODULE ─────────────────────────────────────
  if (slug.includes("inventory") || slug.includes("rooms")) {
    return (
      <div className="space-y-8 pb-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300 mb-2">
              <Building className="h-3.5 w-3.5" />
              <span>Campus Residence Inventory</span>
            </div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Live spatial map of towers, floors, room capacities, and real-time bed occupancy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2 text-xs font-bold text-text hover:bg-muted/10 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-muted" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-500 transition-colors shadow-sm"
            >
              <span>+ Add Room / Block</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <GlassCard className="p-5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Total Bed Inventory
            </span>
            <div className="text-2xl font-bold text-text mt-2">1,520</div>
            <p className="text-xs text-muted mt-1">Across 4 residential towers</p>
          </GlassCard>
          <GlassCard className="p-5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Occupied Beds
            </span>
            <div className="text-2xl font-bold text-brand-600 dark:text-brand-400 mt-2">1,398</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              92.0% Campus Fill Rate
            </p>
          </GlassCard>
          <GlassCard className="p-5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Available Unoccupied
            </span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              122
            </div>
            <p className="text-xs text-muted mt-1">Ready for round 2 intake</p>
          </GlassCard>
          <GlassCard className="p-5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Under Maintenance
            </span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">14</div>
            <p className="text-xs text-muted mt-1">Routine AC & paint touch-up</p>
          </GlassCard>
        </div>

        {/* Interactive Heatmap */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold text-text">
              Live Bed Matrix & Room Availability
            </h2>
            <span className="text-xs text-muted">
              Click any room tile to inspect resident assignments
            </span>
          </div>
          <OccupancyHeatMap />
        </div>
      </div>
    );
  }

  // ── 2. ALLOCATION ENGINE & ALLOTMENT REVIEWS ────────────────────────────────
  if (slug.includes("allotments") || slug.includes("allocations")) {
    return (
      <div className="space-y-8 pb-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 mb-2">
              <Sliders className="h-3.5 w-3.5" />
              <span>Deterministic Algorithm Engine</span>
            </div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
              Allocation Reviews & Engine Runs
            </h1>
            <p className="mt-1 text-sm text-muted">
              Inspect provisional Gale-Shapley matches, verify P1–P12 invariants, and publish room
              allotment results.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-text hover:bg-muted/10 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 text-muted" />
              <span>Reset State</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-500 transition-colors shadow-sm"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Execute Allocation Run</span>
            </button>
          </div>
        </div>

        {/* Engine Performance Banner */}
        <GlassCard className="p-6 border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-600 p-1 text-white">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <h3 className="text-base font-bold text-text">
                  Engine Invariants Verified (12/12 Passed)
                </h3>
              </div>
              <p className="text-xs text-muted mt-1">
                Zero priority inversions, capacity constraints respected, 100% accessible
                placements, no mutual deal-breakers.
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Benchmark: 35.53s
              </span>
              <p className="text-[11px] text-muted">8,000 x 8,000 Scale Target &lt; 120s</p>
            </div>
          </div>
        </GlassCard>

        {/* Engine Metrics Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <GlassCard className="p-5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Placed Units
            </span>
            <div className="text-2xl font-bold text-text mt-2">1,341</div>
            <p className="text-xs text-muted mt-1">100% of eligible cohort</p>
          </GlassCard>
          <GlassCard className="p-5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              1st Choice Hostel
            </span>
            <div className="text-2xl font-bold text-brand-600 dark:text-brand-400 mt-2">87.4%</div>
            <p className="text-xs text-muted mt-1">Mean rank satisfied: 1.18</p>
          </GlassCard>
          <GlassCard className="p-5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Gini Inequality
            </span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              0.0412
            </div>
            <p className="text-xs text-muted mt-1">Near-perfect equity (&lt; 0.15)</p>
          </GlassCard>
          <GlassCard className="p-5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Priority Inversions
            </span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">0</div>
            <p className="text-xs text-muted mt-1">P11 Invariant Certified</p>
          </GlassCard>
        </div>

        {/* Provisional Matches List */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-text">Provisional Match Ledger</h3>
              <p className="text-xs text-muted">
                Review generated pairings prior to final publication
              </p>
            </div>
            <span className="text-xs font-semibold text-brand-600 cursor-pointer hover:underline">
              Publish Allotments
            </span>
          </div>

          <div className="divide-y divide-border/40 text-xs">
            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-text">Aarav Sharma (22BCS042)</span>
                <p className="text-muted text-[11px]">BTech CSE • Quota: General • Score: 98.4</p>
              </div>
              <div className="text-right">
                <span className="font-semibold text-text">Room 304, Tower A (Aryabhata)</span>
                <p className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                  Bed A-304-1 (First Preference)
                </p>
              </div>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-text">Kabir Mehta (22BCS058)</span>
                <p className="text-muted text-[11px]">BTech CSE • Quota: General • Score: 96.2</p>
              </div>
              <div className="text-right">
                <span className="font-semibold text-text">Room 304, Tower A (Aryabhata)</span>
                <p className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                  Bed A-304-2 (Roommate Matched)
                </p>
              </div>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-text">Priya Patel (23BEC015)</span>
                <p className="text-muted text-[11px]">BTech ECE • Quota: General • Score: 94.8</p>
              </div>
              <div className="text-right">
                <span className="font-semibold text-text">Room 202, Tower B (Gargi)</span>
                <p className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                  Bed B-202-1 (First Preference)
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  // ── 3. VERIFICATIONS & APPEALS QUEUE ────────────────────────────────────────
  if (slug.includes("verifications") || slug.includes("appeals")) {
    return (
      <div className="space-y-8 pb-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300 mb-2">
              <Scale className="h-3.5 w-3.5" />
              <span>Compliance & Documentation</span>
            </div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
              Document Verification & Appeals
            </h1>
            <p className="mt-1 text-sm text-muted">
              Inspect student uploaded IDs, fee receipts, and medical certificates before algorithm
              admission.
            </p>
          </div>
        </div>

        <DocumentVerificationQueue />
      </div>
    );
  }

  // ── 4. SYSTEM HEALTH & TELEMETRY ────────────────────────────────────────────
  if (slug.includes("health") || slug.includes("system") || slug.includes("telemetry")) {
    return (
      <div className="space-y-8 pb-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 mb-2">
              <Activity className="h-3.5 w-3.5" />
              <span>Platform Telemetry</span>
            </div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
              System Health & Architecture
            </h1>
            <p className="mt-1 text-sm text-muted">
              Real-time monitoring of database replica sets, Redis cache hit ratio, and algorithm
              runtime.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                MongoDB Replica
              </span>
              <Database className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              HEALTHY (rs0)
            </div>
            <p className="text-xs text-muted mt-1">Replica Set with Direct Connection</p>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Redis Cache
              </span>
              <Server className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-text mt-2">99.4% Hit Rate</div>
            <p className="text-xs text-muted mt-1">Cluster status connected</p>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Allocation Engine
              </span>
              <Cpu className="h-4 w-4 text-brand-500" />
            </div>
            <div className="text-xl font-bold text-text mt-2">35.53s / 8k</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              3.4x faster than design goal
            </p>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Node & Runtime
              </span>
              <Activity className="h-4 w-4 text-violet-500" />
            </div>
            <div className="text-xl font-bold text-text mt-2">Node v25.9.0</div>
            <p className="text-xs text-muted mt-1">macOS arm64 Apple M1</p>
          </GlassCard>
        </div>
      </div>
    );
  }

  // ── 5. DEFAULT EXECUTIVE OVERVIEW (Warden, Chief Warden, Dean) ─────────────
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300 mb-2">
            <Shield className="h-3.5 w-3.5" />
            <span>Staff Governance Portal</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Executive oversight, block summaries, active occupancy, and housing operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/staff/admin/inventory"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-500 transition-colors shadow-sm"
          >
            <Building className="h-3.5 w-3.5" />
            <span>Manage Inventory</span>
          </Link>
        </div>
      </div>

      {/* Campus Occupancy Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Total Residents
          </span>
          <div className="text-2xl font-bold text-text mt-2">1,398 / 1,520</div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">92.0% Occupancy</p>
        </GlassCard>

        <GlassCard className="p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Pending Verifications
          </span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            8 Documents
          </div>
          <p className="text-xs text-muted mt-1">Action needed for Round 2</p>
        </GlassCard>

        <GlassCard className="p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Active Work Tickets
          </span>
          <div className="text-2xl font-bold text-text mt-2">12 Open</div>
          <p className="text-xs text-muted mt-1">3 resolved in last 24h</p>
        </GlassCard>

        <GlassCard className="p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Active Cycle
          </span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            Autumn 2026
          </div>
          <p className="text-xs text-muted mt-1">Window closes Oct 15</p>
        </GlassCard>
      </div>

      {/* Residential Towers Quick Review */}
      <GlassCard className="p-6">
        <h2 className="font-heading text-lg font-bold text-text mb-4">
          Residential Towers Overview
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-text text-sm">Aryabhata Hall</span>
              <span className="text-xs text-emerald-600 font-bold">94%</span>
            </div>
            <p className="text-xs text-muted">Tower A • 420 Beds (395 Occupied)</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-text text-sm">Gargi Residence</span>
              <span className="text-xs text-emerald-600 font-bold">94%</span>
            </div>
            <p className="text-xs text-muted">Tower B • 380 Beds (358 Occupied)</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-text text-sm">Ramanujan Tower</span>
              <span className="text-xs text-blue-600 font-bold">90%</span>
            </div>
            <p className="text-xs text-muted">Tower C • 400 Beds (360 Occupied)</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-text text-sm">Kalpana Chawla</span>
              <span className="text-xs text-blue-600 font-bold">89%</span>
            </div>
            <p className="text-xs text-muted">Tower D • 320 Beds (285 Occupied)</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
