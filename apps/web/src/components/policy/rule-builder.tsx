"use client";

import React, { useState } from "react";
import { Plus, Trash2, Download, Play, CheckCircle2, XCircle, Sparkles, Code } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  evaluate,
  describeExpression,
  type PolicyRule,
  type ApplicantFacts,
  type PolicyRuleSet,
} from "@hostelhub/domain";

export function RuleBuilder() {
  const [ruleSetName] = useState("2026 UG Hostel Eligibility Policy");
  const [rules, setRules] = useState<PolicyRule[]>([
    {
      id: "r_distance",
      name: "Permanent Residence Distance Threshold",
      expression: { op: "gte", fact: "distanceKm", value: 50 },
      reasonTemplate:
        "Your permanent residence distance ({distanceKm} km) is below the minimum 50 km cutoff.",
      policyRef: "POL-2026-01",
      owner: "hostel_admin",
      effectiveFrom: new Date().toISOString(),
      version: 1,
    },
    {
      id: "r_hold",
      name: "No Outstanding Disciplinary or Financial Hold",
      expression: { op: "equals", fact: "hasHold", value: false },
      reasonTemplate: "Your student account currently has an active administrative hold.",
      policyRef: "POL-2026-02",
      owner: "hostel_admin",
      effectiveFrom: new Date().toISOString(),
      version: 1,
    },
  ]);

  // Test Panel state
  const [testFacts, setTestFacts] = useState<ApplicantFacts>({
    studentId: "test_student_01",
    programme: "B.Tech Computer Science",
    level: "UG",
    year: 1,
    feeCategory: "regular",
    hasHold: false,
    distanceKm: 120,
    documentsVerified: true,
    accessibilityNeed: false,
  });

  const [testResult, setTestResult] = useState<ReturnType<typeof evaluate> | null>(null);

  const addRule = () => {
    const newRule: PolicyRule = {
      id: `r_${Date.now()}`,
      name: "New Eligibility Rule",
      expression: { op: "equals", fact: "level", value: "UG" },
      reasonTemplate: "Applicant {studentId} must satisfy {fact} requirement.",
      policyRef: "POL-2026-NEW",
      owner: "hostel_admin",
      effectiveFrom: new Date().toISOString(),
      version: 1,
    };
    setRules((prev) => [...prev, newRule]);
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRule = (id: string, updates: Partial<PolicyRule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const runTestEvaluation = () => {
    const currentRuleSet: PolicyRuleSet = {
      id: "test_ruleset",
      name: ruleSetName,
      version: 1,
      isLocked: false,
      rules,
    };

    const result = evaluate(testFacts, currentRuleSet);
    setTestResult(result);
  };

  const exportPolicyToCsv = () => {
    const csvRows = [
      [
        "Rule ID",
        "Rule Name",
        "Policy Reference",
        "Owner",
        "Plain Language Expression",
        "Reason Template",
      ].join(","),
      ...rules.map((r) =>
        [
          `"${r.id}"`,
          `"${r.name}"`,
          `"${r.policyRef}"`,
          `"${r.owner}"`,
          `"${describeExpression(r.expression)}"`,
          `"${r.reasonTemplate}"`,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `policy_mapping_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Eligibility Rule Builder</h1>
          <p className="text-xs text-muted">
            Configure policy rules using JSON AST DSL with plain-language preview & test panel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportPolicyToCsv}>
            <Download className="w-4 h-4 mr-2" /> Export CSV Mapping
          </Button>
          <Button
            size="sm"
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
            onClick={addRule}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Policy Rule
          </Button>
        </div>
      </div>

      {/* Rules Config List */}
      <div className="space-y-4">
        {rules.map((rule) => {
          const expr = rule.expression as Record<string, unknown>;
          return (
            <Card
              key={rule.id}
              className="border-border/60 bg-surface/80 backdrop-blur-md shadow-md"
            >
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <Code className="w-5 h-5 text-brand-400" />
                    <Input
                      value={rule.name}
                      onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                      className="font-semibold text-base max-w-md"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={rule.policyRef}
                      onChange={(e) => updateRule(rule.id, { policyRef: e.target.value })}
                      className="w-32 font-mono text-xs"
                      placeholder="Policy Ref"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeRule(rule.id)}>
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    </Button>
                  </div>
                </div>

                {/* Expression Builder: Fact | Operator | Value */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Fact Key</Label>
                    <Select
                      value={(expr.fact as string) || "level"}
                      onValueChange={(val) =>
                        updateRule(rule.id, {
                          expression: { ...expr, fact: val } as unknown as PolicyRule["expression"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="level">level (UG/PG/PhD)</SelectItem>
                        <SelectItem value="programme">programme</SelectItem>
                        <SelectItem value="year">year (1-5)</SelectItem>
                        <SelectItem value="feeCategory">feeCategory</SelectItem>
                        <SelectItem value="hasHold">hasHold (boolean)</SelectItem>
                        <SelectItem value="distanceKm">distanceKm (number)</SelectItem>
                        <SelectItem value="documentsVerified">documentsVerified</SelectItem>
                        <SelectItem value="accessibilityNeed">accessibilityNeed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Operator</Label>
                    <Select
                      value={(expr.op as string) || "equals"}
                      onValueChange={(val) =>
                        updateRule(rule.id, {
                          expression: { ...expr, op: val } as unknown as PolicyRule["expression"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">equals (==)</SelectItem>
                        <SelectItem value="in">in (list)</SelectItem>
                        <SelectItem value="gte">gte (&gt;=)</SelectItem>
                        <SelectItem value="lte">lte (&lt;=)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Value</Label>
                    <Input
                      value={String(expr.value ?? "")}
                      onChange={(e) => {
                        let val: string | number | boolean = e.target.value;
                        if (val === "true") val = true;
                        else if (val === "false") val = false;
                        else if (!isNaN(Number(val)) && val !== "") val = Number(val);
                        updateRule(rule.id, {
                          expression: {
                            ...expr,
                            value: val,
                          } as unknown as PolicyRule["expression"],
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Plain-Language Preview */}
                <div className="p-3 rounded-lg bg-surface/50 border border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted">Plain-Language Rule Preview:</span>
                  <span className="font-medium text-brand-400 italic">
                    "{describeExpression(rule.expression)}"
                  </span>
                </div>

                {/* Reason Template */}
                <div>
                  <Label className="text-xs">
                    Failure Reason Template (Placeholder format: &#123;factKey&#125;)
                  </Label>
                  <Input
                    value={rule.reasonTemplate}
                    onChange={(e) => updateRule(rule.id, { reasonTemplate: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Test Panel */}
      <Card className="border-brand-500/30 bg-surface/90 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-brand-400">
            <Play className="w-5 h-5" /> Interactive Applicant Test Panel
          </CardTitle>
          <CardDescription>
            Enter sample student facts to test the evaluator in real time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Level</Label>
              <Input
                value={String(testFacts.level ?? "")}
                onChange={(e) => setTestFacts({ ...testFacts, level: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Year</Label>
              <Input
                type="number"
                value={Number(testFacts.year ?? 1)}
                onChange={(e) => setTestFacts({ ...testFacts, year: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Distance (km)</Label>
              <Input
                type="number"
                value={Number(testFacts.distanceKm ?? 0)}
                onChange={(e) => setTestFacts({ ...testFacts, distanceKm: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Has Hold (true/false)</Label>
              <Select
                value={String(testFacts.hasHold ?? false)}
                onValueChange={(val) => setTestFacts({ ...testFacts, hasHold: val === "true" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">false (Clean)</SelectItem>
                  <SelectItem value="true">true (Active Hold)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={runTestEvaluation}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <Sparkles className="w-4 h-4 mr-2" /> Evaluate Applicant
            </Button>
          </div>

          {/* Test Results Output */}
          {testResult && (
            <div className="p-4 rounded-xl border border-border/60 bg-surface/50 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="font-semibold text-sm">Overall Status:</span>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase",
                    testResult.eligible
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/30",
                  )}
                >
                  {testResult.eligible ? "ELIGIBLE" : "INELIGIBLE"}
                </span>
              </div>

              <div className="space-y-2">
                {testResult.results.map((res) => (
                  <div
                    key={res.ruleId}
                    className="flex items-start gap-3 p-2 rounded bg-surface/30 text-xs"
                  >
                    {res.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">
                        {res.ruleName}{" "}
                        <span className="font-mono text-muted">({res.policyRef})</span>
                      </p>
                      <p className="text-muted mt-0.5">{res.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
