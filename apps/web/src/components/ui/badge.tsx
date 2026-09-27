"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-tight",
    "transition-colors duration-180 ease-standard select-none",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-brand-50 text-brand-700 border border-brand-200/80 dark:bg-brand-950/50 dark:text-brand-300 dark:border-brand-800/40",
        solid: "bg-brand-500 text-white shadow-xs font-semibold",
        secondary:
          "bg-surface-muted text-foreground/80 border border-border/70 dark:bg-surface-muted/40",
        outline: "border border-border text-foreground bg-transparent",
        destructive:
          "bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/30",
        success:
          "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/30",
        warning:
          "bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/30",
        info: "bg-brand-50 text-brand-700 border border-brand-200/80 dark:bg-brand-950/40 dark:text-brand-300 dark:border-brand-800/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  const dotColor = {
    default: "bg-brand-500",
    solid: "bg-white",
    secondary: "bg-muted",
    outline: "bg-muted",
    destructive: "bg-rose-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    info: "bg-brand-500",
  }[variant ?? "default"];

  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className={cn("size-1.5 rounded-full shrink-0", dotColor)} aria-hidden="true" />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
