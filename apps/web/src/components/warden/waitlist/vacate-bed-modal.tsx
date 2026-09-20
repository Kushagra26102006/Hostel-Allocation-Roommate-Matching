"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, BedDouble, Loader2, Sparkles } from "lucide-react";

interface VacateBedModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftId: string;
  onSuccess: (result: { promotion_result?: { action?: string } }) => void;
}

export function VacateBedModal({ isOpen, onClose, draftId, onSuccess }: VacateBedModalProps) {
  const [bedId, setBedId] = React.useState("");
  const [trigger, setTrigger] = React.useState<
    "withdrawal" | "no_show" | "override_freed" | "appeal_granted" | "room_change_approved"
  >("withdrawal");
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bedId.trim()) {
      setError("Please specify a Bed ID.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/waitlist/vacate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft_id: draftId,
          bed_id: bedId.trim(),
          trigger,
          reason: reason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to vacate bed");
      }

      const data = await res.json();
      onSuccess(data);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error executing vacancy");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BedDouble className="w-5 h-5 text-amber-500" />
            Mark Bed Vacant & Trigger Promotion
          </DialogTitle>
          <DialogDescription>
            Free up an assigned bed due to withdrawal, no-show, or appeal. The pure promotion engine
            will immediately evaluate the waiting list under hard constraints.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-md bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="trigger-type" className="text-xs font-medium">
              Vacancy Trigger
            </Label>
            <Select
              value={trigger}
              onValueChange={(
                val:
                  | "withdrawal"
                  | "no_show"
                  | "override_freed"
                  | "appeal_granted"
                  | "room_change_approved",
              ) => setTrigger(val)}
            >
              <SelectTrigger id="trigger-type" className="h-9 text-xs">
                <SelectValue placeholder="Select trigger" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="withdrawal">Student Withdrawal</SelectItem>
                <SelectItem value="no_show">No-Show Marked by Warden</SelectItem>
                <SelectItem value="override_freed">Override that freed a bed</SelectItem>
                <SelectItem value="appeal_granted">Appeal Outcome</SelectItem>
                <SelectItem value="room_change_approved">Room-change Approval</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vacate-bed" className="text-xs font-medium">
              Bed ID / Identifier <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vacate-bed"
              placeholder="e.g. 660f9a2b84e5a... or Bed ID"
              value={bedId}
              onChange={(e) => setBedId(e.target.value)}
              className="h-9 font-mono text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vacate-reason" className="text-xs font-medium">
              Operational Note
            </Label>
            <Textarea
              id="vacate-reason"
              rows={2}
              placeholder="e.g. Resident failed to report by reporting deadline..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Vacate & Promote
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
