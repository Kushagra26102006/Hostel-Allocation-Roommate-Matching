"use client";

import * as React from "react";
import { Timeline, StatusChip, type TimelineStep } from "@/components/changes/timeline";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface RoomChangeRequest {
  _id: string;
  reason: string;
  status: string;
  evidence_keys: string[];
  decided_by?: { email: string; role: string };
  decision_reason?: string;
  decided_at?: string;
  createdAt: string;
}

export default function StudentRoomChangesPage() {
  const [requests, setRequests] = React.useState<RoomChangeRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const fetchRequests = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/room-changes");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch {
      setError("Failed to load room change requests.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      setError("Reason must be at least 10 characters.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/room-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_id: "current", reason }),
      });
      if (res.ok) {
        setSuccess("Room change request submitted!");
        setShowForm(false);
        setReason("");
        void fetchRequests();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit request.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const buildTimeline = (req: RoomChangeRequest): TimelineStep[] => {
    const steps: TimelineStep[] = [
      {
        id: "submitted",
        label: "Request Submitted",
        description: "Your room change request has been submitted.",
        status: "completed",
        timestamp: req.createdAt,
        actor: "You",
      },
      {
        id: "review",
        label: "Under Review",
        description: "Warden is reviewing your request.",
        status: req.status === "pending" ? "current" : "completed",
      },
      {
        id: "decided",
        label:
          req.status === "approved"
            ? "Approved"
            : req.status === "rejected"
              ? "Rejected"
              : "Decision",
        description: req.decision_reason || "Awaiting decision.",
        status:
          req.status === "approved"
            ? "completed"
            : req.status === "rejected"
              ? "failed"
              : "upcoming",
        timestamp: req.decided_at,
        actor: req.decided_by?.email,
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
              <ArrowRightLeft className="h-6 w-6 text-indigo-400" />
              Room Changes
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Request a room change or track your existing requests.
            </p>
          </div>
          <Button
            id="new-room-change-btn"
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <FileText className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </div>

        {/* Success toast */}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            <XCircle className="h-4 w-4" />
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        )}

        {/* New Request Form */}
        {showForm && (
          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur-sm">
            <h3 className="mb-4 text-lg font-semibold text-white">Submit Room Change Request</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Reason for Change
                </label>
                <textarea
                  id="room-change-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-sm text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Explain why you'd like to change rooms (at least 10 characters)..."
                  rows={3}
                />
                <p
                  className={`mt-1 text-xs ${reason.trim().length >= 10 ? "text-emerald-400" : "text-zinc-500"}`}
                >
                  {reason.trim().length}/10 characters minimum
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  id="submit-room-change"
                  onClick={handleSubmit}
                  disabled={submitting || reason.trim().length < 10}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Request
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setReason("");
                  }}
                  className="border-zinc-700 text-zinc-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Requests List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <ArrowRightLeft className="mx-auto h-12 w-12 text-zinc-700" />
            <p className="mt-4 text-zinc-400">No room change requests yet.</p>
            <p className="mt-1 text-sm text-zinc-600">Submit a request to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req._id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm transition-all hover:border-zinc-700"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="text-sm text-zinc-300">{req.reason}</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Submitted{" "}
                      {new Date(req.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <StatusChip status={req.status} size="md" />
                </div>
                <Timeline steps={buildTimeline(req)} compact />
                {req.decision_reason && (
                  <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                    <p className="text-xs font-medium text-zinc-400">Decision Reason:</p>
                    <p className="mt-0.5 text-sm text-zinc-300">{req.decision_reason}</p>
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
