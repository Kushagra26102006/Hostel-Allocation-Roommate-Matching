"use client";

import * as React from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Building,
  Users,
  Sparkles,
  Globe,
  BarChart3,
  ClipboardCheck,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { useAllocationRuns } from "@/hooks/use-mock-api";

export default function ChiefWardenDashboardPage() {
  const { data: runs } = useAllocationRuns();
  const run = runs?.[0];

  const hostelStatuses = [
    {
      name: "Aryabhata Hall (BH-1)",
      warden: "Prof. S. R. Kulkarni",
      beds: "395 / 420",
      status: "approved",
    },
    {
      name: "Gargi Residence (GH-1)",
      warden: "Dr. Sunita Deshpande",
      beds: "358 / 380",
      status: "approved",
    },
    {
      name: "Ramanujan Tower (PG-1)",
      warden: "Prof. V. Raman",
      beds: "360 / 400",
      status: "approved",
    },
    {
      name: "Kalpana Chawla Hall (GH-2)",
      warden: "Dr. Anita Roy",
      beds: "285 / 320",
      status: "approved",
    },
    {
      name: "Vikram Sarabhai Hall (BH-2)",
      warden: "Prof. A. N. Joshi",
      beds: "410 / 450",
      status: "approved",
    },
  ];

  const approvedCount = hostelStatuses.filter((h) => h.status === "approved").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Campus Housing Executive Governance</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Chief Warden Oversight Console
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-muted">
            Cycle 2026–27 &bull; Run {run ? `#${run.id}` : "#run-fall-2026-prod"} &bull; 5
            Residential Towers &bull; 1,970 Registered Applicants
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button asChild variant="outline" className="border-border/80">
            <Link href="/chief-warden/analytics">
              <BarChart3 className="mr-1.5 h-4 w-4 text-muted" />
              Fairness Analytics
            </Link>
          </Button>
          <Button
            asChild
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-xs"
          >
            <Link href="/chief-warden/publish">
              <Globe className="mr-1.5 h-4 w-4" />
              Approval &amp; Publish
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Top Bento Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Assigned Capacity"
          value={1850}
          icon={Building}
          variant="brand"
          description="93.9% Campus Occupancy"
        />
        <StatCard
          title="Warden Certifications"
          value={`${approvedCount} / ${hostelStatuses.length}`}
          icon={ClipboardCheck}
          variant="success"
          description="All 5 Hostels Signed Off"
        />
        <StatCard
          title="Mean Compatibility"
          value={87.4}
          suffix="%"
          icon={Users}
          variant="default"
          description="Lifestyle Match Index"
        />
        <StatCard
          title="First-Choice Fulfilled"
          value={81.2}
          suffix="%"
          icon={Sparkles}
          variant="success"
          description="Top preference cohort"
        />
      </div>

      {/* 3. Workflow Progression Strip */}
      <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-brand-600" />
            <h3 className="font-heading text-base font-bold text-foreground">
              Allocation Approval State
            </h3>
          </div>
          <span className="rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-1 text-xs font-bold border border-emerald-200/60 dark:border-emerald-800/40">
            Ready for Live Publication
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          {[
            { step: "1. Draft Generated", desc: "Gale-Shapley Run Complete", state: "done" },
            { step: "2. Warden Review", desc: "5 of 5 Certified", state: "done" },
            { step: "3. Overrides Audited", desc: "14 Minor Reassignments", state: "done" },
            { step: "4. Executive Approved", desc: "Chief Warden Signed", state: "done" },
            { step: "5. Campus Publication", desc: "Awaiting Final Release", state: "current" },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-3 text-xs space-y-1 ${
                item.state === "done"
                  ? "border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-800/40"
                  : "border-brand-500/80 bg-brand-50/60 dark:bg-brand-950/30"
              }`}
            >
              <span className="font-bold text-foreground block">{item.step}</span>
              <span className="text-muted text-[11px] block">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Hostel Certification Governance Table */}
      <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">
              Hostel Wardens Certification Ledger
            </h3>
            <p className="text-xs text-muted">
              All wardens have completed local exception reviews and signed off the allocation
              draft.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link href="/chief-warden/publish">View Formal Audit &rarr;</Link>
          </Button>
        </div>

        <div className="rounded-xl border border-border/60 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted/60 text-muted uppercase font-semibold text-[10px] tracking-wider border-b border-border/60">
              <tr>
                <th className="px-4 py-3">Residence Tower</th>
                <th className="px-4 py-3">Jurisdiction Warden</th>
                <th className="px-4 py-3">Beds Allotted</th>
                <th className="px-4 py-3">Certification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-foreground">
              {hostelStatuses.map((h, i) => (
                <tr key={i} className="hover:bg-surface-muted/40 transition-colors">
                  <td className="px-4 py-3 font-semibold">{h.name}</td>
                  <td className="px-4 py-3 text-muted">{h.warden}</td>
                  <td className="px-4 py-3 font-mono font-medium">{h.beds}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status="approved" label="Certified" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
