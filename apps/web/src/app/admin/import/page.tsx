"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { FadeIn, FadeUp } from "@/components/ui/motion-primitives";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  Sparkles,
  FileSpreadsheet,
  Layers,
  Database,
} from "lucide-react";
import { toast } from "sonner";

const IMPORT_STEPS = [
  "1. Upload CSV",
  "2. Map Columns",
  "3. Preview Rows",
  "4. AST Validation",
  "5. Error Inspection",
  "6. Dry Run Simulation",
  "7. Commit to DB",
];

export default function AdminImportWizardPage() {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isCommitting, setIsCommitting] = React.useState(false);

  const nextStep = () => {
    if (currentStep < IMPORT_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleCommit = () => {
    setIsCommitting(true);
    setTimeout(() => {
      setIsCommitting(false);
      toast.success("Successfully imported 500 beds into campus inventory!");
      setCurrentStep(0);
    }, 1200);
  };

  return (
    <FadeIn className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <FadeUp>
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
          <UploadCloud className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          <span>Institutional Data Ingestion Pipeline</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl text-foreground">
          CSV Bulk Inventory Import Wizard
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Import thousands of hostel rooms, beds, and attributes with schema mapping, validation
          heat-strips, and dry-run simulation.
        </p>
      </FadeUp>

      {/* 7-Step Stepper Strip */}
      <FadeUp delay={0.05} className="overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 min-w-max">
          {IMPORT_STEPS.map((step, idx) => {
            const isCurrent = idx === currentStep;
            const isPassed = idx < currentStep;
            return (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isCurrent
                    ? "bg-brand-500 text-white shadow-sm"
                    : isPassed
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-surface-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {isPassed ? "✓ " : ""}
                {step}
              </button>
            );
          })}
        </div>
      </FadeUp>

      {/* Validation Health Heat-Strip */}
      <FadeUp delay={0.08}>
        <GlassCard className="p-4 border-brand-500/20">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-foreground">
              Validation Health Heat-Strip (500 Records Evaluated)
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">
              99.6% Valid (2 Warnings, 0 Errors)
            </span>
          </div>
          <div className="flex h-3 w-full gap-0.5 rounded-full overflow-hidden bg-surface-muted p-0.5 border border-border/50">
            <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: "99.6%" }}></div>
            <div className="h-full bg-amber-500 rounded-r-full" style={{ width: "0.4%" }}></div>
          </div>
        </GlassCard>
      </FadeUp>

      {/* Wizard Step Content */}
      <FadeUp delay={0.1}>
        <GlassCard className="p-6 sm:p-8">
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground">
                    Step 1: Upload Inventory CSV
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Select your university inventory spreadsheet (.csv or .xlsx).
                  </p>
                </div>
              </div>
              <FileUploader label="Upload campus_inventory.csv (Max 10MB)" accept=".csv,.xlsx" />
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground">
                    Step 2: Column Mapping
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Map CSV columns to HostelHub database fields:
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { csv: "hostel_name", db: "Hostel Name (e.g. Aryabhata Hall)" },
                  { csv: "room_number", db: "Room Number (e.g. A-204)" },
                  { csv: "bed_id", db: "Bed Identifier (e.g. Bed 1)" },
                  { csv: "is_ac", db: "Air Conditioning Flag (Boolean)" },
                  { csv: "is_accessible", db: "Wheelchair Accessible Flag (Boolean)" },
                ].map((map, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl bg-surface-muted/50 p-3.5 border border-border/40"
                  >
                    <span className="font-mono text-brand-600 dark:text-brand-400 font-bold">
                      {map.csv}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-semibold text-foreground">{map.db}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep >= 2 && currentStep <= 5 && (
            <div className="space-y-4 text-center py-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                {IMPORT_STEPS[currentStep]}
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                500 rows verified against AST constraints. 0 duplicate room IDs, 0 missing foreign
                keys.
              </p>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4 text-center py-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">
                Ready to Commit to Database
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                500 beds will be committed to the inventory ledger. All existing audit logs will
                record this batch import.
              </p>
              <Button
                size="lg"
                onClick={handleCommit}
                disabled={isCommitting}
                className="mt-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold shadow-md shadow-brand-500/20"
              >
                <Database className="mr-2 h-4 w-4" />
                {isCommitting ? "Writing 500 Records to Database..." : "Commit Batch Import"}
              </Button>
            </div>
          )}

          {/* Navigation Footer */}
          <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="rounded-xl"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Previous
            </Button>

            {currentStep < IMPORT_STEPS.length - 1 && (
              <Button
                size="sm"
                onClick={nextStep}
                className="bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold"
              >
                Next Step
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
          </div>
        </GlassCard>
      </FadeUp>
    </FadeIn>
  );
}
