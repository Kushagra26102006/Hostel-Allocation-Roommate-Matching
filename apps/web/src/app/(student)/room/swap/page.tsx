"use client";

import * as React from "react";
import { Timeline, StatusChip, type TimelineStep } from "@/components/changes/timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Repeat2,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  UserCheck,
  AlertTriangle,
} from "lucide-react";

interface SwapRequest {
  _id: string;
  initiator_student_id: string;
  counterpart_student_id: string;
  status: string;
  initiator_accepted: boolean;
  counterpart_accepted: boolean;
  failure_reason?: string;
  createdAt: string;
  decided_at?: string;
}

export default function StudentSwapPage() {
  const [swaps, setSwaps] = React.useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [counterpartId, setCounterpartId] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const fetchSwaps = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/swaps");
      if (res.ok) {
        const data = await res.json();
        setSwaps(data.swaps || []);
      }
    } catch {
      setError("Failed to load swap requests.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchSwaps();
  }, [fetchSwaps]);

  const handlePropose = async () => {
    if (!counterpartId.trim()) {
      setError("Please enter the counterpart student ID.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counterpart_student_id: counterpartId.trim() }),
      });
      if (res.ok) {
        setSuccess("Swap proposed! Waiting for the other student to accept.");
        setShowForm(false);
        setCounterpartId("");
        void fetchSwaps();
        setTimeout(() => setSuccess(null), 4000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to propose swap.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (swapId: string) => {
    setActionLoading(swapId);
    try {
      const res = await fetch(`/api/v1/swaps/${swapId}/accept`, { method: "POST" });
      if (res.ok) {
        setSuccess("Swap accepted! Validating constraints...");
        void fetchSwaps();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to accept swap.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (swapId: string) => {
    setActionLoading(swapId);
    try {
      const res = await fetch(`/api/v1/swaps/${swapId}/cancel`, { method: "POST" });
      if (res.ok) {
        void fetchSwaps();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to cancel swap.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setActionLoading(null);
    }
  };

  const buildSwapTimeline = (swap: SwapRequest): TimelineStep[] => {
    const steps: TimelineStep[] = [
      {
        id: "proposed",
        label: "Swap Proposed",
        status: "completed",
        timestamp: swap.createdAt,
      },
      {
        id: "accepted",
        label: "Both Accepted",
        status: swap.counterpart_accepted
          ? "completed"
          : swap.status === "proposed"
            ? "current"
            : swap.status === "cancelled"
              ? "skipped"
              : "completed",
      },
      {
        id: "validation",
        label: "Constraint Validation",
        status:
          swap.status === "completed"
            ? "completed"
            : swap.status === "failed"
              ? "failed"
              : swap.status === "validated"
                ? "completed"
                : "upcoming",
        description: swap.failure_reason || undefined,
      },
      {
        id: "result",
        label:
          swap.status === "completed"
            ? "Swap Complete"
            : swap.status === "failed"
              ? "Swap Failed"
              : "Result",
        status:
          swap.status === "completed"
            ? "completed"
            : swap.status === "failed"
              ? "failed"
              : swap.status === "cancelled"
                ? "skipped"
                : "upcoming",
        timestamp: swap.decided_at,
      },
    ];
    return steps;
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Repeat2 className="h-6 w-6 text-teal-400" />
              Room Swaps
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Propose or accept a room swap with another student.
            </p>
          </div>
          <Button
            id="new-swap-btn"
            onClick={() => setShowForm(!showForm)}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Propose Swap
          </Button>
        </div>

        {/* Toast messages */}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            <XCircle className="h-4 w-4" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto hover:text-red-300">
              ×
            </button>
          </div>
        )}

        {/* Propose Form */}
        {showForm && (
          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-lg font-semibold text-white">Propose a Room Swap</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Counterpart Student ID
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="counterpart-id"
                    value={counterpartId}
                    onChange={(e) => setCounterpartId(e.target.value)}
                    placeholder="Enter the student ID you want to swap with"
                    className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  id="submit-swap"
                  onClick={handlePropose}
                  disabled={submitting || !counterpartId.trim()}
                  className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Proposal
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setCounterpartId("");
                  }}
                  className="border-zinc-700 text-zinc-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Swaps List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
          </div>
        ) : swaps.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <Repeat2 className="mx-auto h-12 w-12 text-zinc-700" />
            <p className="mt-4 text-zinc-400">No swap requests yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {swaps.map((swap) => (
              <div
                key={swap._id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm transition-all hover:border-zinc-700"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/10 border border-teal-500/30">
                      <ArrowLeftRight className="h-5 w-5 text-teal-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">
                        Swap with Student {swap.counterpart_student_id.slice(-6)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(swap.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <StatusChip status={swap.status} size="md" />
                </div>

                <Timeline steps={buildSwapTimeline(swap)} compact />

                {/* Action Buttons */}
                {swap.status === "proposed" && !swap.counterpart_accepted && (
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(swap._id)}
                      disabled={actionLoading === swap._id}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {actionLoading === swap._id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <UserCheck className="mr-1 h-3 w-3" />
                      )}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancel(swap._id)}
                      disabled={actionLoading === swap._id}
                      className="border-zinc-700 text-zinc-300"
                    >
                      Cancel Swap
                    </Button>
                  </div>
                )}

                {swap.failure_reason && (
                  <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                    <p className="flex items-center gap-1 text-xs font-medium text-red-400">
                      <AlertTriangle className="h-3 w-3" />
                      Validation Failed
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-400">{swap.failure_reason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
