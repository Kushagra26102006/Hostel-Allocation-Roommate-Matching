"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ClipboardCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ChiefWardenApprovalsPage() {
  const [isSignAllModalOpen, setIsSignAllModalOpen] = React.useState(false);

  const handleApproveAll = () => {
    toast.success(
      "All 5 hostel rosters approved. Draft #draft-fall-2026-v1 ready for final publication.",
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200/80 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 dark:border-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
            <ClipboardCheck className="h-3.5 w-3.5" />
            <span>Multi-Tower Verification</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">
            Warden Roster Approvals
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Review Warden sign-offs and change requests across North, East, South, and West campus
            complexes.
          </p>
        </div>

        <Button
          onClick={() => setIsSignAllModalOpen(true)}
          className="rounded-xl bg-purple-600 hover:bg-purple-700"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Certify All Hostels
        </Button>
      </div>

      <div className="space-y-4">
        {[
          {
            name: "Aryabhata Hall (BH-1)",
            warden: "Prof. S. R. Kulkarni",
            changes: "1 Warden Override Applied",
            status: "approved",
          },
          {
            name: "Gargi Residence (GH-1)",
            warden: "Dr. Sunita Deshpande",
            changes: "0 Overrides",
            status: "approved",
          },
          {
            name: "Ramanujan Tower (PG-1)",
            warden: "Prof. V. Raman",
            changes: "2 Research Scholar Pairings",
            status: "approved",
          },
          {
            name: "Kalpana Chawla Hall (GH-2)",
            warden: "Dr. Anita Roy",
            changes: "Awaiting final sign-off",
            status: "submitted",
          },
          {
            name: "Vikram Sarabhai Hall (BH-2)",
            warden: "Prof. A. N. Joshi",
            changes: "1 Sports Quota Override",
            status: "approved",
          },
        ].map((h, i) => (
          <GlassCard key={i} className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-base font-bold text-foreground">{h.name}</h3>
                  <StatusBadge status={h.status} />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Warden: {h.warden} •{" "}
                  <span className="text-foreground font-medium">{h.changes}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="rounded-xl">
                  Inspect Diff
                </Button>
                <Button
                  size="sm"
                  onClick={() => toast.success(`Approved roster for ${h.name}`)}
                  className="rounded-xl"
                >
                  Approve
                </Button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <ConfirmDialog
        open={isSignAllModalOpen}
        onOpenChange={setIsSignAllModalOpen}
        title="Certify All 5 Hostel Rosters"
        description="This will certify all 1,850 student room assignments for Fall 2026. The draft will advance to the final irreversible publication state."
        confirmLabel="Confirm & Advance to Publication"
        onConfirm={handleApproveAll}
      />
    </div>
  );
}
