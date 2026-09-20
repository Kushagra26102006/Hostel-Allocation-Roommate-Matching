"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, X, Loader2, Building, BedDouble } from "lucide-react";

export interface PromotionProposalItem {
  id: string;
  draft_id: string;
  waitlist_entry_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  reference_number: string;
  bed_id: string;
  bed_no: string;
  room_id: string;
  room_number: string;
  hostel_id: string;
  hostel_name: string;
  trigger: string;
  status: string;
  created_at: string;
}

interface ProposalsBannerProps {
  proposals: PromotionProposalItem[];
  onConfirm: (proposalId: string) => Promise<void>;
  onReject: (proposalId: string, reason: string) => Promise<void>;
  isProcessing?: boolean;
}

export function ProposalsBanner({
  proposals,
  onConfirm,
  onReject,
  isProcessing = false,
}: ProposalsBannerProps) {
  const [activeActionId, setActiveActionId] = React.useState<string | null>(null);
  const [rejectingProposalId, setRejectingProposalId] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState<string>("");

  if (proposals.length === 0) {
    return null;
  }

  const handleConfirmClick = async (proposalId: string) => {
    setActiveActionId(proposalId);
    try {
      await onConfirm(proposalId);
    } finally {
      setActiveActionId(null);
    }
  };

  const handleRejectSubmit = async (proposalId: string) => {
    if (rejectReason.trim().length < 5) return;
    setActiveActionId(proposalId);
    try {
      await onReject(proposalId, rejectReason.trim());
      setRejectingProposalId(null);
      setRejectReason("");
    } finally {
      setActiveActionId(null);
    }
  };

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-sm font-semibold text-foreground">
            Warden Gate: {proposals.length} Pending Promotion Proposal
            {proposals.length > 1 ? "s" : ""}
          </h3>
        </div>
        <Badge
          variant="outline"
          className="text-[11px] border-amber-500/40 text-amber-600 dark:text-amber-400 font-medium"
        >
          Policy: proposal_required
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {proposals.map((proposal) => {
          const isBusy = activeActionId === proposal.id || isProcessing;
          const isRejecting = rejectingProposalId === proposal.id;

          return (
            <div
              key={proposal.id}
              className="flex flex-col justify-between rounded-lg border bg-card p-3.5 shadow-sm space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{proposal.student_name}</h4>
                    <p className="text-xs text-muted-foreground font-mono">
                      {proposal.reference_number} • {proposal.student_email}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] uppercase font-bold tracking-wider"
                  >
                    {proposal.trigger.replace("_", " ")}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                  <span className="inline-flex items-center gap-1">
                    <Building className="h-3.5 w-3.5 text-primary" />
                    {proposal.hostel_name}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <BedDouble className="h-3.5 w-3.5 text-emerald-500" />
                    Room {proposal.room_number}, Bed {proposal.bed_no}
                  </span>
                </div>
              </div>

              {isRejecting ? (
                <div className="space-y-2 pt-2 border-t">
                  <input
                    type="text"
                    placeholder="Reason for rejecting proposal (min 5 chars)..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full text-xs h-8 px-2 rounded-md border bg-background"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => {
                        setRejectingProposalId(null);
                        setRejectReason("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      disabled={rejectReason.trim().length < 5 || isBusy}
                      onClick={() => handleRejectSubmit(proposal.id)}
                    >
                      Confirm Rejection
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1"
                    disabled={isBusy}
                    onClick={() => setRejectingProposalId(proposal.id)}
                  >
                    <X className="h-3 w-3" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-medium"
                    disabled={isBusy}
                    onClick={() => handleConfirmClick(proposal.id)}
                  >
                    {isBusy ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    Confirm Promotion
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
