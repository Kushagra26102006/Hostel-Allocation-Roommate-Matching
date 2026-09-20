"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { useMessages } from "@/lib/i18n";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const messages = useMessages();

  React.useEffect(() => {
    // Log error to monitoring if needed
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-text">
      <EmptyState
        icon={<AlertTriangle className="h-10 w-10 text-danger" />}
        title={messages.common.error}
        description={error.message || "An unexpected application error occurred."}
        action={{
          label: messages.common.retry,
          onClick: () => reset(),
        }}
        className="max-w-md"
      />
    </div>
  );
}
