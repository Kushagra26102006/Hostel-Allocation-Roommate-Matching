"use client";

import React from "react";
import { AlertTriangle, HardDrive, Cloud, ArrowRight } from "lucide-react";
import type { ApplicationFormData } from "./application-form";

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  localVersion: number;
  serverVersion: number;
  localData: ApplicationFormData;
  serverData?: Partial<ApplicationFormData> | null;
  onChooseLocal: () => void;
  onChooseServer: () => void;
}

export function ConflictResolutionDialog({
  isOpen,
  localVersion,
  serverVersion,
  localData,
  serverData,
  onChooseLocal,
  onChooseServer,
}: ConflictResolutionDialogProps) {
  if (!isOpen) return null;

  // Comparison fields to preview differences
  const compareFields = [
    {
      label: "Full Name",
      local: localData?.profile?.fullName,
      server: serverData?.profile?.fullName,
    },
    {
      label: "Phone",
      local: localData?.profile?.phone,
      server: serverData?.profile?.phone,
    },
    {
      label: "PIN Code / City",
      local: `${localData?.profile?.pincode || ""} ${localData?.profile?.city || ""}`.trim(),
      server: `${serverData?.profile?.pincode || ""} ${serverData?.profile?.city || ""}`.trim(),
    },
    {
      label: "Room Type",
      local: localData?.preferences?.roomType,
      server: serverData?.preferences?.roomType,
    },
    {
      label: "AC Preference",
      local: localData?.preferences?.acPreference,
      server: serverData?.preferences?.acPreference,
    },
    {
      label: "Priority Tier",
      local: localData?.questionnaire?.priorityTier,
      server: serverData?.questionnaire?.priorityTier,
    },
    {
      label: "Study Habits",
      local: localData?.questionnaire?.studyHabits,
      server: serverData?.questionnaire?.studyHabits,
    },
  ];

  return (
    <div
      role="dialog"
      aria-labelledby="conflict-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 id="conflict-dialog-title" className="font-heading text-lg font-bold text-text">
              Application Draft Conflict Detected
            </h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Another session or device updated your application on the campus server (Version{" "}
              {serverVersion}) while you made changes offline (Version {localVersion}). Please
              choose which version you would like to keep.
            </p>
          </div>
        </div>

        {/* Side-by-Side Comparison Table */}
        <div className="rounded-xl border border-border overflow-hidden bg-background text-xs">
          <div className="grid grid-cols-3 border-b border-border bg-muted/20 p-2.5 font-bold text-muted uppercase text-[10px] tracking-wider">
            <div>Field</div>
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <HardDrive className="h-3.5 w-3.5" />
              <span>Your Offline Edits (v{localVersion})</span>
            </div>
            <div className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400">
              <Cloud className="h-3.5 w-3.5" />
              <span>Server Version (v{serverVersion})</span>
            </div>
          </div>

          <div className="divide-y divide-border/60 max-h-60 overflow-y-auto">
            {compareFields.map((field) => {
              const hasDiff = field.local !== field.server;
              return (
                <div
                  key={field.label}
                  className={`grid grid-cols-3 p-2.5 items-center transition-colors ${
                    hasDiff ? "bg-amber-500/5 font-medium" : "text-muted"
                  }`}
                >
                  <span className="font-semibold text-text">{field.label}</span>
                  <span className={hasDiff ? "text-amber-700 dark:text-amber-300 font-bold" : ""}>
                    {field.local || "—"}
                  </span>
                  <span className={hasDiff ? "text-brand-700 dark:text-brand-300 font-bold" : ""}>
                    {field.server || "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Choices */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            id="choose-server-version-btn"
            onClick={onChooseServer}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold text-text hover:bg-muted/20 transition-colors"
          >
            <Cloud className="h-3.5 w-3.5 text-brand-500" />
            <span>Discard Offline & Use Server (v{serverVersion})</span>
          </button>
          <button
            type="button"
            id="choose-local-version-btn"
            onClick={onChooseLocal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-500 transition-colors"
          >
            <HardDrive className="h-3.5 w-3.5" />
            <span>Keep My Offline Edits (Overwrite Server)</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
