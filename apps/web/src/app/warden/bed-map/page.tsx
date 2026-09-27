"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useFloorBeds, useHostels } from "@/hooks/use-mock-api";
import type { MockBed } from "@/lib/api/mock/data";
import { RefreshCw, User, CheckCircle2, Clock, Wrench, AlertTriangle, History } from "lucide-react";
import { toast } from "sonner";

export default function WardenBedMapPage() {
  const { data: hostels } = useHostels();
  const [selectedHostelId, setSelectedHostelId] = React.useState("hostel-a");
  const [selectedFloor, setSelectedFloor] = React.useState(2);
  const { data: beds } = useFloorBeds(selectedHostelId, selectedFloor);

  const [selectedBed, setSelectedBed] = React.useState<MockBed | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  const handleBedClick = (bed: MockBed) => {
    setSelectedBed(bed);
    setIsDrawerOpen(true);
  };

  const currentHostel = hostels?.find((h) => h.id === selectedHostelId) ?? {
    name: "Aryabhata Hall",
    code: "BH-1",
  };

  // Status mapping with icons, shapes, and indicators (Never relying on color alone)
  const bedStateMeta = {
    available: {
      bg: "bg-emerald-50/70 dark:bg-emerald-950/20",
      border: "border-emerald-200 dark:border-emerald-800/40",
      badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
      icon: CheckCircle2,
      label: "Available",
    },
    assigned: {
      bg: "bg-brand-50/70 dark:bg-brand-950/30",
      border: "border-brand-200 dark:border-brand-800/50",
      badge: "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300",
      icon: User,
      label: "Assigned",
    },
    held: {
      bg: "bg-amber-50/70 dark:bg-amber-950/20",
      border: "border-amber-200 dark:border-amber-800/40",
      badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
      icon: Clock,
      label: "Held (Quota)",
    },
    out_of_service: {
      bg: "bg-surface-muted/60",
      border: "border-border/80 border-dashed",
      badge: "bg-surface-muted text-muted",
      icon: Wrench,
      label: "Out of Service",
    },
    conflict: {
      bg: "bg-rose-50/80 dark:bg-rose-950/30",
      border: "border-rose-400 dark:border-rose-800 animate-pulse",
      badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
      icon: AlertTriangle,
      label: "Rule Conflict",
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-7 animate-in fade-in duration-200">
      {/* 1. Hierarchy & Controls Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          {/* Breadcrumb Hierarchy: Hostel -> Block -> Floor */}
          <div className="flex items-center gap-1.5 text-xs text-muted font-medium mb-1.5">
            <span className="text-foreground font-semibold">{currentHostel.name}</span>
            <span>&rarr;</span>
            <span>Block A</span>
            <span>&rarr;</span>
            <span className="text-brand-600 dark:text-brand-400 font-bold">
              Floor {selectedFloor}
            </span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Interactive Floor Bed Map
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-muted">
            Floor matrix with live occupancy, constraint validation indicators, and
            click-to-reassign drawer.
          </p>
        </div>

        {/* Hostel Selector and Floor Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {hostels && hostels.length > 0 && (
            <select
              value={selectedHostelId}
              aria-label="Select Residence Hostel"
              onChange={(e) => setSelectedHostelId(e.target.value)}
              className="rounded-lg border border-border/70 bg-surface px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
            >
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 rounded-xl bg-surface-muted/60 p-1 border border-border/60">
            {[1, 2, 3, 4].map((fl) => (
              <button
                key={fl}
                type="button"
                onClick={() => setSelectedFloor(fl)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  selectedFloor === fl
                    ? "bg-brand-500 text-white shadow-2xs"
                    : "text-muted hover:text-foreground hover:bg-surface"
                }`}
              >
                Floor {fl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. State Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-surface p-3.5 rounded-xl border border-border/70 shadow-2xs">
        <span className="text-[10px] uppercase font-bold tracking-wider text-muted">
          Bed Legend &amp; Shapes:
        </span>
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Available</span>
          </span>
          <span className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 font-semibold">
            <User className="h-3.5 w-3.5" />
            <span>Assigned</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            <span>Held (Quota)</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <Wrench className="h-3.5 w-3.5" />
            <span>Out of Service</span>
          </span>
          <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
            <span>Rule Conflict</span>
          </span>
        </div>
      </div>

      {/* 3. Room Matrix Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {beds &&
          Array.from(new Set(beds.map((b) => b.roomNo))).map((roomNo) => {
            const roomBeds = beds.filter((b) => b.roomNo === roomNo);
            return (
              <div
                key={roomNo}
                className="rounded-xl border border-border/70 bg-surface p-4 shadow-xs transition-all duration-180 hover:border-brand-500/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
                  <span className="font-heading text-sm font-bold text-foreground">
                    Room {roomNo}
                  </span>
                  <span className="text-[10px] font-mono text-muted uppercase">Double AC</span>
                </div>

                <div className="space-y-2">
                  {roomBeds.map((bed) => {
                    const meta =
                      bedStateMeta[bed.status as keyof typeof bedStateMeta] ??
                      bedStateMeta.available;
                    const Icon = meta.icon;
                    return (
                      <button
                        key={bed.id}
                        type="button"
                        onClick={() => handleBedClick(bed)}
                        className={`w-full flex items-center justify-between rounded-lg border p-2.5 text-left transition-all duration-150 hover:shadow-2xs active:scale-[0.98] ${meta.bg} ${meta.border}`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />
                          <span className="font-mono text-xs font-bold text-foreground">
                            {bed.bedNo}
                          </span>
                          {bed.assignedStudentName && (
                            <span className="truncate text-[11px] text-foreground/80 font-medium">
                              {bed.assignedStudentName}
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider shrink-0 px-1.5 py-0.5 rounded ${meta.badge}`}
                        >
                          {meta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      {/* 4. Bed Detail Side Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-heading text-xl font-bold">
              Room {selectedBed?.roomNo} &bull; {selectedBed?.bedNo}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted">
              {currentHostel.name} &bull; Block A, Floor {selectedFloor}
            </SheetDescription>
          </SheetHeader>

          {selectedBed && (
            <div className="space-y-5 text-xs mt-6">
              {/* Status Banner */}
              <div className="rounded-xl bg-surface-muted/40 p-3.5 border border-border/60">
                <span className="font-bold text-muted uppercase tracking-wider text-[10px]">
                  Bed Current State
                </span>
                <div className="mt-1 flex items-center justify-between">
                  <StatusBadge status={selectedBed.status} />
                  <span className="text-[11px] text-muted">Double Sharing AC</span>
                </div>
              </div>

              {/* Student Particulars (if assigned) */}
              {selectedBed.assignedStudentName && (
                <div className="rounded-xl border border-border/70 bg-surface p-4 space-y-2 shadow-2xs">
                  <span className="font-bold text-muted uppercase tracking-wider text-[10px]">
                    Assigned Occupant
                  </span>
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300 font-bold text-sm shrink-0">
                      {selectedBed.assignedStudentName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-heading text-sm font-bold text-foreground">
                        {selectedBed.assignedStudentName}
                      </h4>
                      <p className="text-xs font-mono text-muted">
                        {selectedBed.assignedStudentRoll}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5">
                    <span className="text-muted">Roommate Compatibility:</span>
                    <strong className="text-emerald-600 font-bold">
                      {selectedBed.compatibilityScore}% Match
                    </strong>
                  </div>
                </div>
              )}

              {/* Assignment Audit History Log */}
              <div className="space-y-2">
                <span className="font-bold text-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-muted" />
                  <span>Assignment History Log</span>
                </span>
                <div className="rounded-xl border border-border/60 bg-surface-muted/20 p-3 space-y-2 text-[11px] text-muted">
                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span>Gale-Shapley Draft Run #4210</span>
                    <strong className="text-foreground">15 Sep, 10:30 AM</strong>
                  </div>
                  <p>Auto-assigned based on First-Choice Preference ranking.</p>
                </div>
              </div>

              {/* Warden Governance Actions */}
              <div className="space-y-2 pt-4 border-t border-border/60">
                <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                  Administrative Actions
                </span>

                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    size="sm"
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs"
                    onClick={() => {
                      toast.success("Triggered reassignment audit workflow");
                      setIsDrawerOpen(false);
                    }}
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Move / Reassign Bed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => {
                      toast.info("Marked bed Out of Service for maintenance hold");
                      setIsDrawerOpen(false);
                    }}
                  >
                    <Wrench className="mr-1.5 h-3.5 w-3.5 text-muted" />
                    Mark Out of Service
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
