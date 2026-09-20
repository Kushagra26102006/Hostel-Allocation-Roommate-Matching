"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  /** Icon or illustration to display above the content */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * EmptyState — composable empty state with illustration slot,
 * heading, description, and optional CTA.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 px-8 text-center",
        className,
      )}
    >
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-hero bg-brand-100/60 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
          {icon}
        </div>
      )}
      <div className="space-y-1.5">
        <h3 className="font-heading text-lg font-semibold text-text">{title}</h3>
        {description && (
          <p className="text-sm text-muted max-w-sm">{description}</p>
        )}
      </div>
      {action && (
        <Button
          variant="primary"
          size="sm"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
