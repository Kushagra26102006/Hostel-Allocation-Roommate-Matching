"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormErrorItem {
  fieldId: string;
  message: string;
}

interface FormErrorSummaryProps {
  errors: FormErrorItem[];
  title?: string;
  className?: string;
}

export function FormErrorSummary({
  errors,
  title = "Please correct the following errors before proceeding:",
  className,
}: FormErrorSummaryProps) {
  if (!errors || errors.length === 0) return null;

  const handleJumpToField = (e: React.MouseEvent, fieldId: string) => {
    e.preventDefault();
    const element = document.getElementById(fieldId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.focus();
    }
  };

  return (
    <div
      role="alert"
      aria-labelledby="form-error-summary-title"
      tabIndex={-1}
      className={cn(
        "rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs shadow-md mb-6 animate-in fade-in duration-200",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <h2
            id="form-error-summary-title"
            className="font-bold text-sm text-red-700 dark:text-red-300"
          >
            {title} ({errors.length})
          </h2>

          <ul className="mt-2 space-y-1 list-disc list-inside text-red-600 dark:text-red-400">
            {errors.map((err, idx) => (
              <li key={`${err.fieldId}-${idx}`}>
                <a
                  href={`#${err.fieldId}`}
                  onClick={(e) => handleJumpToField(e, err.fieldId)}
                  className="font-semibold underline hover:text-red-800 dark:hover:text-red-200 focus:outline-none focus:ring-1 focus:ring-red-400 rounded"
                >
                  {err.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
