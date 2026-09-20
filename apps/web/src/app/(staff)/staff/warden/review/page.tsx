"use client";

import * as React from "react";
import { ReviewDashboard } from "@/components/warden/review-dashboard";
import type { DraftQueueItem } from "@/components/warden/review-dashboard";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WardenReviewQueuePage() {
  const [drafts, setDrafts] = React.useState<DraftQueueItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchDrafts = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/drafts");
      if (!res.ok) {
        throw new Error("Failed to load review drafts");
      }
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching drafts";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Warden Review Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overview of pending allocation drafts, review SLA windows, and student assignment
            queues.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDrafts}
          disabled={isLoading}
          className="gap-2 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Queue
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading warden review queue...</p>
        </div>
      ) : (
        <ReviewDashboard drafts={drafts} onRefresh={fetchDrafts} />
      )}
    </div>
  );
}
