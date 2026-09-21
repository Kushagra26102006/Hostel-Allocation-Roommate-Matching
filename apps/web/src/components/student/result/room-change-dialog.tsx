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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeftRight, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface RoomChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoom: string;
  hostelName: string;
}

export function RoomChangeDialog({
  isOpen,
  onClose,
  currentRoom,
  hostelName,
}: RoomChangeDialogProps) {
  const [reasonCategory, setReasonCategory] = React.useState<string>("mutual_swap");
  const [justification, setJustification] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [isSuccess, setIsSuccess] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (justification.trim().length < 15) {
      setError("Please provide a detailed justification (minimum 15 characters).");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      // Simulate submission to room-change workflow endpoint
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setJustification("");
        onClose();
      }, 1600);
    } catch {
      setError("Failed to submit room change request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs mb-1">
            <ArrowLeftRight className="w-4 h-4" />
            Room Allocation Services
          </div>
          <DialogTitle className="text-lg font-bold text-white">Request Room Change</DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Currently allocated to <strong>{currentRoom}</strong> in {hostelName}. Requests are
            reviewed by hostel caretakers according to vacancy and swap rules.
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Request Submitted</h4>
            <p className="text-xs text-slate-400">
              Your room change request ticket has been logged and assigned to the warden review
              queue.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs text-slate-300 font-medium">
                Change Category
              </Label>
              <Select value={reasonCategory} onValueChange={setReasonCategory}>
                <SelectTrigger id="category" className="bg-slate-950/60 border-slate-800 text-xs">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="mutual_swap">Mutual Swap with Another Resident</SelectItem>
                  <SelectItem value="medical">Medical / Floor Level Accommodation</SelectItem>
                  <SelectItem value="study_habits">Schedule or Lifestyle Compatibility</SelectItem>
                  <SelectItem value="other">Other Administrative Reason</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="justification" className="text-xs text-slate-300 font-medium">
                Justification & Details
              </Label>
              <Textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="State your specific reason, partner resident roll number (for mutual swaps), or medical constraints..."
                className="bg-slate-950/60 border-slate-800 text-xs resize-none h-24"
              />
              <span className="text-[10px] text-slate-500">
                Minimum 15 characters. Wardens review tickets within 48 hours.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs border-slate-800 text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || justification.trim().length < 15}
                className="text-xs bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
