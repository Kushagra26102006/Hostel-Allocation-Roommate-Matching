"use client";

import * as React from "react";
import Papa from "papaparse";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Download,
  Check,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ImportDryRunReport } from "@/lib/inventory/import-engine";

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;

const TARGET_FIELDS = [
  { key: "hostelName", label: "Hostel Name", required: true },
  { key: "genderPolicy", label: "Gender Policy (male/female/coed)", required: false },
  { key: "address", label: "Hostel Address", required: false },
  { key: "blockName", label: "Block Name", required: true },
  { key: "floorNo", label: "Floor Number", required: true },
  { key: "wing", label: "Wing (e.g. North)", required: true },
  { key: "liftAccess", label: "Lift Access (yes/no)", required: false },
  { key: "roomNumber", label: "Room Number", required: true },
  { key: "roomType", label: "Room Type (single/double/etc)", required: false },
  { key: "capacity", label: "Room Capacity", required: false },
  { key: "accessible", label: "Accessible (yes/no)", required: false },
  { key: "ac", label: "AC (yes/no)", required: false },
  { key: "bedNo", label: "Bed Number", required: true },
  { key: "bedStatus", label: "Bed Status (available/held/etc)", required: false },
  { key: "window", label: "Window Seat (yes/no)", required: false },
  { key: "distanceToBlocks", label: "Distance to Blocks", required: false },
];

