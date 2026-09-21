"use client";

import * as React from "react";
import { AlertOctagon, RefreshCw, CheckCircle2, Send } from "lucide-react";

interface DlqEntry {
  _id: string;
  event_id: string;
  event_type: string;
  recipient: string;
  channel: string;
  status: string;
  attempt_count: number;
  last_error?: string;
  error_stack?: string;
  updated_at: string;
}

export default function AdminDlqPage() {
  const [entries, setEntries] = React.useState<DlqEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [channelFilter, setChannelFilter] = React.useState("all");
  const [isLoading, setIsLoading] = React.useState(true);
  const [retryingId, setRetryingId] = React.useState<string | null>(null);
  const [isRetryingAll, setIsRetryingAll] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const fetchDlq = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (channelFilter !== "all") params.append("channel", channelFilter);

      const res = await fetch(`/api/v1/admin/notifications/dlq?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoading(false);
    }
  }, [page, channelFilter]);

  React.useEffect(() => {
    fetchDlq();
  }, [fetchDlq]);

  const handleRetrySingle = async (id: string) => {
    setRetryingId(id);
    try {
      const res = await fetch(`/api/v1/admin/notifications/dlq/${id}/retry`, {
        method: "POST",
      });
      if (res.ok) {
        setSuccessMessage("Notification queued for immediate retry.");
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchDlq();
      }
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetryAll = async () => {
    if (!confirm("Are you sure you want to retry all items currently in the Dead-Letter Queue?")) {
      return;
    }
    setIsRetryingAll(true);
    try {
      const res = await fetch("/api/v1/admin/notifications/dlq/retry-all", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setSuccessMessage(`Queued ${data.retriedCount ?? 0} dead-letter notifications for retry.`);
        setTimeout(() => setSuccessMessage(null), 4000);
        fetchDlq();
      }
    } finally {
      setIsRetryingAll(false);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-danger/10 text-danger">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold font-heading text-text">Dead-Letter Queue (DLQ)</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Exhausted notification delivery failures (5 consecutive attempts). Inspect failure
            traces and trigger manual retries.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={fetchDlq}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-btn border border-border bg-surface text-xs font-semibold text-text hover:bg-surface-elevated transition-colors shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleRetryAll}
            disabled={isRetryingAll || total === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-btn bg-danger text-xs font-semibold text-white hover:bg-danger/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isRetryingAll ? "Retrying All..." : `Retry All (${total})`}</span>
          </button>
        </div>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div className="mt-4 p-3.5 rounded-card bg-success/15 border border-success/30 text-success text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-semibold">Filter Channel:</span>
          {(["all", "email", "sms", "push", "webhook", "in_app"] as const).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => {
                setChannelFilter(ch);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors uppercase text-[10px] ${
                channelFilter === ch
                  ? "bg-text text-background font-bold"
                  : "bg-surface border border-border/70 text-muted hover:text-text"
              }`}
            >
              {ch}
            </button>
          ))}
        </div>

        <div className="text-xs text-muted font-mono">
          Total in DLQ: <span className="font-bold text-text">{total}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-card border border-border overflow-hidden shadow-sm mt-4">
        {entries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-text">Dead-Letter Queue is Empty</h3>
            <p className="text-xs text-muted mt-1">
              All multi-channel notification deliveries are operating cleanly without failed retry
              thresholds.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted uppercase text-[10px] tracking-wider bg-surface-elevated/40">
                  <th className="py-3 px-4">Event ID / Type</th>
                  <th className="py-3 px-3">Channel</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-3">Attempts</th>
                  <th className="py-3 px-4">Last Error Reason</th>
                  <th className="py-3 px-4">Last Attempted</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-surface-elevated/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-text">{entry.event_type}</div>
                      <div className="text-[10px] text-muted font-mono">{entry.event_id}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-elevated border border-border text-text">
                        {entry.channel}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-text max-w-[180px] truncate">
                      {entry.recipient}
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-danger/10 text-danger border border-danger/30">
                        {entry.attempt_count} / 5
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-[260px]">
                      <div
                        className="text-danger text-[11px] font-medium truncate"
                        title={entry.last_error}
                      >
                        {entry.last_error ?? "Unknown delivery error"}
                      </div>
                      {entry.error_stack && (
                        <div
                          className="text-[9px] text-muted font-mono truncate"
                          title={entry.error_stack}
                        >
                          {entry.error_stack.split("\n")[0]}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-muted text-[11px] font-mono whitespace-nowrap">
                      {new Date(entry.updated_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRetrySingle(entry._id)}
                        disabled={retryingId === entry._id}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded bg-brand-50 border border-brand-300 text-brand-700 hover:bg-brand-100 dark:bg-brand-950/40 dark:border-brand-800 dark:text-brand-300 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${retryingId === entry._id ? "animate-spin" : ""}`}
                        />
                        <span>Retry</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
