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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";

export interface ManualPromoteTarget {
  id: string; // waitlist entry id
  studentName: string;
  referenceNumber: string;
  priorityScore: number;
  position: number;
}

interface ManualPromoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: ManualPromoteTarget | null;
  onConfirm: (entryId: string, bedId: string, reason: string) => Promise<void>;
}

export function ManualPromoteModal({
  isOpen,
  onClose,
  target,
  onConfirm,
}: ManualPromoteModalProps) {
  const [bedId, setBedId] = React.useState<string>("");
  const [reason, setReason] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (target) {
      setBedId("");
      setReason("");
      setError(null);
    }
  }, [target]);

  const charCount = reason.trim().length;
  const isReasonValid = charCount >= 10;
  const isBedValid = bedId.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (!isReasonValid) {
      setError("Promotion reason must be at least 10 characters.");
      return;
    }
    if (!isBedValid) {
      setError("Please specify a target Bed ID or room bed identifier.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(target.id, bedId.trim(), reason.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to execute manual promotion");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!target) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            Manual Waitlist Promotion
          </DialogTitle>
          <DialogDescription>
            Promote <span className="font-semibold text-foreground">{target.studentName}</span>{" "}
            (Waitlist #{target.position}) into an available hostel bed. If draft is published, an
            amendment version is automatically generated.
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
            <Label htmlFor="target-bed" className="text-xs font-medium">
              Target Bed ID / Identifier <span className="text-destructive">*</span>
            </Label>
            <Input
              id="target-bed"
              placeholder="e.g. 660f9a2b84e5a... or Bed ID"
              value={bedId}
              onChange={(e) => setBedId(e.target.value)}
              className="h-9 font-mono text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="promote-reason" className="text-xs font-medium">
                Mandatory Justification <span className="text-destructive">*</span>
              </Label>
              <span
                className={`text-[11px] font-mono ${
                  isReasonValid ? "text-muted-foreground" : "text-amber-500"
                }`}
              >
                {charCount} / 10 min chars
              </span>
            </div>
            <Textarea
              id="promote-reason"
              rows={3}
              placeholder="e.g. Direct manual promotion approved by Chief Warden following academic year seat vacancy..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs leading-relaxed resize-none"
              required
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
            <Button
              type="submit"
              size="sm"
              disabled={!isReasonValid || !isBedValid || isSubmitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Promoting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm Promotion
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
