"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { AnimatedNumber } from "@/components/animated-number";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  prefix?: string;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  variant?: "default" | "brand" | "success" | "warning" | "danger" | "accent";
  className?: string;
}

export function StatCard({
  title,
  value,
  suffix = "",
  prefix = "",
  description,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  const isNumeric = typeof value === "number";

  // Professional neutral surfaces with subtle brand or status cues
  const variantStyles = {
    default: "bg-surface border-border/70 hover:border-brand-500/30",
    brand: "bg-surface border-brand-500/30 hover:border-brand-500/50",
    accent: "bg-surface border-brand-500/30 hover:border-brand-500/50",
    success: "bg-surface border-border/70 hover:border-emerald-500/30",
    warning: "bg-surface border-border/70 hover:border-amber-500/30",
    danger: "bg-surface border-border/70 hover:border-rose-500/30",
  };

  const iconColorStyles = {
    default: "bg-surface-muted text-muted-foreground",
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400",
    accent: "bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400",
    success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    warning: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    danger: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
  };

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between rounded-card border p-5 shadow-xs transition-all duration-200 hover:-translate-y-[2px] hover:shadow-md",
        variantStyles[variant],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">{title}</span>
        {Icon && (
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
              iconColorStyles[variant],
            )}
          >
            <Icon className="h-4 w-4 stroke-[1.8]" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        {prefix && <span className="text-base font-semibold text-muted">{prefix}</span>}
        <span className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {isNumeric ? <AnimatedNumber to={value as number} /> : value}
        </span>
        {suffix && <span className="text-sm font-medium text-muted">{suffix}</span>}
      </div>

      {(trend || description) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-3 text-xs">
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 font-medium",
                trend.isPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400",
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span>
                {trend.isPositive ? "+" : ""}
                {trend.value}%
              </span>
              {trend.label && <span className="text-muted ml-0.5">{trend.label}</span>}
            </div>
          )}
          {description && <span className="text-muted line-clamp-1 ml-auto">{description}</span>}
        </div>
      )}
    </div>
  );
}

/** MetricCard is an alias for StatCard to provide canonical component API */
export const MetricCard = StatCard;
