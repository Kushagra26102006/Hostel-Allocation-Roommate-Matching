"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface StudentRuleResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  reason: string;
  policyRef: string;
  howToFixLink?: string;
  howToFixLabel?: string;
}

interface StudentEligibilityCardProps {
  eligible: boolean;
  results: StudentRuleResult[];
  applicationId?: string;
}

export function StudentEligibilityCard({
  eligible,
  results,
  applicationId = "current",
}: StudentEligibilityCardProps) {
  return (
    <Card className="max-w-2xl mx-auto border-border/60 bg-surface/80 backdrop-blur-md shadow-xl">
      <CardHeader className="text-center">
        <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-surface/60 border border-border/60">
          {eligible ? (
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
          ) : (
            <XCircle className="w-7 h-7 text-rose-400" />
          )}
        </div>
        <CardTitle className="text-xl font-bold">Eligibility Verification Results</CardTitle>
        <CardDescription>
          {eligible
            ? "Your application satisfies all academic and policy requirements for hostel allocation."
            : "Some policy requirements are not yet satisfied. See action steps below to fix."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {results.map((res) => {
            // Infer how to fix link if not explicitly provided
            let fixLink = res.howToFixLink;
            let fixLabel = res.howToFixLabel;

            if (!res.passed && !fixLink) {
              if (res.ruleId.includes("doc") || res.reason.toLowerCase().includes("document")) {
                fixLink = `/applications/new?step=1`;
                fixLabel = "Upload Document (Step 2)";
              } else if (res.reason.toLowerCase().includes("address") || res.reason.toLowerCase().includes("distance")) {
                fixLink = `/applications/new?step=0`;
                fixLabel = "Update Permanent Address (Step 1)";
              } else {
                fixLink = `/applications/new?step=0`;
                fixLabel = "Review Application Data";
              }
            }

            return (
              <div
                key={res.ruleId}
                className={cn(
                  "p-4 rounded-xl border transition-all text-xs space-y-2",
                  res.passed
                    ? "border-emerald-500/30 bg-emerald-950/10"
                    : "border-rose-500/30 bg-rose-950/10",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {res.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">{res.ruleName}</p>
                      <p className="text-muted mt-0.5">{res.reason}</p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-muted px-2 py-0.5 rounded bg-surface/50">
                    {res.policyRef}
                  </span>
                </div>

                {!res.passed && fixLink && (
                  <div className="pt-2 border-t border-rose-500/20 flex justify-end">
                    <Link href={fixLink}>
                      <Button variant="ghost" size="sm" className="text-xs text-rose-300 hover:text-rose-200">
                        How to fix <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
