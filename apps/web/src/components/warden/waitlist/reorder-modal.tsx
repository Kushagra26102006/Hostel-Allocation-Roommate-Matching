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
import { AlertCircle, ArrowUpDown, Loader2 } from "lucide-react";

export interface ReorderTarget {
  id: string;
  studentName: string;
  currentPosition: number;
  maxPosition: number;
}

interface ReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: ReorderTarget | null;
  onConfirm: (entryId: string, newPosition: number, reason: string) => Promise<void>;
}

export function ReorderModal({ isOpen, onClose, target, onConfirm }: ReorderModalProps) {
  const [newPosition, setNewPosition] = React.useState<number>(1);
  const [reason, setReason] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (target) {
      setNewPosition(target.currentPosition);
      setReason("");
      setError(null);
    }
  }, [target]);

  const charCount = reason.trim().length;
  const isReasonValid = charCount >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (!isReasonValid) {
      setError("Reason must be at least 10 characters.");
      return;
    }

    if (newPosition < 1 || newPosition > target.maxPosition) {
      setError(`Position must be between 1 and ${target.maxPosition}.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(target.id, newPosition, reason.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reorder entry");
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
            <ArrowUpDown className="w-5 h-5 text-primary" />
            Reorder Queue Position
          </DialogTitle>
          <DialogDescription>
            Adjust the waiting list priority for{" "}
            <span className="font-semibold text-foreground">{target.studentName}</span>. This action
            is audited and requires a mandatory recorded justification.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-md bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Current Position</Label>
              <div className="h-9 px-3 py-2 bg-muted/50 rounded-md border text-sm font-semibold flex items-center">
                #{target.currentPosition}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-pos" className="text-xs font-medium">
                New Target Position
              </Label>
              <Input
                id="new-pos"
                type="number"
                min={1}
                max={target.maxPosition}
                value={newPosition}
                onChange={(e) => setNewPosition(parseInt(e.target.value, 10) || 1)}
                className="h-9 font-semibold"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="reorder-reason" className="text-xs font-medium">
                Mandatory Reason <span className="text-destructive">*</span>
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
              id="reorder-reason"
              rows={3}
              placeholder="e.g. Dean welfare committee appeal granted on compassionate medical grounds..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs leading-relaxed resize-none"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Required for compliance hash chain audit trail. Must be $\ge$ 10 characters.
            </p>
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
              disabled={!isReasonValid || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Priority"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
