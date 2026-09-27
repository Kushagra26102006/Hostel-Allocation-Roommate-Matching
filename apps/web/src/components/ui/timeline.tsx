"use client";

import * as React from "react";
import { CheckCircle2, Clock, AlertCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  id?: string;
  title: string;
  description?: string;
  date?: string;
  status: "completed" | "current" | "pending" | "failed";
}

export interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <div
      className={cn(
        "relative space-y-6 pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60",
        className,
      )}
    >
      {items.map((item, index) => {
        const isCompleted = item.status === "completed";
        const isCurrent = item.status === "current";
        const isFailed = item.status === "failed";

        return (
          <div key={item.id || index} className="relative group">
            {/* Dot / Icon indicator */}
            <div
              className={cn(
                "absolute -left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-background ring-4 ring-background transition-all duration-300",
                isCompleted && "text-emerald-600 dark:text-emerald-400",
                isCurrent && "text-brand-600 dark:text-brand-400 animate-pulse",
                isFailed && "text-rose-600 dark:text-rose-400",
                item.status === "pending" && "text-muted-foreground/50",
              )}
            >
              {isCompleted && <CheckCircle2 className="h-4 w-4" />}
              {isCurrent && <Clock className="h-4 w-4 fill-brand-500/20" />}
              {isFailed && <AlertCircle className="h-4 w-4" />}
              {item.status === "pending" && <Circle className="h-3 w-3" />}
            </div>

            {/* Content */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    isCurrent ? "text-brand-600 dark:text-brand-400" : "text-foreground",
                  )}
                >
                  {item.title}
                </span>
                {item.date && (
                  <span className="text-[11px] font-medium text-muted-foreground">{item.date}</span>
                )}
              </div>

              {item.description && (
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
