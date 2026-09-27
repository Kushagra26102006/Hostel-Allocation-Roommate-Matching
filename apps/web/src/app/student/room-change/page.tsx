"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { StatusBadge } from "@/components/ui/status-badge";
import { FileUploader } from "@/components/ui/file-uploader";
import { useRoomChanges, useCreateRoomChange } from "@/hooks/use-mock-api";
import { RefreshCw, Send } from "lucide-react";
import type { RoomChangeReason } from "@/types";
import { toast } from "sonner";

export default function StudentRoomChangePage() {
  const { data: roomChanges } = useRoomChanges();
  const createChangeMutation = useCreateRoomChange();

  const [formData, setFormData] = React.useState({
    targetHostel: "Ramanujan Tower",
    targetRoomType: "Single AC",
    reasonCategory: "academic_proximity" as RoomChangeReason,
    reasonText: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reasonText.trim()) {
      toast.error("Please provide a reason statement");
      return;
    }

    createChangeMutation.mutate(formData, {
      onSuccess: () => {
        toast.success("Room Change Request submitted to Warden queue!");
        setFormData({ ...formData, reasonText: "" });
      },
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Post-Allocation Reassignment</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">Room Change Request</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Submit formal requests for room swap or hostel transfer with supporting documentation.
        </p>
      </div>

      {/* Active Requests List */}
      {roomChanges && roomChanges.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-heading text-base font-bold text-foreground">
            Active Room Change Requests
          </h3>
          {roomChanges.map((req) => (
            <GlassCard key={req.id} className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-heading text-base font-bold text-foreground">
                      Transfer to {req.targetHostel} ({req.targetRoomType})
                    </h4>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Current Room: {req.currentHostel}
                  </p>
                </div>

                <div className="text-right text-xs text-muted-foreground">
                  <div>Submitted: 25 Sep 2026</div>
                  <div className="text-amber-600 dark:text-amber-400 font-semibold">
                    SLA: 72 hrs response window
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-surface-muted/40 p-3 text-xs text-foreground border border-border/40">
                <span className="font-semibold text-muted-foreground block mb-1">Reason:</span>
                {req.reasonText}
              </div>

              <div className="mt-6 border-t border-border/60 pt-4">
                <span className="text-xs font-bold text-foreground block mb-3">
                  Approval Workflow Progress:
                </span>
                <Timeline items={req.timeline as TimelineItem[]} />
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Submit New Request Form */}
      <GlassCard className="p-6 sm:p-8">
        <h3 className="font-heading text-lg font-bold text-foreground">Submit New Room Change</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          All requests are evaluated by the Warden Council subject to available room inventory.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="targetHostel">Requested Hostel Tower</Label>
              <select
                id="targetHostel"
                value={formData.targetHostel}
                onChange={(e) => setFormData({ ...formData, targetHostel: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-input bg-surface px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Ramanujan Tower">Ramanujan Tower (PG & Research)</option>
                <option value="Aryabhata Hall">Aryabhata Hall (Senior UG)</option>
                <option value="Vikram Sarabhai Hall">Vikram Sarabhai Hall (West Wing)</option>
                <option value="Gargi Residence">Gargi Residence (East Campus)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="reasonCategory">Category of Reason</Label>
              <select
                id="reasonCategory"
                value={formData.reasonCategory}
                onChange={(e) =>
                  setFormData({ ...formData, reasonCategory: e.target.value as RoomChangeReason })
                }
                className="mt-1.5 w-full rounded-xl border border-input bg-surface px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="academic_proximity">Academic & Research Proximity</option>
                <option value="medical">Medical / Health Accommodations</option>
                <option value="roommate_conflict">Roommate Incompatibility</option>
                <option value="special_need">Special Institutional Need</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="reasonText">Detailed Explanation & Statement</Label>
            <Textarea
              id="reasonText"
              rows={4}
              value={formData.reasonText}
              onChange={(e) => setFormData({ ...formData, reasonText: e.target.value })}
              placeholder="State your justification for the room change..."
              className="mt-1.5 text-xs"
            />
          </div>

          <div>
            <Label>Supporting Evidence Document (Optional)</Label>
            <div className="mt-1.5">
              <FileUploader label="Upload doctor certificate, lab endorsement, or proof (PDF, max 5MB)" />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={createChangeMutation.isPending} className="rounded-xl">
              <Send className="mr-2 h-4 w-4" />
              {createChangeMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
