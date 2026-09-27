"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FadeIn, FadeUp } from "@/components/ui/motion-primitives";
import { useHostels, useFloorBeds } from "@/hooks/use-mock-api";
import { Building, Plus, ChevronRight, Wind, Accessibility, Edit2, Layers } from "lucide-react";
import { toast } from "sonner";

export default function AdminInventoryPage() {
  const { data: hostels } = useHostels();
  const [selectedHostel, setSelectedHostel] = React.useState("hostel-a");
  const [selectedFloor, setSelectedFloor] = React.useState(1);
  const { data: beds } = useFloorBeds(selectedHostel, selectedFloor);

  const [isAddBedModalOpen, setIsAddBedModalOpen] = React.useState(false);

  const currentHostelObj = hostels?.find((h) => h.id === selectedHostel) || hostels?.[0];

  return (
    <FadeIn className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <FadeUp className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
            <Building className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
            <span>Campus Hierarchy: Hostel → Block → Floor → Room → Bed</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl text-foreground">
            Campus Inventory Tree
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Configure residential towers, room layouts, physical capacity, and AC/accessibility
            attributes.
          </p>
        </div>

        <Button
          onClick={() => setIsAddBedModalOpen(true)}
          className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Room / Bed
        </Button>
      </FadeUp>

      {/* Main 2-Column Split: Hostel Selector on Left, Rooms/Beds on Right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Hostel Selector (4 cols) */}
        <FadeUp delay={0.05} className="space-y-3 lg:col-span-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm font-bold text-foreground">Residence Complexes</h3>
            <span className="text-xs text-muted-foreground">{hostels?.length || 5} Towers</span>
          </div>

          <div className="space-y-2.5">
            {hostels?.map((h) => {
              const isSelected = selectedHostel === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setSelectedHostel(h.id)}
                  className={`w-full flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-brand-500 bg-brand-500/10 shadow-sm"
                      : "border-border/70 bg-surface/50 hover:bg-surface-muted/50"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm font-bold text-foreground">
                        {h.name}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">({h.code})</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span>{h.totalBeds} Total Beds</span>
                      <span>•</span>
                      <span>{h.blocksCount} Blocks</span>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 ${isSelected ? "text-brand-600 dark:text-brand-400" : "text-muted-foreground"}`}
                  />
                </button>
              );
            })}
          </div>
        </FadeUp>

        {/* Right Column: Floor & Bed Tree (8 cols) */}
        <FadeUp delay={0.1} className="space-y-6 lg:col-span-8">
          <GlassCard className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground">
                    {currentHostelObj?.name || "Aryabhata Hall"} — Floor {selectedFloor}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Block A • 12 Active Rooms • 24 Physical Beds
                  </p>
                </div>
              </div>

              {/* Floor Switcher */}
              <div className="flex items-center gap-1 rounded-xl bg-surface-muted/60 p-1 border border-border/60">
                {[1, 2, 3, 4].map((fl) => (
                  <button
                    key={fl}
                    onClick={() => setSelectedFloor(fl)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      selectedFloor === fl
                        ? "bg-brand-500 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Floor {fl}
                  </button>
                ))}
              </div>
            </div>

            {/* Beds Table */}
            <div className="mt-5 space-y-3">
              {beds?.map((bed) => (
                <div
                  key={bed.id}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-surface-muted/30 p-3.5 text-xs hover:border-brand-500/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface font-mono font-bold text-foreground border border-border/80">
                      {bed.roomNo}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <span>{bed.bedNo}</span>
                        {bed.hasAC && (
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded-md">
                            <Wind className="h-3 w-3" /> AC
                          </span>
                        )}
                        {bed.isAccessible && (
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                            <Accessibility className="h-3 w-3" /> PwD Lift
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {bed.assignedStudentName
                          ? `Assigned: ${bed.assignedStudentName} (${bed.assignedStudentRoll})`
                          : "Vacant Bed — Available for Gale-Shapley matching"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={bed.status} />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        toast.info(`Editing configuration for ${bed.roomNo} ${bed.bedNo}`)
                      }
                      className="h-8 w-8 p-0 rounded-lg hover:text-brand-600"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </FadeUp>
      </div>

      <ConfirmDialog
        open={isAddBedModalOpen}
        onOpenChange={setIsAddBedModalOpen}
        title="Add New Bed to Campus Inventory Tree"
        description="Specify room number, bed identifier, and physical attributes (Single/Double AC, PwD Accessibility). Changes will be committed to the inventory database."
        confirmLabel="Add Bed to Roster"
        onConfirm={() => toast.success("Bed successfully added to inventory tree!")}
      />
    </FadeIn>
  );
}
