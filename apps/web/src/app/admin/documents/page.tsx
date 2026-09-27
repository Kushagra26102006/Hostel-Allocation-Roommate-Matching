"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FadeIn, FadeUp } from "@/components/ui/motion-primitives";
import { FileCheck, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function AdminDocumentsPage() {
  const [docs, setDocs] = React.useState([
    {
      id: "doc-1",
      studentName: "Aarav Sharma",
      rollNo: "23CS10042",
      type: "Domicile Certificate (Distance > 800km)",
      fileName: "domicile_maharashtra.pdf",
      status: "verified",
    },
    {
      id: "doc-2",
      studentName: "Dr. Priya Sundaram",
      rollNo: "25PHD001",
      type: "PwD Medical Board Locomotor Certificate",
      fileName: "medical_disability_board.pdf",
      status: "verified",
    },
    {
      id: "doc-3",
      studentName: "Kabir Mehta",
      rollNo: "24ME10023",
      type: "Inter-University Sports Council Endorsement",
      fileName: "sports_representation_2026.pdf",
      status: "pending",
    },
  ]);

  const handleVerify = (id: string) => {
    setDocs(docs.map((d) => (d.id === id ? { ...d, status: "verified" } : d)));
    toast.success("Document marked verified and student eligibility unlocked!");
  };

  return (
    <FadeIn className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
      <FadeUp>
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
          <FileCheck className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          <span>Verification Queue</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl text-foreground">
          Document Verification Queue
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Verify uploaded medical, sports, and domicile certificates to unlock priority tiers in the
          allocation engine.
        </p>
      </FadeUp>

      <div className="space-y-3">
        {docs.map((d, idx) => (
          <FadeUp key={d.id} delay={0.05 + idx * 0.04}>
            <GlassCard className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-sm font-bold text-foreground">
                      {d.studentName}
                    </h3>
                    <span className="font-mono text-xs text-muted-foreground">({d.rollNo})</span>
                    <StatusBadge status={d.status === "verified" ? "approved" : "under_review"} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <strong>{d.type}</strong> • File:{" "}
                    <span className="font-mono text-foreground">{d.fileName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="rounded-xl">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    View File
                  </Button>
                  {d.status !== "verified" && (
                    <Button
                      size="sm"
                      onClick={() => handleVerify(d.id)}
                      className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-sm"
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Verify Document
                    </Button>
                  )}
                </div>
              </div>
            </GlassCard>
          </FadeUp>
        ))}
      </div>
    </FadeIn>
  );
}
