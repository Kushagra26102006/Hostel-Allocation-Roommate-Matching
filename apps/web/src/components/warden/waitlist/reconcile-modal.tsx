"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, RefreshCw, Scale, Loader2 } from "lucide-react";
import type { ReconciliationReport } from "@hostelhub/domain";

interface ReconcileModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostelId: string;
  draftId: string;
  hostelName?: string;
}

export function ReconcileModal({
  isOpen,
  onClose,
  hostelId,
  draftId,
  hostelName = "Hostel",
}: ReconcileModalProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [report, setReport] = React.useState<ReconciliationReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fetchReconciliation = React.useCallback(async () => {
    if (!hostelId || !draftId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/waitlist/reconcile?hostel_id=${encodeURIComponent(
          hostelId,
        )}&draft_id=${encodeURIComponent(draftId)}`,
      );
      if (!res.ok) {
        throw new Error("Failed to execute occupancy recount");
      }
      const data = await res.json();
      setReport(data.report);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error reconciling occupancy");
    } finally {
      setIsLoading(false);
    }
  }, [hostelId, draftId]);

  React.useEffect(() => {
    if (isOpen) {
      fetchReconciliation();
    }
  }, [isOpen, fetchReconciliation]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Scale className="w-5 h-5 text-primary" />
              Occupancy Reconciliation
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchReconciliation}
              disabled={isLoading}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Recount
            </Button>
          </div>
          <DialogDescription>
            Independent verification comparing active database assignments against room counters for{" "}
            {hostelName}. Invariant: 0 discrepancy drift.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Recounting active bed assignments in memory...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : report ? (
            <div className="space-y-4">
              {/* Summary Metrics */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="text-[11px] text-muted-foreground font-medium">
                    Total Capacity
                  </div>
                  <div className="text-xl font-bold text-foreground mt-0.5">
                    {report.totalHostelCapacity}
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="text-[11px] text-muted-foreground font-medium">
                    Active Allocated
                  </div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {report.totalAllocated}
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="text-[11px] text-muted-foreground font-medium">
                    Beds Available
                  </div>
                  <div className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                    {report.totalAvailable}
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-muted/30 flex flex-col justify-between">
                  <div className="text-[11px] text-muted-foreground font-medium">
                    Reconciled State
                  </div>
                  <div>
                    {report.isExactMatch ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Exact (0 Drift)
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1 text-[11px] font-bold">
                        <AlertTriangle className="w-3 h-3" /> {report.discrepancies.length} Drifts
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Room Breakdown Table */}
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground border-b">
                  Room-by-Room Assignment Audit
                </div>
                <div className="max-h-56 overflow-y-auto divide-y text-xs">
                  {report.roomReports.map((room) => (
                    <div
                      key={room.roomId}
                      className="px-3 py-2 flex items-center justify-between hover:bg-muted/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          Room {room.roomNumber}
                        </span>
                        {room.isFull && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-bold">
                            Full
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground font-mono">
                        <span>
                          Recount:{" "}
                          <strong className="text-foreground">{room.allocatedCount}</strong> /{" "}
                          {room.capacity}
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button size="sm" onClick={onClose}>
            Close Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
