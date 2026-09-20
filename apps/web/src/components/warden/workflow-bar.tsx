"use client";

import * as React from "react";
import {
  CheckCircle2,
  Send,
  AlertCircle,
  FileCheck,
  RotateCcw,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PublishWizardModal } from "./publish-wizard-modal";

export type DraftStatus =
  | "GENERATING"
  | "DRAFT_READY"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "PUBLISHED"
  | "FAILED"
  | "DISCARDED"
  | "AMENDED"
  | "ARCHIVED";

interface WorkflowBarProps {
  draftId: string;
  status: DraftStatus;
  version: number;
  onWorkflowUpdated: () => void;
}

export const WorkflowBar: React.FC<WorkflowBarProps> = ({
  draftId,
  status,
  version,
  onWorkflowUpdated,
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isPublishWizardOpen, setIsPublishWizardOpen] = React.useState(false);
  const [isChangesDialogOpen, setIsChangesDialogOpen] = React.useState(false);
  const [changeComment, setChangeComment] = React.useState("");

  const handleTransition = async (action: string, comment?: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/drafts/${draftId}/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "If-Match": `"${version}"`,
        },
        body: JSON.stringify({
          action,
          comment,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || error.message || "Failed to update draft workflow status");
      }

      toast.success(`Workflow transitioned to ${action}`);
      onWorkflowUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transition failed";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "PUBLISHED":
        return <Badge className="bg-emerald-600 hover:bg-emerald-600">Published</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-600 hover:bg-blue-600">Approved by Chief Warden</Badge>;
      case "UNDER_REVIEW":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
            Under Review
          </Badge>
        );
      case "CHANGES_REQUESTED":
        return <Badge variant="destructive">Changes Requested</Badge>;
      case "DRAFT_READY":
      default:
        return <Badge variant="outline">Draft Ready</Badge>;
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-card border rounded-xl shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm">Allocation Workflow</span>
        </div>
        {getStatusBadge()}
        <Badge variant="outline" className="font-mono text-xs">
          v{version}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        {/* State: DRAFT_READY or CHANGES_REQUESTED -> Submit for Approval */}
        {(status === "DRAFT_READY" || status === "CHANGES_REQUESTED") && (
          <Button
            size="sm"
            onClick={() => handleTransition("SUBMIT")}
            disabled={isSubmitting}
            className="gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit for Approval
          </Button>
        )}

        {/* State: UNDER_REVIEW -> Request Changes & Approve */}
        {status === "UNDER_REVIEW" && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsChangesDialogOpen(true)}
              disabled={isSubmitting}
              className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              <RotateCcw className="w-4 h-4" />
              Request Changes
            </Button>
            <Button
              size="sm"
              onClick={() => handleTransition("APPROVE")}
              disabled={isSubmitting}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Approve Draft
            </Button>
          </>
        )}

        {/* State: APPROVED -> Publish Wizard */}
        {status === "APPROVED" && (
          <Button
            size="sm"
            onClick={() => setIsPublishWizardOpen(true)}
            disabled={isSubmitting}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <FileCheck className="w-4 h-4" />
            Publish Allocation...
          </Button>
        )}

        {/* State: PUBLISHED */}
        {status === "PUBLISHED" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Allocation released to students</span>
          </div>
        )}
      </div>

      {/* Changes Requested Dialog */}
      <Dialog open={isChangesDialogOpen} onOpenChange={setIsChangesDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-5 h-5" /> Request Review Changes
            </DialogTitle>
            <DialogDescription>
              Please specify the required changes or constraint fixes. The warden team will be
              notified to make revisions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Textarea
              placeholder="e.g. Please swap room 102 occupants due to medical accessibility priority..."
              value={changeComment}
              onChange={(e) => setChangeComment(e.target.value)}
              className="min-h-[100px] text-xs"
            />
            {changeComment.length < 10 && (
              <p className="text-[11px] text-muted-foreground">
                Minimum 10 characters required ({changeComment.length}/10).
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsChangesDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={changeComment.length < 10 || isSubmitting}
              onClick={() => {
                handleTransition("REQUEST_CHANGES", changeComment);
                setIsChangesDialogOpen(false);
              }}
              variant="destructive"
            >
              Submit Change Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Wizard Modal */}
      <PublishWizardModal
        isOpen={isPublishWizardOpen}
        onClose={() => setIsPublishWizardOpen(false)}
        draftId={draftId}
        draftVersion={version}
        onPublishedSuccess={onWorkflowUpdated}
      />
    </div>
  );
};
