"use client";

import * as React from "react";
import { Timeline, StatusChip, SlaBadge, type TimelineStep } from "@/components/changes/timeline";
import { Button } from "@/components/ui/button";
import { Scale, FileText, Loader2, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

interface Appeal {
  _id: string;
  statement: string;
  status: string;
  evidence_keys: string[];
  sla_due_at: string;
  sla_config_days: number;
  current_reviewer_role: string;
  warden_decision?: {
    outcome: string;
    reason: string;
    decided_by: { email: string };
    decided_at: string;
  };
  chief_warden_decision?: {
    outcome: string;
    reason: string;
    decided_by: { email: string };
    decided_at: string;
  };
  final_outcome?: string;
  escalated_at?: string;
  escalation_reason?: string;
  createdAt: string;
}

interface AppealDetail {
  appeal: Appeal;
  explanation: string | null;
  slaInfo: { breached: boolean; daysRemaining: number };
}

export default function StudentAppealsPage() {
  const [appeals, setAppeals] = React.useState<Appeal[]>([]);
  const [selectedDetail, setSelectedDetail] = React.useState<AppealDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [statement, setStatement] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const fetchAppeals = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/appeals");
      if (res.ok) {
        const data = await res.json();
        setAppeals(data.appeals || []);
      }
    } catch {
      setError("Failed to load appeals.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchAppeals();
  }, [fetchAppeals]);

  const fetchDetail = async (appealId: string) => {
    try {
      const res = await fetch(`/api/v1/appeals/${appealId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDetail(data);
      }
    } catch {
      setError("Failed to load appeal details.");
    }
  };

  const handleSubmit = async () => {
    if (statement.trim().length < 20) {
      setError("Statement must be at least 20 characters.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_id: "current", statement }),
      });
      if (res.ok) {
        setSuccess("Appeal submitted! It will be reviewed by the warden.");
        setShowForm(false);
        setStatement("");
        void fetchAppeals();
        setTimeout(() => setSuccess(null), 4000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit appeal.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const buildAppealTimeline = (appeal: Appeal): TimelineStep[] => {
    const steps: TimelineStep[] = [
      {
        id: "submitted",
        label: "Appeal Submitted",
        status: "completed",
        timestamp: appeal.createdAt,
        actor: "You",
      },
      {
        id: "warden_review",
        label: "Warden Review",
        status:
          appeal.status === "warden_review"
            ? "current"
            : appeal.warden_decision
              ? "completed"
              : "upcoming",
        timestamp: appeal.warden_decision?.decided_at,
        actor: appeal.warden_decision?.decided_by?.email,
        description: appeal.warden_decision
          ? `${appeal.warden_decision.outcome}: ${appeal.warden_decision.reason}`
          : appeal.escalation_reason || undefined,
      },
      {
        id: "chief_warden_review",
        label: "Chief Warden Review",
        status:
          appeal.status === "chief_warden_review"
            ? "current"
            : appeal.chief_warden_decision
              ? "completed"
              : appeal.status === "upheld" || appeal.status === "partly_upheld"
                ? "skipped"
                : "upcoming",
        timestamp: appeal.chief_warden_decision?.decided_at,
        actor: appeal.chief_warden_decision?.decided_by?.email,
        description: appeal.chief_warden_decision
          ? `${appeal.chief_warden_decision.outcome}: ${appeal.chief_warden_decision.reason}`
          : undefined,
      },
      {
        id: "outcome",
        label: appeal.final_outcome
          ? appeal.final_outcome === "upheld"
            ? "Appeal Upheld"
            : appeal.final_outcome === "partly_upheld"
              ? "Partly Upheld"
              : "Appeal Rejected"
          : "Final Decision",
        status:
          appeal.final_outcome === "upheld" || appeal.final_outcome === "partly_upheld"
            ? "completed"
            : appeal.final_outcome === "rejected"
              ? "failed"
              : "upcoming",
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
              <Scale className="h-6 w-6 text-violet-400" />
              Appeals
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Appeal your allocation decision with supporting evidence.
            </p>
          </div>
          <Button
            id="new-appeal-btn"
            onClick={() => setShowForm(!showForm)}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            <FileText className="mr-2 h-4 w-4" />
            File Appeal
          </Button>
        </div>

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

        {/* Appeal Form */}
        {showForm && (
          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur-sm">
            <h3 className="mb-2 text-lg font-semibold text-white">File an Appeal</h3>
            <p className="mb-4 text-xs text-zinc-500">
              Your appeal will be reviewed within 3 working days. SLA is monitored and
              auto-escalated.
            </p>

            {/* Explanation notice */}
            <div className="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <p className="flex items-center gap-1 text-xs font-medium text-blue-400">
                <Info className="h-3 w-3" />
                Your allocation explanation will be displayed alongside the appeal for the reviewer.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Appeal Statement
                </label>
                <textarea
                  id="appeal-statement"
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Explain why you believe your allocation should be reconsidered (at least 20 characters)..."
                  rows={4}
                />
                <p
                  className={`mt-1 text-xs ${statement.trim().length >= 20 ? "text-emerald-400" : "text-zinc-500"}`}
                >
                  {statement.trim().length}/20 characters minimum
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  id="submit-appeal"
                  onClick={handleSubmit}
                  disabled={submitting || statement.trim().length < 20}
                  className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Appeal
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setStatement("");
                  }}
                  className="border-zinc-700 text-zinc-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Appeals List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        ) : appeals.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <Scale className="mx-auto h-12 w-12 text-zinc-700" />
            <p className="mt-4 text-zinc-400">No appeals filed yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appeals.map((appeal) => {
              const daysRemaining = Math.max(
                0,
                Math.ceil(
                  (new Date(appeal.sla_due_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                ),
              );
              const breached = new Date(appeal.sla_due_at).getTime() < Date.now();
              const isActive = ["warden_review", "chief_warden_review"].includes(appeal.status);

              return (
                <div
                  key={appeal._id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm transition-all hover:border-zinc-700 cursor-pointer"
                  onClick={() => fetchDetail(appeal._id)}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-zinc-300 line-clamp-2">{appeal.statement}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        Filed{" "}
                        {new Date(appeal.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusChip status={appeal.status} size="md" />
                      {isActive && <SlaBadge daysRemaining={daysRemaining} breached={breached} />}
                    </div>
                  </div>

                  {appeal.escalation_reason && (
                    <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
                      <p className="flex items-center gap-1 text-[10px] font-medium text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        {appeal.escalation_reason}
                      </p>
                    </div>
                  )}

                  <Timeline steps={buildAppealTimeline(appeal)} compact />
                </div>
              );
            })}
          </div>
        )}

        {/* Detail Modal */}
        {selectedDetail && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedDetail(null)}
          >
            <div
              className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Appeal Detail</h3>
                <div className="flex items-center gap-2">
                  <StatusChip status={selectedDetail.appeal.status} size="md" />
                  <SlaBadge
                    daysRemaining={selectedDetail.slaInfo.daysRemaining}
                    breached={selectedDetail.slaInfo.breached}
                  />
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-medium text-zinc-400 mb-1">Your Statement</p>
                <p className="text-sm text-zinc-200">{selectedDetail.appeal.statement}</p>
              </div>

              {selectedDetail.explanation && (
                <div className="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                  <p className="text-xs font-medium text-blue-400 mb-1">
                    <Info className="inline h-3 w-3 mr-1" />
                    Why You Were Assigned This Room
                  </p>
                  <p className="text-sm text-zinc-300">{selectedDetail.explanation}</p>
                </div>
              )}

              <Timeline steps={buildAppealTimeline(selectedDetail.appeal)} />

              {selectedDetail.appeal.warden_decision && (
                <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <p className="text-xs font-medium text-zinc-400">Warden Decision</p>
                  <StatusChip status={selectedDetail.appeal.warden_decision.outcome} size="sm" />
                  <p className="mt-1 text-sm text-zinc-300">
                    {selectedDetail.appeal.warden_decision.reason}
                  </p>
                </div>
              )}

              {selectedDetail.appeal.chief_warden_decision && (
                <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <p className="text-xs font-medium text-zinc-400">Chief Warden Decision</p>
                  <StatusChip
                    status={selectedDetail.appeal.chief_warden_decision.outcome}
                    size="sm"
                  />
                  <p className="mt-1 text-sm text-zinc-300">
                    {selectedDetail.appeal.chief_warden_decision.reason}
                  </p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedDetail(null)}
                  className="border-zinc-700 text-zinc-300"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
