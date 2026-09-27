"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { FileUploader } from "@/components/ui/file-uploader";
import { useAppeals, useCreateAppeal, useAllocationResult } from "@/hooks/use-mock-api";
import { Scale, Send, CheckCircle2, Clock } from "lucide-react";
import type { AppealCategory } from "@/types";
import { toast } from "sonner";

export default function StudentAppealsPage() {
  const { data: allocation } = useAllocationResult();
  const { data: appeals } = useAppeals();
  const createAppealMutation = useCreateAppeal();

  const [statement, setStatement] = React.useState("");
  const [category, setCategory] = React.useState<AppealCategory>("distance_hardship");
  const [allocationRef, setAllocationRef] = React.useState(
    allocation?.verificationToken || "HH-2026-ALLOC-99281-A204",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement.trim()) {
      toast.error("Please enter an explanation statement for your appeal.");
      return;
    }

    createAppealMutation.mutate(
      { appealCategory: category, statement },
      {
        onSuccess: () => {
          toast.success("Formal appeal submitted to the Chief Warden Board!");
          setStatement("");
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-border/60 pb-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
          <Scale className="h-3.5 w-3.5" />
          <span>Institutional Governance & Grievance Board</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Allocation Appeals & Grievance
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted">
          Lodge formal appeals regarding quota discrepancies, overlooked medical certificates, or
          severe distance hardships.
        </p>
      </div>

      {/* Lodged Appeals List */}
      {appeals && appeals.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-heading text-base font-bold text-foreground">
            Lodged Allocation Appeals
          </h3>

          {appeals.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-border/80 bg-surface p-6 shadow-xs space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-heading text-base font-bold text-foreground capitalize">
                      {item.appealCategory.replace(/_/g, " ")}
                    </h4>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-muted font-mono mt-0.5">
                    Appeal ID: <span className="font-bold text-foreground">{item.id}</span> &bull;
                    Ref: {item.allocationRef}
                  </p>
                </div>

                <div className="text-left sm:text-right text-xs">
                  <span className="text-[10px] uppercase font-bold text-muted block">
                    Board SLA
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    48 Hours Turnaround Window
                  </span>
                </div>
              </div>

              {/* Statement */}
              <div className="p-4 rounded-2xl bg-surface-muted/40 border border-border/60 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted block">
                  Appeal Statement:
                </span>
                <p className="text-foreground leading-relaxed">{item.statement}</p>
              </div>

              {/* Multi-Tier Review Timeline */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted block">
                  Two-Tier Review Progression:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>1. Appeal Lodged</span>
                    </div>
                    <span className="text-[10px] opacity-80 block">25 Sep 2026, 11:00 AM</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>2. Warden Review</span>
                    </div>
                    <span className="text-[10px] opacity-80 block">Verified &bull; Endorsed</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-700 dark:text-brand-300 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Clock className="h-3.5 w-3.5 animate-pulse" />
                      <span>3. Chief Warden Review</span>
                    </div>
                    <span className="text-[10px] opacity-80 block">Under Final Sign-Off</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-surface-muted/30 border border-border/60 text-muted text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="h-3 w-3 rounded-full border border-border" />
                      <span>4. Final Outcome</span>
                    </div>
                    <span className="text-[10px] opacity-80 block">Scheduled Today</span>
                  </div>
                </div>
              </div>

              {/* Supporting Evidence & Outcome Note */}
              <div className="p-4 rounded-2xl bg-surface-muted/40 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                <span className="text-muted">
                  Attached Evidence:{" "}
                  <strong className="text-foreground">{item.evidenceDocs.join(", ")}</strong>
                </span>
                <span className="font-semibold text-brand-600 dark:text-brand-400">
                  Reviewer: Prof. R. K. Verma (Chief Warden)
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Appeal Submission Form */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="font-heading text-lg font-bold text-foreground">
            Submit New Allocation Appeal
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Provide supporting documentation and specific rationale for the review board.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="allocRef" className="text-xs font-semibold">
                Allocation Reference ID *
              </Label>
              <Input
                id="allocRef"
                value={allocationRef}
                onChange={(e) => setAllocationRef(e.target.value)}
                className="text-xs rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Appeal Category *</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AppealCategory)}
                className="w-full h-9 rounded-xl border border-input bg-surface px-3 text-xs text-foreground"
              >
                <option value="distance_hardship">Geographic Distance Hardship</option>
                <option value="medical_overlooked">
                  Overlooked Medical Certificate / PwD Need
                </option>
                <option value="quota_discrepancy">Statutory Quota / Category Discrepancy</option>
                <option value="severe_incompatibility">
                  Severe Lifestyle Compatibility Incompatibility
                </option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="appealStatement" className="text-xs font-semibold">
              Detailed Statement of Grievance *
            </Label>
            <Textarea
              id="appealStatement"
              rows={4}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="State the precise grounds for appeal, referencing any overlooked medical documents, domicile records, or special housing accommodations."
              className="text-xs rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Supporting Evidence Documents (PDF/JPG)</Label>
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
              disabled={createAppealMutation.isPending}
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs min-target-size"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              <span>
                {createAppealMutation.isPending ? "Submitting..." : "Lodge Formal Appeal"}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
