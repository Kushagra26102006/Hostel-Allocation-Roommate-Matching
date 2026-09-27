"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function WardenApprovalsPage() {
  const [isSignOffModalOpen, setIsSignOffModalOpen] = React.useState(false);
  const [isSignedOff, setIsSignedOff] = React.useState(false);

  const handleSignOff = () => {
    setIsSignedOff(true);
    toast.success(
      "Aryabhata Hall draft approved and submitted to Chief Warden for University Publication!",
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Governance Workflow</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">
          Warden Sign-Off & Approvals
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Confirm that all special accommodations, room disputes, and inventory statuses for
          Aryabhata Hall have been verified.
        </p>
      </div>

      <GlassCard className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">
              Draft #draft-fall-2026-v1
            </h3>
            <p className="text-xs text-muted-foreground">
              Aryabhata Hall (420 Total Beds, 395 Assigned)
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              isSignedOff
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
            }`}
          >
            {isSignedOff ? "Approved by Warden" : "Pending Warden Signature"}
          </span>
        </div>

        {/* Verification Checklist */}
        <div className="space-y-3 text-xs">
          <h4 className="font-heading text-sm font-bold text-foreground">
            Warden Review Checklist:
          </h4>
          {[
            "All medical accessibility & wheelchair requests verified on Ground Floor.",
            "Zero double-allocation or capacity overflow invariants.",
            "Inter-university athletes and teaching assistant room proximity confirmed.",
            "Roommate lifestyle compatibility verified (>70% mean cohort threshold).",
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 rounded-xl bg-surface-muted/40 p-3 border border-border/40"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-foreground font-medium">{item}</span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border/60 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Signer: Prof. S. R. Kulkarni (Warden, Aryabhata Hall)
          </span>

          <Button
            size="lg"
            onClick={() => setIsSignOffModalOpen(true)}
            disabled={isSignedOff}
            className="rounded-xl shadow-md"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            {isSignedOff ? "Signed Off" : "Formally Sign-Off & Submit"}
          </Button>
        </div>
      </GlassCard>

      <ConfirmDialog
        open={isSignOffModalOpen}
        onOpenChange={setIsSignOffModalOpen}
        title="Confirm Formal Warden Sign-Off"
        description="By signing off, you certify that all room allocations for Aryabhata Hall are complete and compliant with university regulations. The draft will be forwarded to the Chief Warden."
        confirmLabel="Certify & Submit to Chief Warden"
        onConfirm={handleSignOff}
      />
    </div>
  );
}
