"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertCircle, XCircle, ArrowRight } from "lucide-react";

export interface TimelineStep {
  id: string;
  label: string;
  description?: string | undefined;
  status: "completed" | "current" | "upcoming" | "failed" | "skipped";
  timestamp?: string | undefined;
  actor?: string | undefined;
}

interface TimelineProps {
  steps: TimelineStep[];
  orientation?: "vertical" | "horizontal";
  compact?: boolean;
}

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500",
    textColor: "text-emerald-400",
    lineColor: "bg-emerald-500",
    dotColor: "bg-emerald-500",
  },
  current: {
    icon: Clock,
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500",
    textColor: "text-amber-400",
    lineColor: "bg-zinc-700",
    dotColor: "bg-amber-500",
  },
  upcoming: {
    icon: ArrowRight,
    bgColor: "bg-zinc-800/50",
    borderColor: "border-zinc-700",
    textColor: "text-zinc-500",
    lineColor: "bg-zinc-800",
    dotColor: "bg-zinc-700",
  },
  failed: {
    icon: XCircle,
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500",
    textColor: "text-red-400",
    lineColor: "bg-red-500/40",
    dotColor: "bg-red-500",
  },
  skipped: {
    icon: AlertCircle,
    bgColor: "bg-zinc-800/30",
    borderColor: "border-zinc-600",
    textColor: "text-zinc-500",
    lineColor: "bg-zinc-800",
    dotColor: "bg-zinc-600",
  },
};

export function Timeline({ steps, orientation = "vertical", compact = false }: TimelineProps) {
  if (orientation === "horizontal") {
    return <HorizontalTimeline steps={steps} compact={compact} />;
  }
  return <VerticalTimeline steps={steps} compact={compact} />;
}

function VerticalTimeline({ steps, compact }: { steps: TimelineStep[]; compact: boolean }) {
  return (
    <div className="relative flex flex-col gap-0">
      {steps.map((step, index) => {
        const config = statusConfig[step.status];
        const Icon = config.icon;
        const isLast = index === steps.length - 1;

        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className="relative flex gap-4"
          >
            {/* Connector line + dot */}
            <div className="flex flex-col items-center">
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${config.borderColor} ${config.bgColor} transition-all duration-300`}
              >
                <Icon className={`h-4 w-4 ${config.textColor}`} />
                {step.status === "current" && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-amber-500/30" />
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 min-h-[24px] ${config.lineColor} transition-all duration-500`}
                />
              )}
            </div>

            {/* Content */}
            <div className={`pb-6 ${compact ? "pt-0.5" : "pt-1"}`}>
              <h4
                className={`text-sm font-semibold ${
                  step.status === "upcoming" ? "text-zinc-500" : "text-zinc-100"
                }`}
              >
                {step.label}
              </h4>
              {step.description && !compact && (
                <p className="mt-0.5 text-xs text-zinc-400">{step.description}</p>
              )}
              {step.timestamp && (
                <p className="mt-0.5 text-xs text-zinc-600">
                  {new Date(step.timestamp).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {step.actor && ` · ${step.actor}`}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function HorizontalTimeline({ steps, compact }: { steps: TimelineStep[]; compact: boolean }) {
  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-2">
      {steps.map((step, index) => {
        const config = statusConfig[step.status];
        const Icon = config.icon;
        const isLast = index === steps.length - 1;

        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.25 }}
            className="flex items-center"
          >
            <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${config.borderColor} ${config.bgColor}`}
              >
                <Icon className={`h-3.5 w-3.5 ${config.textColor}`} />
                {step.status === "current" && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-amber-500/20" />
                )}
              </div>
              <span
                className={`text-[10px] font-medium text-center leading-tight max-w-[72px] ${
                  step.status === "upcoming" ? "text-zinc-600" : "text-zinc-300"
                }`}
              >
                {step.label}
              </span>
              {!compact && step.timestamp && (
                <span className="text-[9px] text-zinc-600">
                  {new Date(step.timestamp).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              )}
            </div>
            {!isLast && <div className={`h-0.5 w-8 mt-[-16px] ${config.lineColor}`} />}
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Status Chip ───────────────────────────────────────────────────────────────

export interface StatusChipProps {
  status: string;
  size?: "sm" | "md";
}

const chipColors: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  proposed: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  submitted: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  warden_review: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  chief_warden_review: {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/30",
  },
  approved: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  upheld: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  partly_upheld: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30" },
  rejected: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  failed: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  cancelled: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/30" },
  counterpart_accepted: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30" },
  validated: { bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/30" },
};

const chipLabels: Record<string, string> = {
  pending: "Pending",
  proposed: "Proposed",
  submitted: "Submitted",
  warden_review: "Warden Review",
  chief_warden_review: "Chief Warden Review",
  approved: "Approved",
  completed: "Completed",
  upheld: "Upheld",
  partly_upheld: "Partly Upheld",
  rejected: "Rejected",
  failed: "Failed",
  cancelled: "Cancelled",
  counterpart_accepted: "Accepted",
  validated: "Validated",
};

export function StatusChip({ status, size = "sm" }: StatusChipProps) {
  const colors = chipColors[status] ?? {
    bg: "bg-zinc-800",
    text: "text-zinc-400",
    border: "border-zinc-700",
  };
  const label =
    chipLabels[status] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center rounded-full border ${colors.bg} ${colors.text} ${colors.border} font-medium ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      }`}
    >
      {label}
    </span>
  );
}

// ─── SLA Badge ─────────────────────────────────────────────────────────────────

interface SlaBadgeProps {
  daysRemaining: number;
  breached: boolean;
}

export function SlaBadge({ daysRemaining, breached }: SlaBadgeProps) {
  if (breached) {
    return (
      <motion.span
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="inline-flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[10px] font-bold text-red-400"
      >
        <AlertCircle className="h-3 w-3" />
        SLA BREACHED ({Math.abs(daysRemaining)}d overdue)
      </motion.span>
    );
  }

  const urgency =
    daysRemaining <= 1
      ? "bg-red-500/10 border-red-500/30 text-red-400"
      : daysRemaining <= 2
        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${urgency}`}
    >
      <Clock className="h-3 w-3" />
      {daysRemaining} working day{daysRemaining !== 1 ? "s" : ""} left
    </span>
  );
}
