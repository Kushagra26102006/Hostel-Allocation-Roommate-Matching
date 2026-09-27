"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FadeIn, FadeUp } from "@/components/ui/motion-primitives";
import { Calendar, Plus, Clock, Users, Bed } from "lucide-react";
import { toast } from "sonner";

export default function AdminCyclesPage() {
  const [isNewCycleOpen, setIsNewCycleOpen] = React.useState(false);

  const cycles = [
    {
      id: "cycle-fall-2026",
      name: "Fall 2026 Regular Allocation",
      academicYear: "2026-2027",
      status: "active",
      appDeadline: "2026-09-24",
      targetBeds: 1970,
      applicationsCount: 1970,
    },
    {
      id: "cycle-spring-2026",
      name: "Spring 2026 Re-Allocation",
      academicYear: "2025-2026",
      status: "published",
      appDeadline: "2026-01-15",
      targetBeds: 340,
      applicationsCount: 320,
    },
  ];

  return (
    <FadeIn className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      <FadeUp className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
            <Calendar className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
            <span>Academic Cohort Periods</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl text-foreground">
            Allocation Cycles & Timelines
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Schedule application open dates, preference lock cutoffs, and warden review periods.
          </p>
        </div>

        <Button
          onClick={() => setIsNewCycleOpen(true)}
          className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Cycle
        </Button>
      </FadeUp>

      <div className="space-y-4">
        {cycles.map((c, idx) => (
          <FadeUp key={c.id} delay={0.05 + idx * 0.04}>
            <GlassCard className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-heading text-lg font-bold text-foreground">{c.name}</h3>
                    <StatusBadge status={c.status === "active" ? "allocated" : "published"} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      Academic Year {c.academicYear} • Application Cutoff: {c.appDeadline}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <div className="font-bold text-foreground flex items-center gap-1 justify-end">
                      <Users className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                      <span>{c.applicationsCount} Applicants</span>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                      <Bed className="h-3.5 w-3.5" />
                      <span>{c.targetBeds} Target Beds</span>
                    </div>
                  </div>

                  <Button size="sm" variant="outline" className="rounded-xl">
                    Manage Timeline
                  </Button>
                </div>
              </div>
            </GlassCard>
          </FadeUp>
        ))}
      </div>

      <ConfirmDialog
        open={isNewCycleOpen}
        onOpenChange={setIsNewCycleOpen}
        title="Create New Allocation Cycle"
        description="Configure academic semester, eligible applicant cohorts, and deadline constraints."
        confirmLabel="Create Cycle"
        onConfirm={() => toast.success("New allocation cycle scheduled!")}
      />
    </FadeIn>
  );
}
