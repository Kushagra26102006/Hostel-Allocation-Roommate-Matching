"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Globe, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ChiefWardenPublishPage() {
  const [isPublished, setIsPublished] = React.useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false);

  const handlePublish = () => {
    setIsPublished(true);
    setIsPublishModalOpen(false);
    toast.success(
      "Fall 2026 Hostel Allotments Published Live! Student portals and PDF generators activated.",
    );
  };

  const workflowSteps = [
    {
      title: "Deterministic Draft Generated",
      actor: "Gale-Shapley Algorithm Engine v2.4",
      time: "14 Sept 2026, 09:00 AM",
      hash: "SHA256: 8f9b...a12c",
      status: "completed" as const,
    },
    {
      title: "Warden Exception Review & Overrides",
      actor: "All 5 Residential Wardens",
      time: "14 Sept 2026, 06:30 PM",
      hash: "14 Audited Reassignments Logged",
      status: "completed" as const,
    },
    {
      title: "Executive Council Certification",
      actor: "Prof. S. R. Vardhan (Chief Warden)",
      time: "15 Sept 2026, 11:15 AM",
      hash: "Cryptographic Signature Verified",
      status: "completed" as const,
    },
    {
      title: "University-Wide Live Publication",
      actor: "Chief Warden Authorization",
      time: isPublished ? "15 Sept 2026, 12:00 PM" : "Pending Executive Trigger",
      hash: isPublished ? "Published & Immutable" : "Awaiting Final Sign-Off",
      status: isPublished ? ("completed" as const) : ("current" as const),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-border/60 pb-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
          <Globe className="h-3.5 w-3.5" />
          <span>Final University Release</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Publication &amp; Live Release Console
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted">
          Publication makes room allocations officially visible to all 1,970 applicants, enables QR
          possession letters, and locks the cycle into immutable status.
        </p>
      </div>

      {/* Main Governance Card */}
      <div className="rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 shadow-xs space-y-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">
              Allocation Run #run-fall-2026-prod
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Draft #draft-fall-2026-v1 &bull; 1,850 Assigned, 120 Waitlisted
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold inline-block self-start sm:self-auto ${
              isPublished
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40"
                : "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/40"
            }`}
          >
            {isPublished ? "Live & Published to Campus" : "Approved for Publication"}
          </span>
        </div>

        {/* Visual Timeline of Approval Workflow */}
        <div className="space-y-3">
          <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-muted">
            Governance Approval Timeline:
          </h4>

          <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
            {workflowSteps.map((step, idx) => (
              <div key={idx} className="relative">
                <div
                  className={`absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-surface ${
                    step.status === "completed"
                      ? "bg-emerald-500 text-white"
                      : "bg-brand-500 text-white animate-pulse"
                  }`}
                >
                  {step.status === "completed" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>

                <div className="rounded-xl border border-border/60 bg-surface-muted/30 p-3.5 space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                    <span className="font-bold text-foreground">{step.title}</span>
                    <span className="text-[11px] text-muted font-mono">{step.time}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted pt-0.5">
                    <span>{step.actor}</span>
                    <span className="font-mono text-foreground/80 font-medium">{step.hash}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pre-Publication Verification Checklist */}
        <div className="space-y-2.5 text-xs pt-2">
          <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-muted">
            Pre-Publication Verification Audit:
          </h4>
          {[
            "All 5 Hostel Wardens formally certified room assignments.",
            "Cryptographic SHA-256 Input Snapshot verified: 8f9b4c029...a12c",
            "Zero unresolved priority inversions or gender partition violations.",
            "PDF letter generation queue primed and ready on worker cluster.",
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 rounded-lg bg-surface-muted/40 p-2.5 px-3 border border-border/50"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-foreground/90 font-medium">{item}</span>
            </div>
          ))}
        </div>

        {/* Irreversible Action Warning Box */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-900/40 p-4 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-bold">Important: Publication is Irreversible</strong>
              <p className="leading-relaxed text-amber-800 dark:text-amber-300">
                Once published, room assignments are cryptographically locked and become immediately
                visible to students. Any subsequent adjustments must follow official Room-Change or
                Appeal protocols.
              </p>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <span className="text-xs text-muted">
            Signing Authority: <strong className="text-foreground">Prof. S. R. Vardhan</strong>{" "}
            (Chief Warden)
          </span>

          <Button
            size="lg"
            onClick={() => setIsPublishModalOpen(true)}
            disabled={isPublished}
            className="w-full sm:w-auto bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-sm transition-all duration-180 active:scale-[0.97]"
          >
            <Globe className="mr-2 h-4 w-4" />
            {isPublished ? "Published to Campus" : "Publish Allocations Live"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={isPublishModalOpen}
        onOpenChange={setIsPublishModalOpen}
        title="Confirm University-Wide Publication"
        description="Are you sure you want to publish Fall 2026 hostel allocations? 1,850 students will receive immediate allotment notifications and printable QR possession letters."
        confirmLabel="Yes, Publish Allocations"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handlePublish}
      />
    </div>
  );
}
