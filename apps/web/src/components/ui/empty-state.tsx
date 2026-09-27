"use client";

import * as React from "react";
import { FileText, Users, BellOff, Search, BedDouble, Clock, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode | undefined;
  title: string;
  description?: string | undefined;
  action?:
    | {
        label: string;
        onClick: () => void;
      }
    | undefined;
  secondaryAction?:
    | {
        label: string;
        onClick: () => void;
      }
    | undefined;
  className?: string | undefined;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center rounded-card border border-dashed border-border/70 bg-surface/50",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted text-muted border border-border/60 mb-3.5">
        {icon ?? <Inbox className="h-6 w-6 stroke-[1.75]" />}
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-muted leading-relaxed">{description}</p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-5">
          {secondaryAction && (
            <Button variant="secondary" size="sm" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button variant="primary" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* Preset Empty States */
export function NoApplicationsState({ onStart }: { onStart?: (() => void) | undefined }) {
  return (
    <EmptyState
      icon={<FileText className="h-6 w-6 text-brand-600" />}
      title="No active application found"
      description="You haven't submitted an accommodation application for the current academic cycle yet."
      action={onStart ? { label: "Start Application", onClick: onStart } : undefined}
    />
  );
}

export function NoRoommateGroupState({ onCreate }: { onCreate?: (() => void) | undefined }) {
  return (
    <EmptyState
      icon={<Users className="h-6 w-6 text-brand-600" />}
      title="No roommate group formed"
      description="You are currently applying as an individual. You can create a group to invite friends or join an existing group."
      action={onCreate ? { label: "Create Roommate Group", onClick: onCreate } : undefined}
    />
  );
}

export function NoNotificationsState() {
  return (
    <EmptyState
      icon={<BellOff className="h-6 w-6 text-muted" />}
      title="All caught up"
      description="You don't have any unread announcements, status updates, or notifications at this time."
    />
  );
}

export function NoSearchResultsState({ onReset }: { onReset?: (() => void) | undefined }) {
  return (
    <EmptyState
      icon={<Search className="h-6 w-6 text-muted" />}
      title="No matches found"
      description="We couldn't find any results matching your search filters. Try adjusting your query or resetting filters."
      action={onReset ? { label: "Clear Filters", onClick: onReset } : undefined}
    />
  );
}

export function NoAllocationState({ onCheckStatus }: { onCheckStatus?: (() => void) | undefined }) {
  return (
    <EmptyState
      icon={<BedDouble className="h-6 w-6 text-brand-600" />}
      title="Allocation pending"
      description="The deterministic allocation algorithm has not yet finalized room assignments for this cycle."
      action={onCheckStatus ? { label: "View Timeline", onClick: onCheckStatus } : undefined}
    />
  );
}

export function NoWaitlistState() {
  return (
    <EmptyState
      icon={<Clock className="h-6 w-6 text-muted" />}
      title="Waitlist is empty"
      description="All eligible applicants have been assigned rooms or the waitlist pool has cleared."
    />
  );
}
