"use client";

import * as React from "react";
import {
  CheckCircle2,
  Clock,
  UserCheck,
  AlertTriangle,
  Wrench,
  BookmarkCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type InventoryStatus =
  | "available"
  | "held"
  | "occupied"
  | "out_of_service"
  | "maintenance"
  | "reserved"
  | "full"
  | "active"
  | "inactive";

interface StatusChipProps {
  status: InventoryStatus | string;
  size?: "sm" | "md";
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; bg: string; text: string; border: string }
> = {
  available: {
    label: "Available",
    icon: CheckCircle2,
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/25",
  },
  held: {
    label: "Held",
    icon: Clock,
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-500/25",
  },
  occupied: {
    label: "Occupied",
    icon: UserCheck,
    bg: "bg-sky-500/10 dark:bg-sky-500/15",
    text: "text-sky-700 dark:text-sky-400",
    border: "border-sky-500/25",
  },
  out_of_service: {
    label: "Out of Service",
    icon: AlertTriangle,
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-500/25",
  },
  maintenance: {
    label: "Maintenance",
    icon: Wrench,
    bg: "bg-purple-500/10 dark:bg-purple-500/15",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-500/25",
  },
  reserved: {
    label: "Reserved",
    icon: BookmarkCheck,
    bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-500/25",
  },
  full: {
    label: "Full",
    icon: UserCheck,
    bg: "bg-slate-500/10 dark:bg-slate-500/15",
    text: "text-slate-700 dark:text-slate-400",
    border: "border-slate-500/25",
  },
  active: {
    label: "Active",
    icon: CheckCircle2,
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/25",
  },
  inactive: {
    label: "Inactive",
    icon: AlertTriangle,
    bg: "bg-zinc-500/10 dark:bg-zinc-500/15",
    text: "text-zinc-700 dark:text-zinc-400",
    border: "border-zinc-500/25",
  },
};

export function StatusChip({ status, size = "sm", className }: StatusChipProps) {
  const normKey = status.toLowerCase();
  const config = STATUS_CONFIG[normKey] ?? {
    label: status,
    icon: CheckCircle2,
    bg: "bg-secondary/20",
    text: "text-secondary-foreground",
    border: "border-border",
  };

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors",
        config.bg,
        config.text,
        config.border,
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className,
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />
      <span>{config.label}</span>
    </span>
  );
}
