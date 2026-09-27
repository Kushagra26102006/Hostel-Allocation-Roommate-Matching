"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { FadeIn, FadeUp } from "@/components/ui/motion-primitives";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ClipboardCheck, CheckCircle2, ArrowRight, ShieldCheck, Scale, Info } from "lucide-react";
import { toast } from "sonner";
import type { WardenReviewCase } from "@/types";

export default function WardenReviewPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCase, setSelectedCase] = React.useState<WardenReviewCase | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = React.useState(false);
  const [overrideTargetBed, setOverrideTargetBed] = React.useState("A-208 Bed 1");
  const [overrideReason, setOverrideReason] = React.useState("");
  const [isSubmittingOverride, setIsSubmittingOverride] = React.useState(false);

  const reviewQueue: WardenReviewCase[] = [
    {
      id: "rev-01",
      studentName: "Siddharth Rao",
      rollNo: "23CS10090",
      assignedRoom: "A-302 (Bed 1)",
      hostelName: "Aryabhata Hall",
      compatibilityScore: 64,
      reason: "Lifestyle questionnaire indicated night owl studying, but roommate is early bird.",
      status: "pending",
    },
    {
      id: "rev-02",
      studentName: "Dr. Priya Sundaram",
      rollNo: "25PHD001",
      assignedRoom: "A-101 (Bed 1)",
      hostelName: "Aryabhata Hall",
      compatibilityScore: 95,
      reason: "Locomotor PwD disability verified: Assigned to Ground Floor Wheelchair unit.",
      status: "approved",
    },
    {
      id: "rev-03",
      studentName: "Kabir Mehta",
      rollNo: "24ME10023",
      assignedRoom: "A-204 (Bed 2)",
      hostelName: "Aryabhata Hall",
      compatibilityScore: 88,
      reason: "Inter-university Sports Council training curfew override attached.",
      status: "pending",
    },
  ];

  const filteredQueue = reviewQueue.filter(
    (item) =>
      item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.assignedRoom.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleApprove = (item: WardenReviewCase) => {
    toast.success(`Warden sign-off recorded for ${item.studentName}`);
  };

  const handleOpenOverride = (item: WardenReviewCase) => {
    setSelectedCase(item);
    setOverrideReason("");
    setOverrideTargetBed("A-208 Bed 1");
    setIsOverrideModalOpen(true);
  };

  const handleConfirmOverride = () => {
    if (overrideReason.trim().length < 10) return;
    setIsSubmittingOverride(true);
    setTimeout(() => {
      setIsSubmittingOverride(false);
      setIsOverrideModalOpen(false);
      const auditHash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;
      toast.success("Manual Override Applied & Ledger Bumped", {
        description: `${selectedCase?.studentName} reassigned to ${overrideTargetBed}. Cryptographic Audit Ref: ${auditHash}`,
      });
    }, 600);
  };

  return (
    <FadeIn className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <FadeUp>
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
          <ClipboardCheck className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          <span>Draft Allotment Verification</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl text-foreground">
          Warden Review & Overrides Queue
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Examine borderline compatibility assignments, medical priority accommodations, and
          sign-off on room assignments.
        </p>
      </FadeUp>

      <FadeUp delay={0.05}>
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search student name, roll number, room..."
        />
      </FadeUp>

      <div className="space-y-4">
        {filteredQueue.map((item, idx) => (
          <FadeUp key={item.id} delay={0.08 + idx * 0.04}>
            <GlassCard className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-base font-bold text-foreground">
                      {item.studentName}
                    </h3>
                    <span className="text-xs font-mono text-muted-foreground">({item.rollNo})</span>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
                      {item.assignedRoom}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{item.reason}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right mr-2 hidden sm:block">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Compatibility
                    </span>
                    <div
                      className={`font-heading text-sm font-bold ${item.compatibilityScore < 70 ? "text-amber-600" : "text-emerald-600"}`}
                    >
                      {item.compatibilityScore}%
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenOverride(item)}
                    className="rounded-xl"
                  >
                    Reassign Bed
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(item)}
                    className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm"
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Sign-Off
                  </Button>
                </div>
              </div>
            </GlassCard>
          </FadeUp>
        ))}
      </div>

      {/* Serious Administrative Override Dialog */}
      <Dialog open={isOverrideModalOpen} onOpenChange={setIsOverrideModalOpen}>
        <DialogContent className="sm:max-w-xl bg-surface border-border p-6 space-y-5">
          <DialogHeader className="text-left space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
              <Scale className="h-3.5 w-3.5" />
              <span>Administrative Reassignment Protocol</span>
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Manual Bed Override: {selectedCase?.studentName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Overrides permanently bump the draft version and are appended to the cryptographic
              audit hash chain. Casual reassignments are prohibited.
            </DialogDescription>
          </DialogHeader>

          {/* Current vs Proposed Movement Card */}
          <div className="rounded-2xl border border-border/80 bg-surface-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="text-muted-foreground">
                Student ID:{" "}
                <span className="font-mono text-foreground font-semibold">
                  {selectedCase?.rollNo}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                Aryabhata Hall (BH-1)
              </span>
            </div>

            <div className="grid grid-cols-11 items-center gap-2 text-xs">
              {/* Current */}
              <div className="col-span-5 rounded-xl border border-border/70 bg-background/80 p-3 text-center">
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">
                  Current Assignment
                </span>
                <span className="font-bold text-foreground block mt-0.5">
                  {selectedCase?.assignedRoom}
                </span>
                <span className="text-[11px] text-amber-600 font-semibold mt-1 block">
                  Score: {selectedCase?.compatibilityScore}%
                </span>
              </div>

              {/* Arrow */}
              <div className="col-span-1 flex justify-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>

              {/* Target */}
              <div className="col-span-5 rounded-xl border border-brand-500/40 bg-brand-500/10 p-3 text-center">
                <span className="text-[10px] text-brand-700 dark:text-brand-300 block uppercase font-bold">
                  New Assignment
                </span>
                <span className="font-bold text-foreground block mt-0.5">{overrideTargetBed}</span>
                <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                  Projected: 91% (+27%)
                </span>
              </div>
            </div>
          </div>

          {/* Constraint Validation Indicators */}
          <div className="rounded-xl border border-border/60 bg-surface-muted/20 p-3.5 space-y-2 text-xs">
            <div className="font-bold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Real-Time Constraint Pre-Validation</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-600">
                <span>✓</span> Single Occupancy Valid
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600">
                <span>✓</span> Gender Cohort Match
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600">
                <span>✓</span> PwD Quota Untouched
              </div>
            </div>
          </div>

          {/* Target Bed Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="target-bed" className="text-xs font-bold text-foreground">
              Select Vacant Bed in Aryabhata Hall
            </Label>
            <select
              id="target-bed"
              value={overrideTargetBed}
              onChange={(e) => setOverrideTargetBed(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="A-208 Bed 1">
                Room A-208 • Bed 1 (Double Non-AC, Vacant) — Projected Match 91%
              </option>
              <option value="A-312 Bed 2">
                Room A-312 • Bed 2 (Double AC, Vacant) — Projected Match 88%
              </option>
              <option value="A-104 Bed 1">
                Room A-104 • Bed 1 (Single Non-AC, Vacant) — Projected Match 94%
              </option>
            </select>
          </div>

          {/* Mandatory Reason Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="override-justification" className="text-xs font-bold text-foreground">
                Formal Justification Reason *
              </Label>
              <span
                className={`text-[11px] font-mono ${
                  overrideReason.trim().length >= 10
                    ? "text-emerald-600 font-bold"
                    : "text-amber-600"
                }`}
              >
                {overrideReason.trim().length} / 10 min chars
              </span>
            </div>
            <Textarea
              id="override-justification"
              placeholder="State institutional, medical, sports or disciplinary justification for this manual override..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="text-xs min-h-[85px] resize-none rounded-xl"
            />
          </div>

          <DialogFooter className="flex items-center justify-between pt-3 border-t border-border/60">
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              <span>Appends SHA-256 audit entry</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOverrideModalOpen(false)}
                disabled={isSubmittingOverride}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={overrideReason.trim().length < 10 || isSubmittingOverride}
                onClick={handleConfirmOverride}
                className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold"
              >
                {isSubmittingOverride ? "Recording Override..." : "Confirm & Bump Version"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FadeIn>
  );
}
