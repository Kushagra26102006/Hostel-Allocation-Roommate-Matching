"use client";

import * as React from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusType =
  | "online"
  | "offline"
  | "pending"
  | "warning"
  | "error"
  | "success";

const STATUS_CONFIG: Record<
  StatusType,
  { icon: React.ElementType; label: string; className: string }
> = {
  online: {
    icon: Wifi,
    label: "Online",
    className: "text-success bg-success/10 border-success/20",
  },
  offline: {
    icon: WifiOff,
    label: "Offline",
    className: "text-muted bg-muted/10 border-muted/20",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    className: "text-warning bg-warning/10 border-warning/20",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    className: "text-warning bg-warning/10 border-warning/20",
  },
  error: {
    icon: XCircle,
    label: "Error",
    className: "text-danger bg-danger/10 border-danger/20",
  },
  success: {
    icon: CheckCircle2,
    label: "Success",
    className: "text-success bg-success/10 border-success/20",
  },
};

interface StatusChipProps {
  status: StatusType;
  /** Override the default label text */
  label?: string;
  className?: string;
}

/**
 * StatusChip — always shows icon + text, never colour alone.
 * Meets WCAG 1.4.1 (Use of Colour) by ensuring status is conveyed
 * via both icon shape and text, not only colour.
 */
export function StatusChip({ status, label, className }: StatusChipProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const displayLabel = label ?? config.label;

  return (
    <span
      role="status"
      aria-label={`Status: ${displayLabel}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        "text-xs font-medium",
        config.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{displayLabel}</span>
    </span>
  );
}
