"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ChecklistDiffReport, ChecklistCondition } from "@hostelhub/domain";

interface CheckoutDiffViewProps {
  diffReport: ChecklistDiffReport;
}

const CONDITION_BADGES: Record<ChecklistCondition, { label: string; className: string }> = {
  good: { label: "Good", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  fair: { label: "Fair", className: "bg-sky-50 text-sky-700 border-sky-200" },
  damaged: { label: "Damaged", className: "bg-amber-50 text-amber-700 border-amber-300" },
  missing: { label: "Missing", className: "bg-rose-50 text-rose-700 border-rose-300" },
};

export function CheckoutDiffView({ diffReport }: CheckoutDiffViewProps) {
  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between ${
          diffReport.hasDamageLiability
            ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200"
            : "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
        }`}
      >
        <div className="flex items-center gap-3">
          {diffReport.hasDamageLiability ? (
            <ShieldAlert className="w-6 h-6 text-rose-500 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
          )}
          <div>
            <h4 className="font-bold text-sm">
              {diffReport.hasDamageLiability
                ? `Damage Liability Flagged (${diffReport.worsenedItems} item${
                    diffReport.worsenedItems > 1 ? "s" : ""
                  } worsened)`
                : "No Damage Discrepancies (Full Security Deposit Clearance)"}
            </h4>
            <p className="text-xs opacity-80">
              {diffReport.hasDamageLiability
                ? "Inspection discovered damaged or missing inventory requiring deposit deduction."
                : "All items returned in original condition or normal wear and tear."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {diffReport.unalteredItems} / {diffReport.totalItems} Intact
          </Badge>
        </div>
      </div>

      {/* Differences List */}
      {diffReport.differences.length > 0 ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md overflow-hidden">
          {diffReport.differences.map((diff) => {
            const inBadge = CONDITION_BADGES[diff.checkInCondition];
            const outBadge = CONDITION_BADGES[diff.checkOutCondition];

            return (
              <div
                key={diff.itemId}
                className={`p-4 space-y-2 transition-colors ${
                  diff.worsened ? "bg-rose-50/30 dark:bg-rose-950/10" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {diff.label}
                    </span>
                    <Badge variant="outline" className="capitalize text-[10px] font-mono">
                      {diff.category}
                    </Badge>
                  </div>

                  {diff.liabilityAssessed && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      Liability Assessed
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Check-In:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${inBadge.className}`}
                    >
                      {inBadge.label}
                    </span>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Check-Out:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${outBadge.className}`}
                    >
                      {outBadge.label}
                    </span>
                  </div>
                </div>

                {/* Notes & Photo comparisons */}
                {(diff.checkInNotes || diff.checkOutNotes || diff.checkOutPhotoUrl) && (
                  <div className="text-xs space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                    {diff.checkInNotes && (
                      <p className="text-slate-500">
                        <span className="font-semibold text-slate-400">Check-In Note:</span>{" "}
                        {diff.checkInNotes}
                      </p>
                    )}
                    {diff.checkOutNotes && (
                      <p className="text-slate-700 dark:text-slate-200">
                        <span className="font-semibold text-slate-400">Check-Out Note:</span>{" "}
                        {diff.checkOutNotes}
                      </p>
                    )}
                    {diff.checkOutPhotoUrl && (
                      <a
                        href={diff.checkOutPhotoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:underline pt-1"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>View Check-Out Photo Evidence</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
          All checklist items are identical between check-in and check-out.
        </div>
      )}
    </div>
  );
}
