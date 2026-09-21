"use client";

import * as React from "react";
import { StatusChip } from "@/components/changes/timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRightLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Eye,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RoomChangeRequest {
  _id: string;
  student_id: string;
  reason: string;
  status: string;
  evidence_keys: string[];
  from_bed_id: string;
  from_room_id: string;
  from_hostel_id: string;
  decided_by?: { email: string };
  decision_reason?: string;
  decided_at?: string;
  createdAt: string;
}

export default function WardenRoomChangesPage() {
  const [requests, setRequests] = React.useState<RoomChangeRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState("pending");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [decideTarget, setDecideTarget] = React.useState<RoomChangeRequest | null>(null);
  const [decision, setDecision] = React.useState<"approved" | "rejected">("approved");
  const [reason, setReason] = React.useState("");
  const [targetBedId, setTargetBedId] = React.useState("");
  const [decideLoading, setDecideLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const fetchRequests = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/v1/room-changes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch {
      setError("Failed to load room change requests.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const handleDecide = async () => {
    if (!decideTarget || reason.trim().length < 10) {
      setError("Decision reason must be at least 10 characters.");
      return;
    }
    if (decision === "approved" && !targetBedId.trim()) {
      setError("Target bed ID is required for approval.");
      return;
    }
    setDecideLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/room-changes/${decideTarget._id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reason,
          target_bed_id: decision === "approved" ? targetBedId : undefined,
        }),
      });
      if (res.ok) {
        setSuccess(`Request ${decision}!`);
        setDecideTarget(null);
        setReason("");
        setTargetBedId("");
        void fetchRequests();
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

  const filtered = requests.filter((r) =>
    searchQuery
      ? r.student_id.includes(searchQuery) ||
        r.reason.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-indigo-400" />
            Room Change Requests
          </h1>
          <p className="mt-1 text-sm text-zinc-400">Review and decide on room change requests.</p>
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

        {/* Filters */}
        <div className="mb-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student ID or reason..."
              className="pl-10 bg-zinc-900 border-zinc-800 text-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800 text-white">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Requests Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <ArrowRightLeft className="mx-auto h-12 w-12 text-zinc-700" />
            <p className="mt-4 text-zinc-400">No requests found.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">
                    Evidence
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filtered.map((req) => (
                  <tr key={req._id} className="transition-colors hover:bg-zinc-900/30">
                    <td className="px-4 py-3 text-sm text-zinc-300 font-mono">
                      ...{req.student_id.slice(-6)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300 max-w-[200px] truncate">
                      {req.reason}
                    </td>
                    <td className="px-4 py-3">
                      {req.evidence_keys.length > 0 ? (
                        <span className="text-xs text-blue-400">
                          {req.evidence_keys.length} file(s)
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip status={req.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {new Date(req.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {req.status === "pending" ? (
                        <Button
                          size="sm"
                          onClick={() => setDecideTarget(req)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-xs"
                        >
                          <Eye className="mr-1 h-3 w-3" /> Decide
                        </Button>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Decision Modal */}
        {decideTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setDecideTarget(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-2 text-lg font-bold text-white">Decide Room Change Request</h3>
              <p className="mb-4 text-sm text-zinc-400">
                Student: ...{decideTarget.student_id.slice(-6)}
              </p>

              <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <p className="text-xs font-medium text-zinc-400">Reason:</p>
                <p className="text-sm text-zinc-300">{decideTarget.reason}</p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setDecision("approved")}
                    className={`flex-1 ${decision === "approved" ? "bg-emerald-600" : "bg-zinc-800 text-zinc-400"}`}
                  >
                    <ThumbsUp className="mr-1 h-3 w-3" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setDecision("rejected")}
                    className={`flex-1 ${decision === "rejected" ? "bg-red-600" : "bg-zinc-800 text-zinc-400"}`}
                  >
                    <ThumbsDown className="mr-1 h-3 w-3" /> Reject
                  </Button>
                </div>

                {decision === "approved" && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-300">
                      Target Bed ID
                    </label>
                    <Input
                      id="target-bed-id"
                      value={targetBedId}
                      onChange={(e) => setTargetBedId(e.target.value)}
                      placeholder="Enter target bed ID"
                      className="bg-zinc-800/50 border-zinc-700 text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-300">
                    Decision Reason
                  </label>
                  <textarea
                    id="decision-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-sm text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="Provide a reason for your decision (≥10 chars)..."
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
                    id="confirm-decision"
                    onClick={handleDecide}
                    disabled={decideLoading || reason.trim().length < 10}
                    className={
                      decision === "approved"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-red-600 hover:bg-red-700"
                    }
                  >
                    {decideLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm {decision === "approved" ? "Approval" : "Rejection"}
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
