"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  ShieldCheck,
  Send,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ChecklistState {
  allOverridesHaveReasons: boolean;
  noHardConflicts: boolean;
  lettersQueued: boolean;
  canPublish: boolean;
  unreasonedOverrideCount?: number;
  conflictCount?: number;
}

interface DiffSummary {
  addedCount: number;
  removedCount: number;
  movedCount: number;
  netChanges: number;
  details?: Array<{
    studentName: string;
    fromBed: string;
    toBed: string;
    reason: string;
  }>;
}

interface PublishWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftId: string;
  draftVersion: number;
  onPublishedSuccess: () => void;
}

export const PublishWizardModal: React.FC<PublishWizardModalProps> = ({
  isOpen,
  onClose,
  draftId,
  draftVersion,
  onPublishedSuccess,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [checklist, setChecklist] = React.useState<ChecklistState>({
    allOverridesHaveReasons: true,
    noHardConflicts: true,
    lettersQueued: true,
    canPublish: true,
  });
  const [diff, setDiff] = React.useState<DiffSummary>({
    addedCount: 0,
    removedCount: 0,
    movedCount: 0,
    netChanges: 0,
  });

  React.useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsLoading(true);

    fetch(`/api/v1/drafts/${draftId}/diff`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load pre-publish diff");
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        if (data.checklist) {
          setChecklist(data.checklist);
        }
        if (data.diffSummary) {
          setDiff(data.diffSummary);
        }
      })
      .catch((err) => {
        toast.error(err.message || "Failed to load pre-publish gate checklist");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, draftId]);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/v1/drafts/${draftId}/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "If-Match": `"${draftVersion}"`,
        },
        body: JSON.stringify({
          action: "PUBLISH",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.message || "Failed to publish allocation draft",
        );
      }

      toast.success("Draft published successfully! Allocation letters queued for release.");
      onPublishedSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Publication failed";
      toast.error(msg);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Publication Wizard &amp; Checklist
          </DialogTitle>
          <DialogDescription>
            Verify all pre-publication invariants and review the revision diff before making this
            allocation public to students.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">
              Validating pre-publish gate checklist...
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2 text-sm">
            {/* Pre-Publish Invariant Checklist */}
            <div className="rounded-lg border bg-muted/30 p-3.5 space-y-2.5">
              <h4 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">
                Pre-Publication Gate Invariants
              </h4>

              {/* Item 1: Overrides Reasoned */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {checklist.allOverridesHaveReasons ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span>All manual overrides have recorded reasons (min 10 chars)</span>
                </div>
                <Badge
                  variant={checklist.allOverridesHaveReasons ? "outline" : "destructive"}
                  className="text-[10px]"
                >
                  {checklist.allOverridesHaveReasons ? "Passed" : "Action Required"}
                </Badge>
              </div>

              {/* Item 2: Zero Hard Constraint Conflicts */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {checklist.noHardConflicts ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span>Zero hard constraint violations across all assigned beds</span>
                </div>
                <Badge
                  variant={checklist.noHardConflicts ? "outline" : "destructive"}
                  className="text-[10px]"
                >
                  {checklist.noHardConflicts ? "Passed" : "Conflict Detected"}
                </Badge>
              </div>

              {/* Item 3: Letters Queued */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {checklist.lettersQueued ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                  <span>Allocation notification letters queued for email dispatch</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-sky-600">
                  <Mail className="w-2.5 h-2.5 mr-1" /> Ready
                </Badge>
              </div>
            </div>

            {/* Version Diff Summary */}
            <div className="rounded-lg border p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">
                  Version Diff Summary (v{draftVersion})
                </h4>
                <Badge variant="secondary" className="text-[10px]">
                  {diff.netChanges} Total Modifications
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded bg-muted/40 border">
                  <span className="block text-xs text-muted-foreground">Moved Students</span>
                  <span className="font-mono font-bold text-sm text-amber-600">
                    {diff.movedCount}
                  </span>
                </div>
                <div className="p-2 rounded bg-muted/40 border">
                  <span className="block text-xs text-muted-foreground">Added Beds</span>
                  <span className="font-mono font-bold text-sm text-emerald-600">
                    +{diff.addedCount}
                  </span>
                </div>
                <div className="p-2 rounded bg-muted/40 border">
                  <span className="block text-xs text-muted-foreground">Unallocated</span>
                  <span className="font-mono font-bold text-sm text-slate-600">
                    {diff.removedCount}
                  </span>
                </div>
              </div>
            </div>

            {!checklist.canPublish && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 text-xs text-red-800 dark:text-red-200">
                <p className="font-semibold">Publication blocked by gate requirements</p>
                <p className="mt-0.5">
                  Resolve all override reasons and hard conflicts before this draft can be
                  published.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isPublishing}>
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={!checklist.canPublish || isLoading || isPublishing}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            {isPublishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Confirm &amp; Publish Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
