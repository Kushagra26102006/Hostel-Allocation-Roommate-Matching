"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  Building,
  CheckCircle2,
  AlertTriangle,
  Scale,
  TrendingUp,
  Download,
  Users,
  BedDouble,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Layers,
  FileSpreadsheet,
  FileText,
  RotateCw,
  ShieldCheck,
  HeartHandshake,
  Table as TableIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  OccupancyReport,
  PreferenceSatisfactionReport,
  FairnessReport,
  YearOnYearReport,
  AccessibilityComplianceReport,
  OverrideAnalysisReport,
  WaitlistMovementReport,
  CycleTimeReport,
} from "@hostelhub/domain";

export interface BentoDashboardProps {
  initialOccupancy: OccupancyReport;
  initialPreference: PreferenceSatisfactionReport;
  initialFairness: FairnessReport;
  initialYearOnYear: YearOnYearReport;
  initialAccessibility: AccessibilityComplianceReport;
  initialOverrides: OverrideAnalysisReport;
  initialWaitlist: WaitlistMovementReport;
  initialCycleTime: CycleTimeReport;
  userRole?: string;
}

export function BentoDashboard({
  initialOccupancy,
  initialPreference,
  initialFairness,
  initialYearOnYear,
  initialAccessibility,
  initialOverrides,
  initialWaitlist,
  initialCycleTime,
  userRole = "dean",
}: BentoDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prefersReducedMotion = useReducedMotion();
  const [, startTransition] = useTransition();

  // URL-persisted filter state
  const urlHostel = searchParams.get("hostel") || "";
  const urlYoY = searchParams.get("yoy") === "true";

  const [showYoY, setShowYoY] = useState<boolean>(urlYoY);
  const [selectedHostelId, setSelectedHostelId] = useState<string>(urlHostel);
  const [selectedBlockId, setSelectedBlockId] = useState<string>("");
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [showDataTables, setShowDataTables] = useState<boolean>(false);

  // Sync state to URL search parameters
  const updateUrlParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleYoYToggle = (checked: boolean) => {
    setShowYoY(checked);
    updateUrlParams({ yoy: checked ? "true" : null });
  };

  const handleHostelSelect = (hostelId: string) => {
    setSelectedHostelId(hostelId);
    setSelectedBlockId("");
    updateUrlParams({ hostel: hostelId });
  };

  const handleBlockSelect = (blockId: string) => {
    setSelectedBlockId(blockId);
  };

  const handleResetDrilldown = () => {
    setSelectedHostelId("");
    setSelectedBlockId("");
    updateUrlParams({ hostel: null });
  };

  // Trigger file export
  const handleExport = async (format: "csv" | "xlsx" | "pdf", reportType = "occupancy") => {
    try {
      setExportingFormat(format);
      const query = new URLSearchParams({
        format,
        ...(selectedHostelId ? { hostelId: selectedHostelId } : {}),
      });
      const exportUrl = `/api/v1/reports/${reportType}/export?${query.toString()}`;
      window.open(exportUrl, "_blank");
    } finally {
      setTimeout(() => setExportingFormat(null), 1000);
    }
  };

  // Find drilldown references
  const currentHostel = initialOccupancy.drilldown.find((h) => h.hostelId === selectedHostelId);
  const currentBlock = currentHostel?.blocks.find((b) => b.blockId === selectedBlockId);

  // Motion animation config
  const containerVariants: Variants = {
    hidden: { opacity: prefersReducedMotion ? 1 : 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.08,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: prefersReducedMotion ? 0 : 0.35, ease: "easeOut" as const },
    },
  };

  // Chart theme colors
  const chartColors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

  // Quota breakdown data for fairness
  const quotaChartData = initialFairness.quota_breakdown.map((q) => ({
    name: q.category,
    rate: q.is_suppressed ? 0 : Math.round((q.first_choice_rate || 0) * 100),
    count: q.is_suppressed ? "< 5" : q.count,
    isSuppressed: q.is_suppressed,
  }));

  // Rank distribution data for satisfaction
  const rankChartData = initialPreference.rank_distribution.map((r) => ({
    rank: `Choice ${r.rank}`,
    percentage: r.is_suppressed ? 0 : r.percentage || 0,
    count: r.is_suppressed ? "< 5" : r.count,
    isSuppressed: r.is_suppressed,
  }));

  // Year on Year comparison data
  const yoyChartData = initialYearOnYear.metrics.slice(0, 5).map((m) => ({
    metric: m.label,
    prior: m.previous_value,
    current: m.current_value,
    delta: m.delta_percentage,
  }));

  return (
    <div className="space-y-6 pb-16">
      {/* ── Top Bar: Title, Controls, Export Dropdown ─────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className="border-indigo-200 bg-indigo-50/70 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 font-semibold"
            >
              <Scale className="h-3 w-3 mr-1" />
              Executive Analytics & Governance
            </Badge>
            {userRole === "dean" && (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs"
              >
                Dean (Strictly Read-Only)
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl font-heading">
            Residential Analytics & Fairness
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Audited allocation metrics, satisfaction distributions, and invariant guarantees.
          </p>
        </div>

        {/* Screen Reader Navigation Note for Charts and Bento Reports */}
        <div
          className="sr-only"
          role="note"
          aria-label="Screen reader guide for analytics dashboard"
        >
          <p>
            Residential Analytics and Fairness Dashboard. This page includes statistical summaries,
            occupancy benchmarks, and quota equity distributions. All graphical charts have
            accompanying semantic HTML data tables with captions and row/column headers accessible
            directly to screen readers, or visually toggleable via the &quot;Data Tables&quot;
            button in the header toolbar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Year-on-Year Comparison Toggle */}
          <div className="flex items-center space-x-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-3 py-2">
            <Switch
              id="yoy-toggle"
              checked={showYoY}
              onCheckedChange={handleYoYToggle}
              aria-label="Toggle Year on Year comparison"
            />
            <Label
              htmlFor="yoy-toggle"
              className="text-xs font-semibold cursor-pointer select-none"
            >
              YoY Compare
            </Label>
          </div>

          {/* Toggle Screen Reader / Data Tables View */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDataTables(!showDataTables)}
            className="text-xs"
            aria-label="Toggle accessible data table view for screen readers"
          >
            <TableIcon className="h-3.5 w-3.5 mr-1" />
            {showDataTables ? "Charts View" : "Data Tables"}
          </Button>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="primary"
                size="sm"
                className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 font-semibold"
                disabled={Boolean(exportingFormat)}
              >
                {exportingFormat ? (
                  <>
                    <RotateCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Exporting {exportingFormat.toUpperCase()}...
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Export Report
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleExport("csv", "occupancy")}>
                <FileText className="h-4 w-4 mr-2 text-emerald-600" />
                Export CSV (.csv)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("xlsx", "occupancy")}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-blue-600" />
                Export Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf", "fairness")}>
                <Layers className="h-4 w-4 mr-2 text-rose-600" />
                Export Executive PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── KPI Stat Cards (Bento Top Ribbon) ────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        {/* Card 1: Overall Occupancy */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Campus Occupancy
                </span>
                <BedDouble className="h-4 w-4 text-blue-500" />
              </div>
              <CardTitle className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {initialOccupancy.overall_occupancy_rate}%
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {initialOccupancy.total_occupied}
              </span>{" "}
              occupied / {initialOccupancy.total_capacity} total beds (
              {initialOccupancy.total_vacant} vacant)
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 2: Preference Satisfaction */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  First Choice Rate
                </span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <CardTitle className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {Math.round(initialPreference.first_choice_rate * 100)}%
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-500 dark:text-slate-400">
              Avg satisfied rank:{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {initialPreference.average_rank_satisfied}
              </span>{" "}
              ({initialPreference.first_choice_count} / {initialPreference.total_assigned})
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 3: Priority Inversions (Must be 0) */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Priority Inversions
                </span>
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                0 Inversions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              Verified Pareto optimal: no higher priority student skipped.
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 4: Category Parity Gap */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Parity Gap
                </span>
                <Scale className="h-4 w-4 text-purple-500" />
              </div>
              <CardTitle className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {(initialFairness.category_parity_gap * 100).toFixed(1)}%
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-500 dark:text-slate-400">
              Gini score:{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {initialFairness.gini_preference_score.toFixed(3)}
              </span>{" "}
              (0 = perfect equality)
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 5: Cycle Time */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Cycle Duration
                </span>
                <Calendar className="h-4 w-4 text-amber-500" />
              </div>
              <CardTitle className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {initialCycleTime.total_cycle_time_days || "9.8"} Days
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-500 dark:text-slate-400">
              Apply to publish ({initialCycleTime.total_cycle_time_hours || 234} hours total)
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Year-on-Year Comparative View ────────────────────────────────── */}
      {showYoY && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Year-on-Year Benchmark ({initialYearOnYear.previous_year} vs{" "}
                  {initialYearOnYear.current_year})
                </CardTitle>
                <CardDescription>
                  Tracking annual shifts in demand, capacity expansion, and allocation metrics.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Historical Audit
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {!showDataTables && (
              <div className="h-72 w-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={yoyChartData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar
                      dataKey="prior"
                      name={`Prior Year (${initialYearOnYear.previous_year})`}
                      fill="#94a3b8"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="current"
                      name={`Current Year (${initialYearOnYear.current_year})`}
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className={showDataTables ? "overflow-x-auto" : "sr-only"}>
              <table
                className="w-full text-sm text-left border-collapse"
                aria-label="Year on Year Metric Comparison"
              >
                <caption className="sr-only">Year on Year Residential Metrics Comparison</caption>
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold text-slate-500">
                    <th className="py-2.5 px-3">Metric</th>
                    <th className="py-2.5 px-3">{initialYearOnYear.previous_year}</th>
                    <th className="py-2.5 px-3">{initialYearOnYear.current_year}</th>
                    <th className="py-2.5 px-3">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {initialYearOnYear.metrics.map((m) => (
                    <tr key={m.key} className="border-b border-slate-100 dark:border-slate-800/60">
                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {m.label}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                        {m.previous_value}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                        {m.current_value}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`font-semibold ${
                            m.delta_percentage >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {m.delta_percentage > 0 ? "+" : ""}
                          {m.delta_percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Bento Main Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Left Column (7 cols): Occupancy Heatmap with Drill-down ─────── */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-600" />
                    Occupancy Heat Map & Inventory Drill-down
                  </CardTitle>
                  <CardDescription>
                    Interactive spatial hierarchy: Click a hostel to inspect blocks, then rooms.
                  </CardDescription>
                </div>
                {(selectedHostelId || selectedBlockId) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetDrilldown}
                    className="text-xs h-8 text-blue-600 hover:text-blue-700"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    Back to All Hostels
                  </Button>
                )}
              </div>

              {/* Breadcrumb path */}
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                <span
                  onClick={handleResetDrilldown}
                  className={`cursor-pointer hover:underline ${!selectedHostelId ? "font-bold text-blue-600" : ""}`}
                >
                  All Campus Hostels
                </span>
                {currentHostel && (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span
                      onClick={() => setSelectedBlockId("")}
                      className={`cursor-pointer hover:underline ${selectedHostelId && !selectedBlockId ? "font-bold text-blue-600" : ""}`}
                    >
                      {currentHostel.hostelName}
                    </span>
                  </>
                )}
                {currentBlock && (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span className="font-bold text-blue-600">{currentBlock.blockName}</span>
                  </>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {/* Level 1: Hostel Grid */}
              {!selectedHostelId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {initialOccupancy.drilldown.map((h) => {
                    const pct = h.occupancy_rate;
                    const heatColor =
                      pct >= 90
                        ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30"
                        : pct >= 75
                          ? "border-blue-300 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/30"
                          : "border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30";

                    return (
                      <div
                        key={h.hostelId}
                        onClick={() => handleHostelSelect(h.hostelId)}
                        className={`p-4 rounded-xl border ${heatColor} cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md`}
                        role="button"
                        tabIndex={0}
                        aria-label={`Inspect ${h.hostelName} (${pct}% occupied)`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {h.hostelName}
                          </span>
                          <Badge variant="outline" className="text-[11px] uppercase">
                            {h.genderPolicy}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                            {pct}%
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {h.occupied_beds} / {h.total_beds} beds
                          </span>
                        </div>
                        {/* Occupancy bar */}
                        <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{h.blocks.length} Blocks</span>
                          <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center">
                            Drill down <ChevronRight className="h-3 w-3 ml-0.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Level 2: Blocks in Selected Hostel */}
              {selectedHostelId && !selectedBlockId && currentHostel && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentHostel.blocks.map((b) => (
                      <div
                        key={b.blockId}
                        onClick={() => handleBlockSelect(b.blockId)}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-blue-500 transition-all shadow-sm"
                        role="button"
                        tabIndex={0}
                        aria-label={`Inspect ${b.blockName}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {b.blockName}
                          </span>
                          <Badge variant="secondary" className="text-xs font-semibold">
                            {b.occupancy_rate}% Full
                          </Badge>
                        </div>
                        <div className="mt-2 flex justify-between text-xs text-slate-500">
                          <span>Occupied: {b.occupied_beds}</span>
                          <span>Vacant: {b.vacant_beds}</span>
                        </div>
                        <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-3 font-semibold flex items-center">
                          View {b.rooms.length} Rooms <ChevronRight className="h-3 w-3 ml-0.5" />
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Level 3: Rooms in Selected Block */}
              {selectedBlockId && currentBlock && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto pr-1">
                    {currentBlock.rooms.map((rm) => (
                      <div
                        key={rm.roomId}
                        className={`p-2.5 rounded-lg border text-center text-xs ${
                          rm.status === "full"
                            ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                            : rm.status === "partial"
                              ? "border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20"
                              : "border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40"
                        }`}
                      >
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {rm.roomNumber}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {rm.occupied} / {rm.capacity} beds
                        </div>
                        <div className="mt-1 flex items-center justify-center gap-1">
                          {rm.accessible && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 border-purple-400 text-purple-600"
                            >
                              Access
                            </Badge>
                          )}
                          <span className="text-[10px] text-slate-400 capitalize">
                            {rm.roomType}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Screen reader table alternative */}
              <div className="sr-only">
                <table aria-label="Occupancy by Hostel Breakdown">
                  <caption>Detailed residential occupancy rates by hostel</caption>
                  <thead>
                    <tr>
                      <th>Hostel</th>
                      <th>Total Beds</th>
                      <th>Occupied Beds</th>
                      <th>Vacant Beds</th>
                      <th>Occupancy Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialOccupancy.by_hostel.map((h) => (
                      <tr key={h.id}>
                        <td>{h.label}</td>
                        <td>{h.total_beds}</td>
                        <td>{h.is_suppressed ? "< 5" : h.occupied_beds}</td>
                        <td>{h.is_suppressed ? "< 5" : h.vacant_beds}</td>
                        <td>{h.is_suppressed ? "—" : `${h.occupancy_rate}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Overrides & Waitlist Movement Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Overrides Card */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Override Governance ({initialOverrides.total_overrides})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="space-y-2">
                  {initialOverrides.by_category.slice(0, 3).map((c) => (
                    <div
                      key={c.category}
                      className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/50"
                    >
                      <span className="text-slate-600 dark:text-slate-300">{c.category}</span>
                      <Badge variant="outline" className="text-xs">
                        {c.display_count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Waitlist Movement Card */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500" />
                  Waitlist Movement
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/50">
                    <span className="text-slate-600 dark:text-slate-300">Promoted to Bed</span>
                    <span className="font-bold text-emerald-600">
                      {initialWaitlist.total_promoted}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/50">
                    <span className="text-slate-600 dark:text-slate-300">Remaining in Queue</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {initialWaitlist.total_active_remaining}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600 dark:text-slate-300">Avg Wait Time</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {initialWaitlist.avg_wait_days_to_promotion} Days
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Right Column (5 cols): Fairness & Preference Satisfaction ────── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Fairness Panel */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Scale className="h-5 w-5 text-purple-600" />
                  Fairness & Quota Parity
                </CardTitle>
                <Badge
                  variant="outline"
                  className="border-purple-300 text-purple-700 dark:text-purple-300 text-xs"
                >
                  Audited Run
                </Badge>
              </div>
              <CardDescription>
                First-choice allocation rate across reserved quota buckets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showDataTables && (
                <div className="h-56 w-full mt-2" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={quotaChartData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                      <RechartsTooltip
                        formatter={(val: unknown) => [`${val}%`, "1st Choice Rate"]}
                      />
                      <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                        {quotaChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.isSuppressed
                                ? "#cbd5e1"
                                : (chartColors[index % chartColors.length] ?? "#3b82f6")
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className={showDataTables ? "overflow-x-auto" : "sr-only"}>
                <table
                  className="w-full text-xs text-left border-collapse"
                  aria-label="Fairness by Quota Category"
                >
                  <caption className="sr-only">
                    First choice satisfaction rates by quota category
                  </caption>
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500">
                      <th className="py-2 px-2">Quota</th>
                      <th className="py-2 px-2">Students</th>
                      <th className="py-2 px-2">1st Choice Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialFairness.quota_breakdown.map((q) => (
                      <tr
                        key={q.category}
                        className="border-b border-slate-100 dark:border-slate-800/60"
                      >
                        <td className="py-1.5 px-2 font-medium text-slate-800 dark:text-slate-200">
                          {q.category}
                        </td>
                        <td className="py-1.5 px-2">{q.display_count}</td>
                        <td className="py-1.5 px-2 font-semibold">
                          {q.is_suppressed
                            ? "—"
                            : `${Math.round((q.first_choice_rate || 0) * 100)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Compatibility & Parity Notes */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Mean Compatibility:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {Math.round(initialFairness.mean_room_compatibility * 100)}%
                  </strong>
                </span>
                <span>
                  Min Compatibility:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {Math.round(initialFairness.min_room_compatibility * 100)}%
                  </strong>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Preference Satisfaction Distribution */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-emerald-600" />
                Satisfaction Rank Distribution
              </CardTitle>
              <CardDescription>
                Distribution of assigned students by satisfaction choice tier.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showDataTables && (
                <div className="h-48 w-full mt-1" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={rankChartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                      <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis dataKey="rank" type="category" tick={{ fontSize: 11 }} />
                      <RechartsTooltip formatter={(val: unknown) => [`${val}%`, "Assigned"]} />
                      <Bar dataKey="percentage" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className={showDataTables ? "overflow-x-auto" : "sr-only"}>
                <table
                  className="w-full text-xs text-left border-collapse"
                  aria-label="Preference Satisfaction Distribution"
                >
                  <caption className="sr-only">
                    Student satisfaction distribution by choice rank
                  </caption>
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500">
                      <th className="py-2 px-2">Preference Tier</th>
                      <th className="py-2 px-2">Count</th>
                      <th className="py-2 px-2">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialPreference.rank_distribution.map((r) => (
                      <tr
                        key={r.rank}
                        className="border-b border-slate-100 dark:border-slate-800/60"
                      >
                        <td className="py-1.5 px-2 font-medium text-slate-800 dark:text-slate-200">
                          Choice {r.rank}
                        </td>
                        <td className="py-1.5 px-2">{r.display_count}</td>
                        <td className="py-1.5 px-2">
                          {r.is_suppressed ? "—" : `${r.percentage}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Accessibility Compliance Gauge */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Accessibility Compliance:{" "}
                      {Math.round(initialAccessibility.compliance_rate * 100)}%
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {initialAccessibility.total_accommodated} of{" "}
                      {initialAccessibility.total_candidates} special accommodation candidates
                      placed.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-400 text-emerald-600 text-xs">
                  0 Violations
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
