"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ShieldAlert, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export interface OverrideTargetInfo {
  assignmentId: string;
  studentName: string;
  rollNumber: string;
  fromBedNo: string;
  fromRoomNumber: string;
  toBedId: string;
  toBedNo: string;
  toRoomNumber: string;
  toRoomAccessible?: boolean;
  toBedAccessible?: boolean;
  escalated?: boolean;
  escalationReasons?: string[];
}

interface OverrideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftId: string;
  draftVersion: number;
  targetInfo: OverrideTargetInfo | null;
  onSuccess: () => void;
}

export function OverrideModal({
  open,
  onOpenChange,
  draftId,
  draftVersion,
  targetInfo,
  onSuccess,
}: OverrideModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!targetInfo) return null;

  const charCount = reason.trim().length;
  const isReasonValid = charCount >= 10;
  const isEscalated =
    targetInfo.escalated ||
    targetInfo.toBedAccessible ||
    targetInfo.toRoomAccessible ||
    (targetInfo.escalationReasons && targetInfo.escalationReasons.length > 0);

  const handleSubmit = async () => {
    if (!isReasonValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/drafts/${draftId}/override`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "If-Match": `"${draftVersion}"`,
        },
        body: JSON.stringify({
          assignmentId: targetInfo.assignmentId,
          toBedId: targetInfo.toBedId,
          reason: reason.trim(),
          expectedVersion: draftVersion,
        }),
      });

      const data = (await res.json()) as { detail?: string; code?: string; success?: boolean };

      if (!res.ok) {
        throw new Error(data.detail || "Failed to execute manual override");
      }

      toast.success("Manual Override Applied", {
        description: `${targetInfo.studentName} successfully moved to Bed ${targetInfo.toBedNo} (Room ${targetInfo.toRoomNumber}).`,
      });

      setReason("");
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Override failed";
      setError(msg);
      toast.error("Override Failed", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-surface border-border p-6 space-y-4">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-lg font-bold text-text flex items-center gap-2">
            <span>Manual Bed Reassignment</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted">
            All manual overrides bump the draft version and are appended to the cryptographic audit
            hash chain.
          </DialogDescription>
        </DialogHeader>

        {/* Movement Summary Card */}
        <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-2.5">
          <div className="text-xs font-semibold text-text">
            {targetInfo.studentName} ({targetInfo.rollNumber})
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-1.5 text-center">
              <span className="text-[10px] text-muted block uppercase">Current Bed</span>
              <span className="font-bold text-text">
                Room {targetInfo.fromRoomNumber} • Bed {targetInfo.fromBedNo}
              </span>
            </div>

            <ArrowRight className="h-4 w-4 text-muted shrink-0" />

            <div className="rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-center">
              <span className="text-[10px] text-brand-600 dark:text-brand-400 block uppercase font-bold">
                Target Bed
              </span>
              <span className="font-bold text-text">
                Room {targetInfo.toRoomNumber} • Bed {targetInfo.toBedNo}
              </span>
            </div>
          </div>
        </div>

        {/* Escalation Maker-Checker Warning */}
        {isEscalated && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Escalated Override (Maker-Checker Trigger)</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              This move involves an accessible bed or quota reservation. Approving this draft will
              require a distinct second approver before publication.
            </p>
          </div>
        )}

        {/* Reason Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="override-reason" className="text-xs font-bold text-text">
              Mandatory Override Reason *
            </Label>
            <span
              className={`text-[11px] font-mono ${
                isReasonValid
                  ? "text-emerald-600 dark:text-emerald-400 font-bold"
                  : "text-amber-600"
              }`}
            >
              {charCount} / 10 min characters
            </span>
          </div>

          <Textarea
            id="override-reason"
            placeholder="Document legitimate administrative, medical, or discipline justification (minimum 10 characters)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-xs min-h-[90px] resize-none"
            aria-required="true"
          />

          {!isReasonValid && charCount > 0 && (
            <p className="text-[11px] text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Please enter at least 10 characters to justify this override.
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={!isReasonValid || isSubmitting}
            onClick={handleSubmit}
            className="bg-brand-600 hover:bg-brand-500 text-white font-bold"
          >
            {isSubmitting ? "Applying Override..." : "Confirm & Bump Version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
