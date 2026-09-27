"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { FileUploader } from "@/components/ui/file-uploader";
import { useRoomChanges, useCreateRoomChange, useAllocationResult } from "@/hooks/use-mock-api";
import { RefreshCw, Send, Building, CheckCircle2, Clock } from "lucide-react";
import type { RoomChangeReason } from "@/types";
import { toast } from "sonner";

export default function StudentRoomChangePage() {
  const { data: allocation } = useAllocationResult();
  const { data: roomChanges } = useRoomChanges();
  const createChangeMutation = useCreateRoomChange();

  const [formData, setFormData] = React.useState({
    targetHostel: "Ramanujan Tower (Research Enclave)",
    targetRoomType: "Single AC",
    reasonCategory: "academic_proximity" as RoomChangeReason,
    reasonText: "",
    hasUploadedEvidence: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reasonText.trim()) {
      toast.error("Please provide a statement explaining your room change requirement.");
      return;
    }

    createChangeMutation.mutate(formData, {
      onSuccess: () => {
        toast.success("Room change request successfully lodged in the Warden review queue!");
        setFormData((prev) => ({ ...prev, reasonText: "" }));
      },
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-border/60 pb-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Post-Allocation Reassignment Workflow</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Room Change Request
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted">
          Submit formal petitions for room transfers, medical accommodations, or department
          proximity adjustments.
        </p>
      </div>

      {/* Current Room Summary Card */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-foreground">
                Current Residence
              </h3>
              <span className="text-[11px] text-muted">Active Assignment</span>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2.5 py-0.5">
            Allotted
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-surface-muted/40 border border-border/60 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted block">Hostel</span>
            <span className="font-bold text-foreground mt-0.5 block">
              {allocation?.hostelName || "Aryabhata Hall"}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted block">Room &amp; Bed</span>
            <span className="font-bold text-foreground mt-0.5 block">
              Room {allocation?.roomNo || "A-204"} &bull; {allocation?.bedNo || "Bed 1"}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted block">Room Type</span>
            <span className="font-bold text-foreground mt-0.5 block">Double Sharing (AC)</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted block">Block / Floor</span>
            <span className="font-bold text-foreground mt-0.5 block">
              {allocation?.blockName || "Block A"}, Floor {allocation?.floorNo || 2}
            </span>
          </div>
        </div>
      </div>

      {/* Active Requests List with Detailed Timeline & Decision */}
      {roomChanges && roomChanges.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-heading text-base font-bold text-foreground">
            Active Room Change Requests
          </h3>

          {roomChanges.map((req) => (
            <div
              key={req.id}
              className="rounded-3xl border border-border/80 bg-surface p-6 shadow-xs space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-heading text-base font-bold text-foreground">
                      Transfer to {req.targetHostel} ({req.targetRoomType})
                    </h4>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-xs text-muted font-mono mt-0.5">
                    Request ID: <span className="font-bold text-foreground">{req.id}</span> &bull;
                    Submitted 25 Sep 2026
                  </p>
                </div>

                <div className="text-left sm:text-right text-xs">
                  <span className="text-[10px] uppercase font-bold text-muted block">
                    Review SLA
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    72 Hours Guaranteed Window
                  </span>
                </div>
              </div>

              {/* Reason Statement Card */}
              <div className="p-4 rounded-2xl bg-surface-muted/40 border border-border/60 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted block">
                  Statement of Reason:
                </span>
                <p className="text-foreground leading-relaxed">{req.reasonText}</p>
              </div>

              {/* Status Timeline */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted block">
                  Approval Workflow & Status Timeline:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  {req.timeline.map((step, sIdx) => {
                    const isDone = step.status === "completed";
                    const isCurrent = step.status === "current";

                    return (
                      <div
                        key={sIdx}
                        className={`p-3 rounded-2xl border text-xs space-y-1 ${
                          isDone
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                            : isCurrent
                              ? "bg-brand-500/10 border-brand-500/30 text-brand-700 dark:text-brand-300"
                              : "bg-surface-muted/30 border-border/60 text-muted"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          {isDone ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : isCurrent ? (
                            <Clock className="h-3.5 w-3.5 animate-pulse" />
                          ) : (
                            <span className="h-3 w-3 rounded-full border border-border" />
                          )}
                          <span>{step.title}</span>
                        </div>
                        <span className="text-[10px] opacity-80 block">{step.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Warden Review Decision & Feedback Note */}
              <div className="p-4 rounded-2xl bg-brand-50/50 dark:bg-brand-950/40 border border-brand-500/20 text-xs space-y-1">
                <span className="font-bold text-brand-700 dark:text-brand-300 block">
                  Warden Council Reviewer Note:
                </span>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  &quot;Lab TA verification confirmed with Department Head. Single Suite assignment
                  in Ramanujan Tower (Floor 3) is earmarked pending chief warden vacancy
                  sign-off.&quot;
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Room Change Request Form */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="font-heading text-lg font-bold text-foreground">
            Lodge New Room Change Petition
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Petitions are evaluated by the Warden Council based on bed availability and hardship
            criteria.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Hostel Residence *</Label>
              <select
                value={formData.targetHostel}
                onChange={(e) => setFormData({ ...formData, targetHostel: e.target.value })}
                className="w-full h-9 rounded-xl border border-input bg-surface px-3 text-xs text-foreground"
              >
                <option value="Ramanujan Tower (Research Enclave)">
                  Ramanujan Tower (Single AC)
                </option>
                <option value="Vikram Sarabhai Hall (West Campus)">
                  Vikram Sarabhai Hall (Double Regular)
                </option>
                <option value="Gargi Residence (East Campus)">Gargi Residence (Double AC)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason Category *</Label>
              <select
                value={formData.reasonCategory}
                onChange={(e) =>
                  setFormData({ ...formData, reasonCategory: e.target.value as RoomChangeReason })
                }
                className="w-full h-9 rounded-xl border border-input bg-surface px-3 text-xs text-foreground"
              >
                <option value="academic_proximity">Academic Proximity / Research Lab Duty</option>
                <option value="medical">Medical Hardship / Accessibility</option>
                <option value="roommate_conflict">Roommate Compatibility Incompatibility</option>
                <option value="special_need">Special Physical Accommodation</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reasonText" className="text-xs font-semibold">
              Detailed Statement of Reason *
            </Label>
            <Textarea
              id="reasonText"
              rows={4}
              value={formData.reasonText}
              onChange={(e) => setFormData({ ...formData, reasonText: e.target.value })}
              placeholder="State the circumstances necessitating the room transfer (e.g. lab teaching assistantship shifts, documented medical recommendation, etc.)"
              className="text-xs rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">
              Supporting Documentation / Evidence (Optional)
            </Label>
            <div className="p-4 rounded-2xl border border-dashed border-border/80 bg-surface text-center">
              <FileUploader
                onFileSelect={(file) => {
                  if (file) {
                    toast.success(`Attached evidence: ${file.name}`);
                  }
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <Button
              type="submit"
              disabled={createChangeMutation.isPending}
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs min-target-size"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              <span>
                {createChangeMutation.isPending ? "Submitting..." : "Submit Room Change Petition"}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
