"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
    "transition-colors duration-180 ease-standard",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  ],
  {
    variants: {
      variant: {
        default:     "bg-brand-600 text-white hover:bg-brand-700",
        secondary:   "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
        outline:     "border border-border text-text bg-transparent",
        destructive: "bg-danger text-white",
        success:     "bg-success text-white",
        warning:     "bg-warning text-black dark:text-black",
        info:        "bg-info text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
