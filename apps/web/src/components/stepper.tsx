"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

/**
 * Stepper — horizontal step progress indicator.
 * The connector line morphs its fill as steps complete.
 */
export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav
      aria-label="Progress"
      className={cn("w-full", className)}
    >
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent  = index === currentStep;

          return (
            <React.Fragment key={step}>
              <li className="flex items-center">
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    "text-xs font-semibold border-2 transition-all duration-280 ease-emphasized",
                    isCompleted && "bg-gradient-brand border-transparent text-white",
                    isCurrent  && "border-brand-600 bg-surface text-brand-600 dark:border-brand-400 dark:text-brand-400",
                    !isCompleted && !isCurrent && "border-border bg-surface text-muted",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <span aria-hidden="true">{index + 1}</span>
                  )}
                  <span className="sr-only">{step}</span>
                </span>

                {/* Label below on larger screens */}
                <span
                  className={cn(
                    "ml-2 text-xs font-medium hidden sm:block transition-colors duration-180",
                    isCurrent  && "text-brand-600 dark:text-brand-400",
                    isCompleted && "text-text",
                    !isCompleted && !isCurrent && "text-muted",
                  )}
                >
                  {step}
                </span>
              </li>

              {/* Connector line between steps */}
              {index < steps.length - 1 && (
                <div
                  role="presentation"
                  className="relative mx-2 flex-1 h-0.5 bg-border overflow-hidden rounded-full"
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-brand transition-all duration-480 ease-emphasized rounded-full"
                    style={{ width: isCompleted ? "100%" : "0%" }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
