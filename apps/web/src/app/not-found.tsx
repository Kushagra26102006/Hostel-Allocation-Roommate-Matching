"use client";

import * as React from "react";
import Link from "next/link";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/lib/i18n";

export default function NotFound() {
  const messages = useMessages();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-text">
      <EmptyState
        icon={<FileQuestion className="h-10 w-10 text-brand-600 dark:text-brand-400" />}
        title={messages.common.notFoundTitle}
        description={messages.common.notFoundDescription}
        className="max-w-md"
      />

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="primary">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            <span>{messages.common.backHome}</span>
          </Link>
        </Button>

        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span>{messages.common.backDashboard}</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
