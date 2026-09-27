"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar } from "@/components/ui/filter-bar";
import { FadeIn, FadeUp } from "@/components/ui/motion-primitives";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useWaitlist, usePromoteWaitlist } from "@/hooks/use-mock-api";
import { Users, ArrowUpCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { MockWaitlistEntry } from "@/lib/api/mock/data";

export default function WardenWaitlistPage() {
  const { data: waitlist } = useWaitlist();
  const promoteMutation = usePromoteWaitlist();
  const [selectedStudent, setSelectedStudent] = React.useState<MockWaitlistEntry | null>(null);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = React.useState(false);
  const [promotionReason, setPromotionReason] = React.useState("");
  const [quotaFilter, setQuotaFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const handlePromoteClick = (item: MockWaitlistEntry) => {
    setSelectedStudent(item);
    setPromotionReason(
      "Promoted to vacated bed in Aryabhata Hall following official room transfer.",
    );
    setIsPromoteModalOpen(true);
  };

  const confirmPromotion = () => {
    if (!selectedStudent || promotionReason.trim().length < 10) return;
    promoteMutation.mutate(
      { id: selectedStudent.id, reason: promotionReason.trim() },
      {
        onSuccess: () => {
          toast.success(`Promoted ${selectedStudent.studentName} into active allotment!`);
          setIsPromoteModalOpen(false);
        },
      },
    );
  };

  const filtered = waitlist?.filter((item) => {
    const matchesSearch =
      item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesQuota =
      quotaFilter === "all" || item.quotaBucket.toLowerCase().includes(quotaFilter.toLowerCase());
    return matchesSearch && matchesQuota;
  });

  return (
    <FadeIn className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <FadeUp>
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
          <Users className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          <span>Priority Quota Queue</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl text-foreground">
          Waitlist Management
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Ordered waiting list grouped by quota buckets. When beds are vacated, promote eligible
          candidates in order with audited justification.
        </p>
      </FadeUp>

      {/* Filter and Quota Selector */}
      <FadeUp delay={0.05} className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search waitlisted student or roll number..."
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={quotaFilter}
            onChange={(e) => setQuotaFilter(e.target.value)}
            aria-label="Filter waitlist by quota bucket"
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Quota Buckets</option>
            <option value="general">General Merit</option>
            <option value="pwd">PwD Priority</option>
            <option value="sports">Sports Quota</option>
          </select>
        </div>
      </FadeUp>

      {/* Waitlist Entries */}
      <div className="space-y-4">
        {filtered?.map((item, idx) => (
          <FadeUp key={item.id} delay={0.08 + idx * 0.03}>
            <GlassCard className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 font-heading text-base font-bold text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
                    #{item.position}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-base font-bold text-foreground">
                        {item.studentName}
                      </h3>
                      <span className="font-mono text-xs text-muted-foreground">
                        ({item.rollNo})
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      <span>
                        Quota: <strong className="text-foreground">{item.quotaBucket}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Priority Score:{" "}
                        <strong className="text-foreground">{item.tierScore}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Preferred:{" "}
                        <strong className="text-brand-600 dark:text-brand-400">
                          Aryabhata Hall
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={item.status} />
                  {item.status === "waiting" && (
                    <Button
                      size="sm"
                      onClick={() => handlePromoteClick(item)}
                      className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm"
                    >
                      <ArrowUpCircle className="mr-1.5 h-4 w-4" />
                      Promote Candidate
                    </Button>
                  )}
                </div>
              </div>

              {item.promotedAt && (
                <div className="mt-3.5 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <strong>Promotion Reason:</strong> {item.promotionReason}
                  </div>
                  <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                    By {item.promotedBy}
                  </span>
                </div>
              )}
            </GlassCard>
          </FadeUp>
        ))}
      </div>

      {/* Serious Waitlist Promotion Modal */}
      <Dialog open={isPromoteModalOpen} onOpenChange={setIsPromoteModalOpen}>
        <DialogContent className="sm:max-w-md bg-surface border-border p-6 space-y-4">
          <DialogHeader className="text-left space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
              <ArrowUpCircle className="h-3.5 w-3.5" />
              <span>Waitlist Elevation Protocol</span>
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Promote Candidate: {selectedStudent?.studentName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Promoting a student moves them from the queue into an active draft bed. All actions
              require recorded administrative rationale.
            </DialogDescription>
          </DialogHeader>

          {/* Validation Checks */}
          <div className="rounded-xl border border-border/60 bg-surface-muted/30 p-3 space-y-1.5 text-xs">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Pre-Promotion Invariant Checks</span>
            </div>
            <div className="text-muted-foreground text-[11px] space-y-1">
              <div>
                ✓ Candidate holds highest priority in bucket ({selectedStudent?.quotaBucket})
              </div>
              <div>✓ Academic and financial clearance active</div>
              <div>✓ Target bed capacity available in Aryabhata Hall</div>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <Label htmlFor="promote-reason" className="text-xs font-bold text-foreground">
              Audited Justification Reason *
            </Label>
            <Textarea
              id="promote-reason"
              value={promotionReason}
              onChange={(e) => setPromotionReason(e.target.value)}
              placeholder="State vacant bed ID and promotion justification (min 10 characters)..."
              className="text-xs min-h-[80px] rounded-xl resize-none"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPromoteModalOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={promotionReason.trim().length < 10}
              onClick={confirmPromotion}
              className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold"
            >
              Confirm Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FadeIn>
  );
}
