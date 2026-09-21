"use client";

import * as React from "react";
import { StatusChip, SlaBadge } from "@/components/changes/timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Scale,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  AlertTriangle,
  Info,
  Shield,
} from "lucide-react";

interface Appeal {
  _id: string;
  student_id: string;
  statement: string;
  status: string;
  evidence_keys: string[];
  sla_due_at: string;
  sla_config_days: number;
  current_reviewer_role: string;
  warden_decision?: { outcome: string; reason: string };
  chief_warden_decision?: { outcome: string; reason: string };
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

export default function WardenAppealsPage() {
  const [appeals, setAppeals] = React.useState<Appeal[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [decideTarget, setDecideTarget] = React.useState<AppealDetail | null>(null);
  const [outcome, setOutcome] = React.useState<"upheld" | "partly_upheld" | "rejected">("upheld");
  const [reason, setReason] = React.useState("");
  const [decideLoading, setDecideLoading] = React.useState(false);
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

  const openDecisionPanel = async (appeal: Appeal) => {
    try {
      const res = await fetch(`/api/v1/appeals/${appeal._id}`);
      if (res.ok) {
        const data = await res.json();
        setDecideTarget(data);
      }
    } catch {
      setError("Failed to load appeal details.");
    }
  };

  const handleDecide = async () => {
    if (!decideTarget || reason.trim().length < 10) {
      setError("Decision reason must be at least 10 characters.");
      return;
    }
    setDecideLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/appeals/${decideTarget.appeal._id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, reason }),
      });
      if (res.ok) {
        setSuccess(`Appeal ${outcome.replace("_", " ")}!`);
        setDecideTarget(null);
        setReason("");
        void fetchAppeals();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to decide.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setDecideLoading(false);
    }
  };

  const filtered = appeals.filter((a) =>
    searchQuery
      ? a.student_id.includes(searchQuery) ||
        a.statement.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  // Sort by SLA urgency (most urgent first)
  const sorted = [...filtered].sort((a, b) => {
    const aTime = new Date(a.sla_due_at).getTime();
    const bTime = new Date(b.sla_due_at).getTime();
    return aTime - bTime;
  });

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Scale className="h-6 w-6 text-violet-400" />
            Appeal Queue
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Review appeals sorted by SLA urgency. Overdue appeals are highlighted.
          </p>
        </div>

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> {success}
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            <XCircle className="h-4 w-4" /> {error}
            <button onClick={() => setError(null)} className="ml-auto hover:text-red-300">
              ×
            </button>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student ID or statement..."
              className="pl-10 bg-zinc-900 border-zinc-800 text-white"
            />
          </div>
        </div>

        {/* Appeals Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <Scale className="mx-auto h-12 w-12 text-zinc-700" />
            <p className="mt-4 text-zinc-400">No appeals in your queue.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((appeal) => {
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
                  className={`rounded-xl border p-5 backdrop-blur-sm transition-all hover:border-zinc-600 ${
                    breached && isActive
                      ? "border-red-500/40 bg-red-500/5"
                      : "border-zinc-800 bg-zinc-900/70"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-zinc-500">
                          Student ...{appeal.student_id.slice(-6)}
                        </span>
                        <StatusChip status={appeal.status} />
                        {isActive && <SlaBadge daysRemaining={daysRemaining} breached={breached} />}
                      </div>
                      <p className="text-sm text-zinc-200 line-clamp-2">{appeal.statement}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-zinc-600">
                        <span>
                          Filed{" "}
                          {new Date(appeal.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {appeal.evidence_keys.length > 0 && (
                          <span className="text-blue-400">
                            {appeal.evidence_keys.length} attachment(s)
                          </span>
                        )}
                      </div>
                    </div>

                    {isActive && (
                      <Button
                        size="sm"
                        onClick={() => openDecisionPanel(appeal)}
                        className="bg-violet-600 hover:bg-violet-700 text-xs ml-4"
                      >
                        <Shield className="mr-1 h-3 w-3" /> Review & Decide
                      </Button>
                    )}
                  </div>

                  {appeal.escalation_reason && (
                    <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
                      <p className="flex items-center gap-1 text-[10px] font-medium text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        Auto-escalated: {appeal.escalation_reason}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Decision Modal */}
        {decideTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setDecideTarget(null)}
          >
            <div
              className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Review Appeal</h3>
                <SlaBadge
                  daysRemaining={decideTarget.slaInfo.daysRemaining}
                  breached={decideTarget.slaInfo.breached}
                />
              </div>

              {/* Student Statement */}
              <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <p className="text-xs font-medium text-zinc-400 mb-1">Student Statement</p>
                <p className="text-sm text-zinc-200">{decideTarget.appeal.statement}</p>
              </div>

              {/* Allocation Explanation */}
              {decideTarget.explanation && (
                <div className="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                  <p className="flex items-center gap-1 text-xs font-medium text-blue-400 mb-1">
                    <Info className="h-3 w-3" /> Allocation Explanation
                  </p>
                  <p className="text-sm text-zinc-300">{decideTarget.explanation}</p>
                </div>
              )}

              {/* Evidence */}
              {decideTarget.appeal.evidence_keys.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-zinc-400 mb-1">Evidence Files</p>
                  <div className="flex flex-wrap gap-1">
                    {decideTarget.appeal.evidence_keys.map((key, i) => (
                      <span
                        key={i}
                        className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-blue-400"
                      >
                        {key.split("/").pop()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Decision Form */}
              <div className="space-y-4 border-t border-zinc-800 pt-4">
                <p className="text-sm font-semibold text-white">Your Decision</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["upheld", "partly_upheld", "rejected"] as const).map((o) => (
                    <Button
                      key={o}
                      size="sm"
                      onClick={() => setOutcome(o)}
                      className={`text-xs ${
                        outcome === o
                          ? o === "upheld"
                            ? "bg-emerald-600"
                            : o === "partly_upheld"
                              ? "bg-sky-600"
                              : "bg-red-600"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {o === "upheld"
                        ? "Upheld"
                        : o === "partly_upheld"
                          ? "Partly Upheld"
                          : "Rejected"}
                    </Button>
                  ))}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-300">
                    Written Reason
                  </label>
                  <textarea
                    id="appeal-decision-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                    placeholder="Provide your written reason (≥10 chars)..."
                    rows={3}
                  />
                  <p
                    className={`mt-1 text-xs ${reason.trim().length >= 10 ? "text-emerald-400" : "text-zinc-500"}`}
                  >
                    {reason.trim().length}/10 characters minimum
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDecideTarget(null)}
                    className="border-zinc-700 text-zinc-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    id="confirm-appeal-decision"
                    onClick={handleDecide}
                    disabled={decideLoading || reason.trim().length < 10}
                    className={
                      outcome === "upheld"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : outcome === "partly_upheld"
                          ? "bg-sky-600 hover:bg-sky-700"
                          : "bg-red-600 hover:bg-red-700"
                    }
                  >
                    {decideLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Decision
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
