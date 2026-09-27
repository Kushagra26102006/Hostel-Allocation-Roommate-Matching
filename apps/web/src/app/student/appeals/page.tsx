"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { FileUploader } from "@/components/ui/file-uploader";
import { useAppeals, useCreateAppeal } from "@/hooks/use-mock-api";
import { Scale, Send } from "lucide-react";
import type { AppealCategory } from "@/types";
import { toast } from "sonner";

export default function StudentAppealsPage() {
  const { data: appeals } = useAppeals();
  const createAppealMutation = useCreateAppeal();

  const [statement, setStatement] = React.useState("");
  const [category, setCategory] = React.useState<AppealCategory>("distance_hardship");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement.trim()) {
      toast.error("Please enter an appeal statement");
      return;
    }

    createAppealMutation.mutate(
      { appealCategory: category, statement },
      {
        onSuccess: () => {
          toast.success("Appeal successfully lodged with the Chief Warden Council!");
          setStatement("");
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
          <Scale className="h-3.5 w-3.5" />
          <span>Institutional Governance</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">
          Allocation Appeals & Grievance
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Submit formal grievances regarding allocation quota discrepancy, overlooked medical
          certificates, or distance hardship.
        </p>
      </div>

      {/* Existing Appeals List */}
      {appeals && appeals.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-heading text-base font-bold text-foreground">Lodged Appeals</h3>
          {appeals.map((item) => (
            <GlassCard key={item.id} className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-heading text-base font-bold text-foreground capitalize">
                      {item.appealCategory.replace(/_/g, " ")}
                    </h4>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    Ref: {item.allocationRef} • Lodged by {item.studentName} ({item.rollNo})
                  </p>
                </div>

                <div className="text-right text-xs text-muted-foreground">
                  <div>Submitted: 25 Sep 2026</div>
                  <div className="text-amber-600 dark:text-amber-400 font-semibold">
                    SLA Window: 48 hours
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-surface-muted/40 p-3 text-xs text-foreground border border-border/40">
                <span className="font-semibold text-muted-foreground block mb-1">Statement:</span>
                {item.statement}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
                <span>Supporting Evidence: {item.evidenceDocs.join(", ")}</span>
                <span className="text-brand-600 dark:text-brand-400 font-medium">
                  Under Review by Chief Warden
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* New Appeal Form */}
      <GlassCard className="p-6 sm:p-8">
        <h3 className="font-heading text-lg font-bold text-foreground">
          Lodge New Allocation Appeal
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Appeals are independently reviewed by the Chief Warden and Dean of Student Welfare.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="category">Category of Grievance</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as AppealCategory)}
              className="mt-1.5 w-full rounded-xl border border-input bg-surface px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="distance_hardship">Distance & Commute Hardship</option>
              <option value="medical_overlooked">Overlooked Medical Certificate / PwD Need</option>
              <option value="quota_discrepancy">Quota / Category Discrepancy</option>
              <option value="severe_incompatibility">
                Severe Incompatibility / Safety Concern
              </option>
            </select>
          </div>

          <div>
            <Label htmlFor="statement">Detailed Grievance Statement</Label>
            <Textarea
              id="statement"
              rows={4}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="State the facts and grounds of your appeal clearly..."
              className="mt-1.5 text-xs"
            />
          </div>

          <div>
            <Label>Upload Official Evidence Documents</Label>
            <div className="mt-1.5">
              <FileUploader label="Upload verified medical certs, domicile proofs, or letters (PDF, max 5MB)" />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={createAppealMutation.isPending} className="rounded-xl">
              <Send className="mr-2 h-4 w-4" />
              {createAppealMutation.isPending ? "Lodging Appeal..." : "Lodge Appeal"}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
