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
import { Scale, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface AppealDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId?: string | undefined;
  hostelName: string;
}

export function AppealDialog({
  isOpen,
  onClose,
  assignmentId: _assignmentId,
  hostelName,
}: AppealDialogProps) {
  const [appealType, setAppealType] = React.useState<string>("medical");
  const [appealText, setAppealText] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [isSuccess, setIsSuccess] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (appealText.trim().length < 20) {
      setError("Please describe the nature of your appeal in detail (minimum 20 characters).");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      // Simulate appeal submission to Chief Warden committee
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setAppealText("");
        onClose();
      }, 1600);
    } catch {
      setError(
        "Failed to file appeal. Please try again or contact the Chief Warden office directly.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs mb-1">
            <Scale className="w-4 h-4" />
            Special Housing Appeals Committee
          </div>
          <DialogTitle className="text-lg font-bold text-white">
            File an Allocation Appeal
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Submit a formal grievance or exemption request regarding your allocation to {hostelName}
            . Appeals must be submitted within 72 hours of provisional list publication.
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Appeal Registered</h4>
            <p className="text-xs text-slate-400">
              Your appeal has been escalated to the Chief Warden and Dean of Student Welfare
              committee.
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
              <Label htmlFor="appeal-type" className="text-xs text-slate-300 font-medium">
                Appeal Ground
              </Label>
              <Select value={appealType} onValueChange={setAppealType}>
                <SelectTrigger
                  id="appeal-type"
                  className="bg-slate-950/60 border-slate-800 text-xs"
                >
                  <SelectValue placeholder="Select appeal ground" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="medical">Medical Condition / Ground Floor Need</SelectItem>
                  <SelectItem value="accessibility">
                    Physical Accessibility Accommodation
                  </SelectItem>
                  <SelectItem value="conflict">
                    Documented Interpersonal / Harassment Conflict
                  </SelectItem>
                  <SelectItem value="financial">Fee Exemption / Category Discrepancy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="appeal-text" className="text-xs text-slate-300 font-medium">
                Statement of Grounds
              </Label>
              <Textarea
                id="appeal-text"
                value={appealText}
                onChange={(e) => setAppealText(e.target.value)}
                placeholder="Explain the urgent circumstances and attach medical or academic certificates at physical reporting..."
                className="bg-slate-950/60 border-slate-800 text-xs resize-none h-24"
              />
              <span className="text-[10px] text-slate-500">
                Minimum 20 characters. The committee meets daily during the appeal window.
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
                disabled={isSubmitting || appealText.trim().length < 20}
                className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Filing Appeal...
                  </>
                ) : (
                  "Submit Appeal"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
