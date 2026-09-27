"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertTriangle, XCircle, ShieldAlert, Sparkles } from "lucide-react";

export type StatusType =
  | "allocated"
  | "submitted"
  | "draft"
  | "under_review"
  | "eligible"
  | "ineligible"
  | "waitlisted"
  | "approved"
  | "published"
  | "rejected"
  | "promoted"
  | "available"
  | "held"
  | "assigned"
  | "out_of_service"
  | "conflict";

export interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, label, size = "sm", className }: StatusBadgeProps) {
  const norm = status.toLowerCase();

  const configs: Record<string, { label: string; icon: React.ReactNode; styles: string }> = {
    allocated: {
      label: "Allocated",
      icon: <Sparkles className="h-3 w-3" />,
      styles: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    },
    published: {
      label: "Published",
      icon: <CheckCircle2 className="h-3 w-3" />,
      styles: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    },
    approved: {
      label: "Approved",
      icon: <CheckCircle2 className="h-3 w-3" />,
      styles: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    },
    submitted: {
      label: "Submitted",
      icon: <Clock className="h-3 w-3" />,
      styles: "bg-brand-500/15 text-brand-700 dark:text-brand-300 border-brand-500/30",
    },
    under_review: {
      label: "Under Review",
      icon: <Clock className="h-3 w-3" />,
      styles: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    },
    draft: {
      label: "Draft",
      icon: <Clock className="h-3 w-3" />,
      styles: "bg-surface-muted text-muted-foreground border-border/80",
    },
    waitlisted: {
      label: "Waitlisted",
      icon: <AlertTriangle className="h-3 w-3" />,
      styles: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    },
    rejected: {
      label: "Rejected",
      icon: <XCircle className="h-3 w-3" />,
      styles: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    },
    ineligible: {
      label: "Ineligible",
      icon: <XCircle className="h-3 w-3" />,
      styles: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    },
    available: {
      label: "Available",
      icon: <CheckCircle2 className="h-3 w-3" />,
      styles: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    },
    assigned: {
      label: "Assigned",
      icon: <CheckCircle2 className="h-3 w-3" />,
      styles: "bg-brand-500/15 text-brand-700 dark:text-brand-300 border-brand-500/30",
    },
    held: {
      label: "Held",
      icon: <Clock className="h-3 w-3" />,
      styles: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    },
    out_of_service: {
      label: "Out of Service",
      icon: <ShieldAlert className="h-3 w-3" />,
      styles: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    },
    conflict: {
      label: "Conflict",
      icon: <AlertTriangle className="h-3 w-3" />,
      styles: "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 animate-pulse",
    },
  };

  const item = configs[norm] || {
    label: status.replace(/_/g, " "),
    icon: <Clock className="h-3 w-3" />,
    styles: "bg-surface-muted text-muted-foreground border-border/80",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide capitalize",
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        item.styles,
        className,
      )}
    >
      {item.icon}
      <span>{label || item.label}</span>
    </span>
  );
}
