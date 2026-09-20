"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Sparkles, Accessibility, History, User, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface WaitlistEntryItem {
  id: string;
  draft_id: string;
  application_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  reference_number: string;
  gender: string;
  programme: string;
  year: number;
  accessibility_need: boolean;
  position: number;
  priority_score: number;
  quota_bucket: string;
  status: string;
  waiting_reason_code: string;
  reorder_history?: Array<{
    previousPosition: number;
    newPosition: number;
    reason: string;
    actor: { id: string; email: string; role: string };
    timestamp: string;
  }>;
}

interface WaitlistTableProps {
  entries: WaitlistEntryItem[];
  onOpenReorder: (entry: WaitlistEntryItem) => void;
  onOpenManualPromote: (entry: WaitlistEntryItem) => void;
  isActionDisabled?: boolean;
}

function getReasonCodeDetails(code: string): {
  label: string;
  description: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
} {
  switch (code) {
    case "ACCESSIBLE_ROOM_CAPACITY_REACHED":
    case "ACCESSIBILITY_MISMATCH":
      return {
        label: "Accessible Bed Required",
        description:
          "Student requires ground-floor/wheelchair accessibility. All accessible rooms currently assigned.",
        variant: "outline",
        className: "border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-500/10",
      };
    case "HC4_GENDER_MISMATCH":
    case "FEMALE_WING_AT_CAPACITY":
      return {
        label: "Gender Wing Full",
        description:
          "Assigned block gender policy restriction; awaiting vacancy in matching gender wing.",
        variant: "outline",
        className: "border-pink-500/40 text-pink-600 dark:text-pink-400 bg-pink-500/10",
      };
    case "HC11_DEALBREAKER_CONFLICT":
    case "MUTUAL_DEALBREAKER":
      return {
        label: "Dealbreaker Conflict",
        description:
          "Mutual deal-breaker pairing prevents placement with current vacant room occupants.",
        variant: "outline",
        className: "border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10",
      };
    case "HC7_PROGRAMME_MISMATCH":
      return {
        label: "Cohort Restriction",
        description: "Vacant room cohort filter requires specific academic program or year.",
        variant: "outline",
        className: "border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",
      };
    case "QUOTA_EXHAUSTED":
    default:
      return {
        label: "Quota Exhausted",
        description:
          "Category quota budget limit reached in initial run; waiting for vacancy turnover.",
        variant: "outline",
        className: "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10",
      };
  }
}

export function WaitlistTable({
  entries,
  onOpenReorder,
  onOpenManualPromote,
  isActionDisabled = false,
}: WaitlistTableProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card p-6">
        <User className="w-10 h-10 stroke-1 text-muted-foreground/60 mb-3" />
        <h3 className="text-base font-semibold text-foreground">Waiting List is Empty</h3>
        <p className="text-xs text-muted-foreground max-w-sm mt-1">
          All eligible applications have either been allocated to hostel beds or there are no active
          waitlist units for this cycle.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4 w-24">Priority #</th>
                <th className="py-3 px-4 min-w-[200px]">Applicant & Reference</th>
                <th className="py-3 px-4 min-w-[120px]">Category & Score</th>
                <th className="py-3 px-4 min-w-[220px]">Why is this student waiting?</th>
                <th className="py-3 px-4 min-w-[100px]">Status</th>
                <th className="py-3 px-4 text-right w-44">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence>
                {entries.map((entry) => {
                  const reason = getReasonCodeDetails(entry.waiting_reason_code);
                  const hasReorderHistory =
                    entry.reorder_history && entry.reorder_history.length > 0;

                  return (
                    <motion.tr
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Position Badge with Reorder handles */}
                      <td className="py-3 px-4 font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-md text-xs font-bold ${
                              entry.position === 1
                                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                : entry.position === 2
                                  ? "bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/30"
                                  : entry.position === 3
                                    ? "bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30"
                                    : "bg-muted text-muted-foreground border"
                            }`}
                          >
                            #{entry.position}
                          </span>

                          <button
                            type="button"
                            title="Adjust Priority Position"
                            onClick={() => onOpenReorder(entry)}
                            disabled={isActionDisabled}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded text-muted-foreground transition-opacity"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Applicant details */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {entry.student_name}
                            </span>
                            {entry.accessibility_need && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex p-0.5 rounded bg-sky-500/10 text-sky-500">
                                    <Accessibility className="w-3.5 h-3.5" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Requires accessible bed (HC6)</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
                            <span>{entry.reference_number}</span>
                            <span>•</span>
                            <span>
                              {entry.programme} (Y{entry.year})
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category & Score */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <Badge variant="secondary" className="text-[10px] font-semibold">
                            {entry.quota_bucket}
                          </Badge>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            Priority Score:{" "}
                            <strong className="text-foreground">{entry.priority_score}</strong>
                          </div>
                        </div>
                      </td>

                      {/* Why Waiting Reason Badge & Tooltip */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant={reason.variant}
                                className={`cursor-help text-[11px] font-medium py-0.5 px-2 gap-1 ${reason.className}`}
                              >
                                <span>{reason.label}</span>
                                <Info className="w-3 h-3 shrink-0" />
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">
                              {reason.description}
                            </TooltipContent>
                          </Tooltip>

                          {hasReorderHistory && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-mono border-dashed gap-1 text-muted-foreground"
                                >
                                  <History className="w-2.5 h-2.5" />
                                  Reordered ({entry.reorder_history!.length}x)
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs space-y-1">
                                <p className="font-semibold">Reorder History:</p>
                                {entry.reorder_history!.map((h, idx) => (
                                  <div key={idx} className="border-t pt-1 text-[11px]">
                                    #{h.previousPosition} → #{h.newPosition}: &quot;{h.reason}&quot;
                                    by {h.actor.email}
                                  </div>
                                ))}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            entry.status === "promoted"
                              ? "default"
                              : entry.status === "proposal_pending"
                                ? "outline"
                                : "secondary"
                          }
                          className={`text-[10px] uppercase font-bold tracking-wider ${
                            entry.status === "promoted"
                              ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                              : entry.status === "proposal_pending"
                                ? "border-amber-500 text-amber-500 bg-amber-500/10"
                                : ""
                          }`}
                        >
                          {entry.status.replace("_", " ")}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenReorder(entry)}
                            disabled={isActionDisabled || entry.status === "promoted"}
                            className="h-7 text-xs gap-1 font-medium"
                          >
                            <ArrowUpDown className="w-3 h-3" />
                            Reorder
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => onOpenManualPromote(entry)}
                            disabled={isActionDisabled || entry.status === "promoted"}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-medium shadow-sm"
                          >
                            <Sparkles className="w-3 h-3" />
                            Promote
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}
