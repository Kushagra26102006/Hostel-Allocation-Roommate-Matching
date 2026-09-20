"use client";

import * as React from "react";
import Link from "next/link";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Calendar,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export interface DraftQueueItem {
  id: string;
  cycleId: string;
  cycleName: string;
  runId: string;
  engineVersion: string;
  status: string;
  versionNumber: number;
  overridesCount: number;
  metrics?: {
    totalApplications?: number;
    placedCount?: number;
    unplacedCount?: number;
    satisfactionScore?: number;
    quotaComplianceRate?: number;
  } | null;
  sla: {
    deadline: string;
    hoursRemaining: number;
    isOverdue: boolean;
    status: "normal" | "urgent" | "overdue";
  };
  createdAt: string;
}

interface ReviewDashboardProps {
  drafts: DraftQueueItem[];
  onRefresh?: () => void;
}

export const ReviewDashboard: React.FC<ReviewDashboardProps> = ({ drafts }) => {
  const getStatusChip = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return <Badge className="bg-emerald-600 hover:bg-emerald-600">Published</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-600 hover:bg-blue-600">Approved</Badge>;
      case "UNDER_REVIEW":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-300">
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

  const getSlaBadge = (sla: DraftQueueItem["sla"]) => {
    if (sla.isOverdue) {
      return (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-900">
          <AlertTriangle className="w-3.5 h-3.5" /> Overdue: SLA Expired
        </span>
      );
    }
    if (sla.status === "urgent") {
      return (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-900">
          <Clock className="w-3.5 h-3.5 animate-pulse" /> Urgent: {sla.hoursRemaining}h remaining
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
        <Clock className="w-3.5 h-3.5" /> SLA: {sla.hoursRemaining}h remaining
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Live Summary Counters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Active Review Drafts</CardDescription>
            <div className="text-2xl font-bold font-mono text-foreground">
              {
                drafts.filter((d) => d.status === "UNDER_REVIEW" || d.status === "DRAFT_READY")
                  .length
              }
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Awaiting warden action</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Total Overrides Logged</CardDescription>
            <div className="text-2xl font-bold font-mono text-amber-600">
              {drafts.reduce((acc, d) => acc + d.overridesCount, 0)}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Audited warden adjustments</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Ready for Approval</CardDescription>
            <div className="text-2xl font-bold font-mono text-blue-600">
              {drafts.filter((d) => d.status === "UNDER_REVIEW").length}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Chief Warden review queue</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs">Published Allocations</CardDescription>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {drafts.filter((d) => d.status === "PUBLISHED").length}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Live to students</span>
          </CardContent>
        </Card>
      </div>

      {/* Queue of Drafts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Warden Review Queue</h2>
            <p className="text-xs text-muted-foreground">
              Review algorithmic assignments, verify compatibility scores, inspect bed maps, and
              apply audited overrides.
            </p>
          </div>
        </div>

        {drafts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-foreground">No draft allocations in review</p>
              <p className="text-xs mt-1">
                Run an allocation cycle in the admin console to generate draft assignments.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {drafts.map((draft) => {
              const placed = draft.metrics?.placedCount ?? 0;
              const unplaced = draft.metrics?.unplacedCount ?? 0;
              const total = placed + unplaced || draft.metrics?.totalApplications || 1;
              const pct = Math.round((placed / total) * 100);

              return (
                <Card
                  key={draft.id}
                  className="hover:border-primary/50 transition-all shadow-sm hover:shadow-md"
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      {/* Left: Title, Cycle, Engine, Status */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-base text-foreground truncate">
                            {draft.cycleName}
                          </h3>
                          {getStatusChip(draft.status)}
                          <Badge variant="outline" className="font-mono text-xs">
                            v{draft.versionNumber}
                          </Badge>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {draft.engineVersion}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Created {new Date(draft.createdAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                            {draft.overridesCount} Manual Overrides
                          </span>
                        </div>
                      </div>

                      {/* Middle: Live Progress Counters */}
                      <div className="w-full lg:w-64 space-y-1.5 bg-muted/40 p-3 rounded-lg border">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">Allocation Progress</span>
                          <span className="font-mono font-bold text-primary">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-2" aria-label="Allocation Progress" />
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{placed} placed</span>
                          <span>{unplaced} unplaced</span>
                        </div>
                      </div>

                      {/* Right: SLA Timer & Open Review Button */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-2 shrink-0">
                        {getSlaBadge(draft.sla)}

                        <Button asChild size="sm" className="gap-1.5">
                          <Link href={`/staff/warden/review/${draft.id}`}>
                            <span>Open Review Console</span>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
