"use client";

import * as React from "react";
import { WaitlistTable, type WaitlistEntryItem } from "@/components/warden/waitlist/waitlist-table";
import { ReorderModal, type ReorderTarget } from "@/components/warden/waitlist/reorder-modal";
import {
  ManualPromoteModal,
  type ManualPromoteTarget,
} from "@/components/warden/waitlist/manual-promote-modal";
import {
  ProposalsBanner,
  type PromotionProposalItem,
} from "@/components/warden/waitlist/proposals-banner";
import {
  PromotionTimeline,
  type PromotionEvent,
} from "@/components/warden/waitlist/promotion-timeline";
import { ReconcileModal } from "@/components/warden/waitlist/reconcile-modal";
import { VacateBedModal } from "@/components/warden/waitlist/vacate-bed-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ListOrdered,
  RefreshCw,
  Search,
  Scale,
  BedDouble,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export default function WardenWaitlistPage() {
  const [entries, setEntries] = React.useState<WaitlistEntryItem[]>([]);
  const [proposals, setProposals] = React.useState<PromotionProposalItem[]>([]);
  const [timelineEvents, setTimelineEvents] = React.useState<PromotionEvent[]>([]);
  const [draftId, setDraftId] = React.useState<string | null>(null);
  const [policy, setPolicy] = React.useState<"auto_confirm" | "proposal_required">("auto_confirm");
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successToast, setSuccessToast] = React.useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [quotaFilter, setQuotaFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Modals state
  const [reorderTarget, setReorderTarget] = React.useState<ReorderTarget | null>(null);
  const [promoteTarget, setPromoteTarget] = React.useState<ManualPromoteTarget | null>(null);
  const [isReconcileOpen, setIsReconcileOpen] = React.useState<boolean>(false);
  const [isVacateOpen, setIsVacateOpen] = React.useState<boolean>(false);

  const fetchWaitlistData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const waitlistRes = await fetch("/api/v1/waitlist");
      if (!waitlistRes.ok) {
        throw new Error("Failed to load waiting list entries");
      }
      const waitlistData = await waitlistRes.json();
      setEntries(waitlistData.entries || []);
      setDraftId(waitlistData.draft_id);
      if (waitlistData.cycle_policy) {
        setPolicy(waitlistData.cycle_policy);
      }

      // Fetch pending proposals
      const propRes = await fetch("/api/v1/waitlist/proposals?status=pending");
      if (propRes.ok) {
        const propData = await propRes.json();
        setProposals(propData.proposals || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading waiting list");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchWaitlistData();
  }, [fetchWaitlistData]);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Reorder queue handler
  const handleConfirmReorder = async (entryId: string, newPosition: number, reason: string) => {
    if (!draftId) return;
    const res = await fetch("/api/v1/waitlist/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draft_id: draftId,
        waitlist_entry_id: entryId,
        new_position: newPosition,
        reason,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update queue position");
    }

    showNotification(`Priority updated to #${newPosition} with audit reason recorded.`);
    await fetchWaitlistData();
  };

  // Manual promote handler
  const handleConfirmManualPromote = async (entryId: string, bedId: string, reason: string) => {
    if (!draftId) return;
    const res = await fetch(`/api/v1/waitlist/${entryId}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draft_id: draftId,
        bed_id: bedId,
        reason,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Manual promotion failed");
    }

    const data = await res.json();
    const student = entries.find((e) => e.id === entryId);

    // Record timeline event
    setTimelineEvents((prev) => [
      {
        id: `ev-${Date.now()}`,
        studentName: student?.student_name ?? "Student",
        referenceNumber: student?.reference_number ?? "REF",
        bedName: bedId.substring(0, 6),
        roomNumber: "Room Assigned",
        hostelName: "Hostel",
        trigger: "manual",
        policy: "manual",
        timestamp: new Date().toISOString(),
        actor: "Warden",
        ...(data.amended_draft_id ? { amendmentVersion: 2 } : {}),
      },
      ...prev,
    ]);

    showNotification("Student promoted successfully!");
    await fetchWaitlistData();
  };

  // Proposal confirmation handler
  const handleConfirmProposal = async (proposalId: string) => {
    const res = await fetch(`/api/v1/waitlist/proposals/${proposalId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: "Approved by warden review" }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to confirm proposal");
    }

    const proposal = proposals.find((p) => p.id === proposalId);
    if (proposal) {
      setTimelineEvents((prev) => [
        {
          id: `ev-${Date.now()}`,
          studentName: proposal.student_name,
          referenceNumber: proposal.reference_number,
          bedName: proposal.bed_no,
          roomNumber: proposal.room_number,
          hostelName: proposal.hostel_name,
          trigger: proposal.trigger,
          policy: "proposal_required",
          timestamp: new Date().toISOString(),
          actor: "Warden Gate Approval",
        },
        ...prev,
      ]);
    }

    showNotification("Promotion proposal confirmed and bed assigned.");
    await fetchWaitlistData();
  };

  // Proposal rejection handler
  const handleRejectProposal = async (proposalId: string, reason: string) => {
    const res = await fetch(`/api/v1/waitlist/proposals/${proposalId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to reject proposal");
    }

    showNotification("Promotion proposal rejected. Candidate remains waiting.");
    await fetchWaitlistData();
  };

  // Vacate success callback
  const handleVacateSuccess = (data: { promotion_result?: { action?: string } }) => {
    const res = data.promotion_result;
    if (res?.action === "promoted") {
      showNotification(`Bed vacated: student promoted automatically under auto_confirm policy.`);
    } else if (res?.action === "proposal_created") {
      showNotification(`Bed vacated: promotion proposal generated for warden gate review.`);
    } else {
      showNotification(`Bed vacated. No feasible waitlist candidate found.`);
    }
    fetchWaitlistData();
  };

  // Filter entries
  const filteredEntries = React.useMemo(() => {
    return entries.filter((item) => {
      if (quotaFilter !== "all" && item.quota_bucket !== quotaFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.student_name.toLowerCase().includes(q);
        const matchRef = item.reference_number.toLowerCase().includes(q);
        const matchEmail = item.student_email.toLowerCase().includes(q);
        if (!matchName && !matchRef && !matchEmail) return false;
      }
      return true;
    });
  }, [entries, quotaFilter, statusFilter, searchQuery]);

  // Unique quota buckets
  const quotaBuckets = React.useMemo(() => {
    const set = new Set(entries.map((e) => e.quota_bucket));
    return Array.from(set);
  }, [entries]);

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-6">
      {/* Header & Policy Switch Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ListOrdered className="w-6 h-6 text-primary" />
              Waiting List & Automatic Promotion
            </h1>
            <Badge
              variant="outline"
              className={`text-xs font-semibold px-2.5 py-0.5 ${
                policy === "auto_confirm"
                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  : "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
              }`}
            >
              Policy:{" "}
              {policy === "auto_confirm"
                ? "⚡ Auto-Confirm Promotion"
                : "🛡️ Warden Proposal Required"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Priority queue evaluated under hard constraints (group integrity, accessibility, gender
            wings). Vacated beds trigger pure candidate selection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsReconcileOpen(true)}
            className="gap-1.5 text-xs font-medium"
          >
            <Scale className="w-3.5 h-3.5 text-primary" />
            Reconcile Occupancy
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVacateOpen(true)}
            className="gap-1.5 text-xs font-medium"
          >
            <BedDouble className="w-3.5 h-3.5 text-amber-500" />
            Simulate Vacancy
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchWaitlistData}
            disabled={isLoading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Toast message */}
      {successToast && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Proposals Banner if policy is proposal_required and proposals exist */}
      <ProposalsBanner
        proposals={proposals}
        onConfirm={handleConfirmProposal}
        onReject={handleRejectProposal}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student name, roll, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={quotaFilter} onValueChange={setQuotaFilter}>
            <SelectTrigger className="h-9 text-xs w-[140px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quotas</SelectItem>
              {quotaBuckets.map((q) => (
                <SelectItem key={q} value={q}>
                  {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs w-[140px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="waiting">Waiting Only</SelectItem>
              <SelectItem value="proposal_pending">Proposals Pending</SelectItem>
              <SelectItem value="promoted">Promoted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Waitlist Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs">Loading waiting list queue...</p>
        </div>
      ) : (
        <WaitlistTable
          entries={filteredEntries}
          onOpenReorder={(entry) =>
            setReorderTarget({
              id: entry.id,
              studentName: entry.student_name,
              currentPosition: entry.position,
              maxPosition: entries.length,
            })
          }
          onOpenManualPromote={(entry) =>
            setPromoteTarget({
              id: entry.id,
              studentName: entry.student_name,
              referenceNumber: entry.reference_number,
              priorityScore: entry.priority_score,
              position: entry.position,
            })
          }
        />
      )}

      {/* Promotion History Timeline */}
      <PromotionTimeline events={timelineEvents} />

      {/* Reorder Modal with Mandatory Reason */}
      <ReorderModal
        isOpen={Boolean(reorderTarget)}
        onClose={() => setReorderTarget(null)}
        target={reorderTarget}
        onConfirm={handleConfirmReorder}
      />

      {/* Manual Promote Modal */}
      <ManualPromoteModal
        isOpen={Boolean(promoteTarget)}
        onClose={() => setPromoteTarget(null)}
        target={promoteTarget}
        onConfirm={handleConfirmManualPromote}
      />

      {/* Simulate Vacancy Modal */}
      <VacateBedModal
        isOpen={isVacateOpen}
        onClose={() => setIsVacateOpen(false)}
        draftId={draftId || ""}
        onSuccess={handleVacateSuccess}
      />

      {/* Reconcile Occupancy Modal */}
      {draftId && (
        <ReconcileModal
          isOpen={isReconcileOpen}
          onClose={() => setIsReconcileOpen(false)}
          hostelId={entries[0]?.draft_id ? "all" : "hostel"}
          draftId={draftId}
          hostelName="Hostel Blocks"
        />
      )}
    </div>
  );
}
