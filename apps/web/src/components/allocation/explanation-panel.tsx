"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CheckCircle2, ShieldCheck, Sliders, Users, Building } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScoreBreakdownProps {
  preferenceScore?: number | undefined;
  compatibilityScore?: number | undefined;
  fillScore?: number | undefined;
  distanceScore?: number | undefined;
  className?: string | undefined;
}

export function ScoreBreakdown({
  preferenceScore = 100,
  compatibilityScore = 92,
  fillScore = 88,
  distanceScore = 95,
  className,
}: ScoreBreakdownProps) {
  return (
    <div className={cn("space-y-3.5", className)}>
      <div>
        <div className="flex justify-between text-xs font-medium mb-1 text-foreground">
          <span className="flex items-center gap-1.5 text-muted">
            <Sliders className="h-3.5 w-3.5 text-brand-500" />
            Preference Rank Weight (45%)
          </span>
          <strong className="text-brand-600 dark:text-brand-400">{preferenceScore} / 100</strong>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full"
            style={{ width: `${preferenceScore}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs font-medium mb-1 text-foreground">
          <span className="flex items-center gap-1.5 text-muted">
            <Users className="h-3.5 w-3.5 text-emerald-500" />
            Roommate Compatibility (30%)
          </span>
          <strong className="text-emerald-600 dark:text-emerald-400">
            {compatibilityScore} / 100
          </strong>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full"
            style={{ width: `${compatibilityScore}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs font-medium mb-1 text-foreground">
          <span className="flex items-center gap-1.5 text-muted">
            <Building className="h-3.5 w-3.5 text-brand-400" />
            Capacity Fill Optimization (15%)
          </span>
          <strong>{fillScore} / 100</strong>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
          <div className="h-full bg-brand-400 rounded-full" style={{ width: `${fillScore}%` }} />
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs font-medium mb-1 text-foreground">
          <span className="flex items-center gap-1.5 text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-300" />
            Academic Proximity Factor (10%)
          </span>
          <strong>{distanceScore} / 100</strong>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
          <div
            className="h-full bg-brand-300 rounded-full"
            style={{ width: `${distanceScore}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export interface ExplanationPanelProps {
  open: boolean;
  onClose: () => void;
  preferenceRank?: number | undefined;
  hostelName?: string | undefined;
  roomNo?: string | undefined;
  compatibilityScore?: number | undefined;
  tieBreakReason?: string | undefined;
}

export function ExplanationPanel({
  open,
  onClose,
  preferenceRank = 1,
  hostelName = "Aryabhata Hall",
  roomNo = "A-204",
  compatibilityScore = 92,
  tieBreakReason = "Assigned strictly by priority quota; zero random tie-breaks needed.",
}: ExplanationPanelProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-heading text-lg font-bold">
            Why did I receive this room?
          </SheetTitle>
          <SheetDescription className="text-xs text-muted">
            Deterministic Gale-Shapley matching audit explanation and constraint verification
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 text-xs mt-6">
          {/* Summary Box */}
          <div className="rounded-xl border border-brand-200/80 bg-brand-50/50 dark:bg-brand-950/20 dark:border-brand-900/40 p-4 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <ShieldCheck className="h-4 w-4 text-brand-600" />
              <span>Matching Result: Choice #{preferenceRank} Granted</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Your application met all eligibility constraints. You received your #{preferenceRank}{" "}
              preference ({hostelName}, Room {roomNo}) with {compatibilityScore}% roommate
              compatibility.
            </p>
          </div>

          {/* Hard Constraints */}
          <div>
            <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
              Hard Constraints Verified (Pre-Matching)
            </span>
            <ul className="mt-2.5 space-y-2">
              {[
                "Gender & Tower Residency Rules: Verified",
                "Distance Threshold (> 50 km from campus): Verified (850 km)",
                "Academic Department & Year Quota: Verified",
                "Mutual Roommate Consent: Confirmed for both applicants",
                "No Disciplinary Holds on Student Record: Cleared",
              ].map((hc, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-emerald-700 dark:text-emerald-300"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>{hc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Gale-Shapley Scoring Breakdown */}
          <div className="border-t border-border/60 pt-4 space-y-3">
            <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
              Gale-Shapley Score Breakdown
            </span>
            <ScoreBreakdown compatibilityScore={compatibilityScore} />
          </div>

          {/* Audit Note */}
          <div className="rounded-xl bg-surface-muted/50 p-3.5 border border-border/60 text-muted leading-relaxed">
            <strong className="text-foreground block mb-1">Algorithm Governance Note:</strong>
            {tieBreakReason}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
