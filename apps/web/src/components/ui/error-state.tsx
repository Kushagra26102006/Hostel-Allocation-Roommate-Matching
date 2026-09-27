"use client";

import * as React from "react";
import {
  AlertTriangle,
  ShieldAlert,
  ServerOff,
  WifiOff,
  Lock,
  RotateCcw,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  code?: string | number | undefined;
  title: string;
  description: string;
  icon?: React.ReactNode | undefined;
  onRetry?: (() => void) | undefined;
  onHome?: (() => void) | undefined;
  className?: string | undefined;
}

export function ErrorState({
  code,
  title,
  description,
  icon,
  onRetry,
  onHome,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center max-w-lg mx-auto",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 mb-4">
        {icon ?? <AlertTriangle className="h-7 w-7 stroke-[1.75]" />}
      </div>

      {code && (
        <span className="text-xs font-mono font-semibold text-muted uppercase tracking-widest mb-1">
          Error {code}
        </span>
      )}

      <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-2">
        {title}
      </h2>

      <p className="text-xs sm:text-sm text-muted leading-relaxed mb-6">{description}</p>

      <div className="flex items-center gap-3">
        {onRetry && (
          <Button variant="secondary" size="default" onClick={onRetry}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Try Again
          </Button>
        )}
        {onHome && (
          <Button variant="primary" size="default" onClick={onHome}>
            <Home className="mr-1.5 h-4 w-4" />
            Back to Home
          </Button>
        )}
      </div>
    </div>
  );
}

export function NotFoundError({ onHome }: { onHome?: (() => void) | undefined }) {
  return (
    <ErrorState
      code="404"
      icon={<AlertTriangle className="h-7 w-7 stroke-[1.75]" />}
      title="Page Not Found"
      description="The accommodation resource, room record, or page you are looking for does not exist or has been relocated."
      onHome={onHome}
    />
  );
}

export function ForbiddenError({ onHome }: { onHome?: (() => void) | undefined }) {
  return (
    <ErrorState
      code="403"
      icon={<ShieldAlert className="h-7 w-7 stroke-[1.75]" />}
      title="Access Restricted"
      description="You do not have the required administrative or governance privileges to view this portal section."
      onHome={onHome}
    />
  );
}

export function ServerError({ onRetry }: { onRetry?: (() => void) | undefined }) {
  return (
    <ErrorState
      code="500"
      icon={<ServerOff className="h-7 w-7 stroke-[1.75]" />}
      title="System Service Unavailable"
      description="The university accommodation cluster encountered an unexpected condition. Our operations team has been notified."
      onRetry={onRetry}
    />
  );
}

export function NetworkError({ onRetry }: { onRetry?: (() => void) | undefined }) {
  return (
    <ErrorState
      icon={<WifiOff className="h-7 w-7 stroke-[1.75]" />}
      title="Connection Interrupted"
      description="Unable to communicate with the hostel server. Please verify your campus network connection and try again."
      onRetry={onRetry}
    />
  );
}

export function SessionExpiredError({ onLogin }: { onLogin?: (() => void) | undefined }) {
  return (
    <ErrorState
      icon={<Lock className="h-7 w-7 stroke-[1.75]" />}
      title="Session Expired"
      description="Your secure authentication session has timed out due to inactivity. Please authenticate again to continue."
      onRetry={onLogin}
    />
  );
}