export function ImportWizard({ isOpen, onClose, onSuccess }: ImportWizardProps) {
  const [step, setStep] = React.useState<WizardStep>(1);
  const [file, setFile] = React.useState<File | null>(null);
  const [detectedHeaders, setDetectedHeaders] = React.useState<string[]>([]);
  const [columnMapping, setColumnMapping] = React.useState<Record<string, string>>({});

  // Dry run & commit state
  const [isValidating, setIsValidating] = React.useState(false);
  const [dryRunReport, setDryRunReport] = React.useState<ImportDryRunReport | null>(null);
  const [isCommitting, setIsCommitting] = React.useState(false);
  const [commitSuccess, setCommitSuccess] = React.useState(false);

  if (!isOpen) return null;

  // Step 1: File selection & header parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    const fileName = selected.name.toLowerCase();

    if (fileName.endsWith(".csv")) {
      Papa.parse(selected, {
        header: true,
        preview: 5,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields ?? [];
          setDetectedHeaders(headers);
          initAutoMapping(headers);
        },
      });
    } else {
      // Fallback detected headers for XLSX until backend dry run
      const defaultHeaders = [
        "hostelName",
        "genderPolicy",
        "blockName",
        "floorNo",
        "wing",
        "roomNumber",
        "roomType",
        "capacity",
        "bedNo",
        "bedStatus",
      ];
      setDetectedHeaders(defaultHeaders);
      initAutoMapping(defaultHeaders);
    }
  };

  const initAutoMapping = (headers: string[]) => {
    const mapping: Record<string, string> = {};
    for (const target of TARGET_FIELDS) {
      const match = headers.find(
        (h) =>
          h.toLowerCase().replace(/[\s_-]+/g, "") ===
          target.key.toLowerCase(),
      );
      if (match) {
        mapping[target.key] = match;
      }
    }
    setColumnMapping(mapping);
  };

  // Run dry run verification to reach Step 3
  const handleRunDryRun = async () => {
    if (!file) return;

    try {
      setIsValidating(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("columnMapping", JSON.stringify(columnMapping));

      const res = await fetch("/api/v1/inventory/import?dry_run=true", {
        method: "POST",
        body: formData,
      });

      const report = (await res.json()) as ImportDryRunReport;
      setDryRunReport(report);
      setStep(3);
    } catch {
      toast.error("Failed to validate file with dry run.");
    } finally {
      setIsValidating(false);
    }
  };

  // Run transactional commit
  const handleCommit = async () => {
    if (!file) return;

    try {
      setIsCommitting(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("columnMapping", JSON.stringify(columnMapping));

      const res = await fetch("/api/v1/inventory/import?dry_run=false", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setCommitSuccess(true);
        toast.success(`Successfully imported ${result.creates} new records and updated ${result.updates}!`);
        onSuccess();
      } else {
        toast.error("Commit failed: transaction rolled back with 0 changes.");
      }
    } catch {
      toast.error("Commit failed due to a server error.");
    } finally {
      setIsCommitting(false);
    }
  };

  // Download error report as CSV
  const handleDownloadErrorReport = () => {
    if (!dryRunReport || dryRunReport.errors.length === 0) return;

    const csvContent = Papa.unparse(
      dryRunReport.errors.map((e) => ({
        "Row Number": e.row,
        Field: e.field || "General",
        "Error Message": e.message,
      })),
    );

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `import-error-report-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Bulk Inventory Import Wizard
            </h2>
            <p className="text-xs text-muted-foreground">
              Upload CSV or Excel spreadsheets to populate Hostels, Blocks, Rooms, and Beds.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 4-Step Indicator */}
        <div className="grid grid-cols-4 border-b border-border/40 bg-muted/20 text-xs font-medium">
          {[
            { num: 1, label: "1. Upload" },
            { num: 2, label: "2. Map Columns" },
            { num: 3, label: "3. Heat-Strip Preview" },
            { num: 4, label: "4. Commit" },
          ].map((s) => (
            <div
              key={s.num}
              className={cn(
                "flex items-center justify-center gap-1.5 py-3 border-r border-border/30 last:border-r-0 transition-colors",
                step === s.num && "bg-primary/10 text-primary font-bold border-b-2 border-b-primary",
                step > s.num && "text-emerald-600 dark:text-emerald-400 font-semibold",
                step < s.num && "text-muted-foreground",
              )}
            >
              {step > s.num ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span>{s.label}</span>
              )}
            </div>
          ))}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileSpreadsheet className="h-8 w-8" />
              </div>

              <div className="text-center">
                <h3 className="text-base font-semibold text-foreground">
                  Choose a CSV or XLSX file
                </h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                  Files up to 8,000 rows supported with sub-60s atomic batch processing.
                </p>
              </div>

              <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-transform active:scale-95">
                <Upload className="h-4 w-4" />
                Select File
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {file && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium text-foreground">{file.name}</span>
                  <span className="text-muted-foreground">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Map Columns */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-muted-foreground">
                Map each required inventory field to the corresponding column header from your uploaded file.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {TARGET_FIELDS.map((field) => (
                  <div
                    key={field.key}
                    className="flex flex-col gap-1 rounded-lg border border-border/80 bg-card p-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        {field.label}
                      </span>
                      {field.required && (
                        <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-500">
                          Required
                        </span>
                      )}
                    </div>
                    <select
                      value={columnMapping[field.key] ?? ""}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className="mt-1 h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:border-primary focus:outline-none"
                    >
                      <option value="">-- Do not map --</option>
                      {detectedHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Preview with Error Heat-Strip */}
          {step === 3 && dryRunReport && (
            <div className="flex flex-col gap-5">
              {/* Stat Cards */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="rounded-xl border border-border bg-card p-3">
                  <span className="text-xs text-muted-foreground">Total Rows</span>
                  <div className="text-lg font-bold text-foreground">
                    {dryRunReport.totalRows}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <span className="text-xs text-muted-foreground">Validation</span>
                  <div
                    className={cn(
                      "text-lg font-bold",
                      dryRunReport.valid ? "text-emerald-500" : "text-rose-500",
                    )}
                  >
                    {dryRunReport.valid ? "Passed" : "Errors Found"}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <span className="text-xs text-muted-foreground">Creates</span>
                  <div className="text-lg font-bold text-sky-500">
                    {dryRunReport.creates}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <span className="text-xs text-muted-foreground">Updates</span>
                  <div className="text-lg font-bold text-amber-500">
                    {dryRunReport.updates}
                  </div>
                </div>
              </div>

              {/* VISUAL ERROR HEAT-STRIP */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Row Validation Heat-Strip</span>
                  <span className="text-muted-foreground font-normal">
                    {dryRunReport.errors.length === 0
                      ? "All rows valid (100% green)"
                      : `${dryRunReport.errors.length} issue(s) detected`}
                  </span>
                </div>

                <div className="flex h-5 w-full overflow-hidden rounded-md bg-muted/60 p-0.5 gap-[1px]">
                  {Array.from({ length: Math.min(dryRunReport.totalRows, 120) }).map(
                    (_, i) => {
                      const rowNum = Math.floor(
                        (i / 120) * dryRunReport.totalRows,
                      ) + 1;
                      const hasError = dryRunReport.errors.some(
                        (e) => e.row === rowNum,
                      );
                      return (
                        <div
                          key={i}
                          title={`Row ~${rowNum}: ${hasError ? "Validation Error" : "Valid"}`}
                          className={cn(
                            "flex-1 h-full rounded-[1px] transition-transform hover:scale-125 hover:z-10",
                            hasError ? "bg-rose-500 shadow-xs" : "bg-emerald-500/80",
                          )}
                        />
                      );
                    },
                  )}
                </div>
              </div>

              {/* Error Details or Clean Notification */}
              {dryRunReport.errors.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-500 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      Must fix {dryRunReport.errors.length} error(s) before committing
                    </span>
                    <button
                      onClick={handleDownloadErrorReport}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Error CSV
                    </button>
                  </div>

                  <div className="max-h-40 overflow-y-auto rounded-lg border border-rose-500/30 bg-rose-500/5 p-2 text-xs">
                    {dryRunReport.errors.slice(0, 8).map((err, idx) => (
                      <div
                        key={idx}
                        className="py-1 border-b border-border/40 last:border-b-0 flex items-start gap-2"
                      >
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          Row {err.row}:
                        </span>
                        <span className="text-muted-foreground">
                          {err.field ? `[${err.field}] ` : ""}
                          {err.message}
                        </span>
                      </div>
                    ))}
                    {dryRunReport.errors.length > 8 && (
                      <div className="pt-1 text-[11px] font-semibold text-muted-foreground">
                        ...and {dryRunReport.errors.length - 8} more errors.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    Ready to commit! All {dryRunReport.totalRows} rows passed schema and duplicate checks.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Commit */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              {commitSuccess ? (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-500">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    Import Completed Successfully!
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm text-center">
                    All inventory records committed in one transaction. The tree view and occupancy metrics have been updated.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <RefreshCw
                      className={cn("h-8 w-8", isCommitting && "animate-spin")}
                    />
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    {isCommitting ? "Committing Inventory..." : "Ready to Commit"}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm text-center">
                    Writes are executed in a single atomic transaction. Any error will immediately roll back all operations.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-6 py-3.5">
          {step > 1 && !commitSuccess ? (
            <button
              onClick={() => setStep((prev) => (prev - 1) as WizardStep)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-1.5 text-xs font-semibold hover:bg-accent"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step === 1 && (
              <button
                disabled={!file}
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
              >
                Next: Map Columns
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            {step === 2 && (
              <button
                disabled={isValidating}
                onClick={handleRunDryRun}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
              >
                {isValidating ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                Run Dry-Run Validation
              </button>
            )}

            {step === 3 && (
              <button
                disabled={!dryRunReport?.valid}
                onClick={() => {
                  setStep(4);
                  handleCommit();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
              >
                Commit to Database
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            {step === 4 && commitSuccess && (
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
