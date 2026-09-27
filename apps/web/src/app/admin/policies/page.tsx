"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FadeIn, FadeUp } from "@/components/ui/motion-primitives";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sliders, Plus, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";

interface PolicyItem {
  id: string;
  name: string;
  plainPreview: string;
  owner: string;
  effectiveDate: string;
  ref: string;
  version: string;
  conditions: Array<{ field: string; op: string; val: string }>;
  actions: Array<{ target: string; val: string }>;
}

export default function AdminPoliciesPage() {
  const [selectedVersion, setSelectedVersion] = React.useState("v3.2");
  const [isAddRuleOpen, setIsAddRuleOpen] = React.useState(false);

  // Visual Rule Builder State
  const [ruleName, setRuleName] = React.useState("Freshmen Residential Corridor Policy");
  const [ruleField, setRuleField] = React.useState("Programme");
  const [ruleOp, setRuleOp] = React.useState("=");
  const [ruleVal, setRuleVal] = React.useState("B.Tech CSE");
  const [ruleYear, setRuleYear] = React.useState("1");
  const [targetHostel, setTargetHostel] = React.useState("Aryabhata Hall (Block A)");

  const rules: PolicyItem[] = [
    {
      id: "pol-01",
      name: "Freshmen Residence Partition",
      plainPreview:
        "IF Programme = B.Tech AND Year = 1 THEN Eligible Residences = [Aryabhata Hall, Block A], Prohibit Senior Cohabitation.",
      owner: "Dean Student Welfare",
      effectiveDate: "01 Aug 2026",
      ref: "SENATE-POL-2026-F1",
      version: "v3.2",
      conditions: [
        { field: "Programme", op: "=", val: "B.Tech" },
        { field: "Year", op: "=", val: "1" },
      ],
      actions: [{ target: "Eligible Hostel", val: "Aryabhata Hall (Block A)" }],
    },
    {
      id: "pol-02",
      name: "PwD Accessibility Ground Floor Mandate",
      plainPreview:
        "IF DisabilityCategory ≠ None AND MedicalCertVerified = True THEN Allowed Floors = [Floor 1 (Ground)], Priority Tier = P0.",
      owner: "Disability Cell & Campus Health",
      effectiveDate: "15 Jul 2026",
      ref: "EQUITY-POL-2026-A4",
      version: "v3.2",
      conditions: [
        { field: "DisabilityCategory", op: "≠", val: "None" },
        { field: "MedicalCertVerified", op: "=", val: "True" },
      ],
      actions: [{ target: "Allowed Floors", val: "Floor 1 (Ground Floor Accessible)" }],
    },
    {
      id: "pol-03",
      name: "Research Scholar Single Studio Allocation",
      plainPreview:
        "IF Programme = Ph.D. AND Year ≥ 2 THEN Allowed Residences = [Ramanujan Tower], RoomType = Single Studio.",
      owner: "Dean Research & PG Housing",
      effectiveDate: "10 Aug 2026",
      ref: "PG-HOUSING-2026-R8",
      version: "v3.2",
      conditions: [
        { field: "Programme", op: "=", val: "Ph.D." },
        { field: "Year", op: "≥", val: "2" },
      ],
      actions: [{ target: "Room Type", val: "Single Studio" }],
    },
  ];

  const handleSaveRule = () => {
    toast.success(`Rule "${ruleName}" compiled & saved into Policy Set ${selectedVersion}!`);
    setIsAddRuleOpen(false);
  };

  return (
    <FadeIn className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <FadeUp className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
            <Sliders className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
            <span>Deterministic AST Rule Compiler</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl text-foreground">
            Visual Policy Rule Builder
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Configure institutional eligibility, quota partitioning, and hard constraint rules with
            plain-language previews.
          </p>
        </div>

        <Button
          onClick={() => setIsAddRuleOpen(true)}
          className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Policy Rule
        </Button>
      </FadeUp>

      {/* Version Selector Tabs & History */}
      <FadeUp
        delay={0.05}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="flex items-center gap-1.5 rounded-xl bg-surface-muted/60 p-1 border border-border/60">
          {["v3.2", "v2.1", "v1.0"].map((ver) => (
            <button
              key={ver}
              onClick={() => setSelectedVersion(ver)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedVersion === ver
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {ver} {ver === "v3.2" ? "(Active)" : ""}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Last modified by Dean Student Welfare on 14 Aug 2026</span>
        </div>
      </FadeUp>

      {/* Policy Rules List */}
      <div className="space-y-4">
        {rules.map((r, idx) => (
          <FadeUp key={r.id} delay={0.08 + idx * 0.04}>
            <GlassCard className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-base font-bold text-foreground">{r.name}</h3>
                    <span className="font-mono text-xs rounded-lg bg-brand-50 px-2.5 py-0.5 font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200/50">
                      {r.version}
                    </span>
                  </div>

                  {/* Visual IF-THEN Card */}
                  <div className="rounded-xl bg-surface-muted/50 p-4 border border-border/70 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="font-bold text-brand-600 dark:text-brand-400">IF:</span>
                      {r.conditions.map((c, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 border border-border/80"
                        >
                          <strong>{c.field}</strong> {c.op}{" "}
                          <span className="text-brand-600 dark:text-brand-400">{c.val}</span>
                          {i < r.conditions.length - 1 && (
                            <span className="text-muted-foreground font-bold ml-1">AND</span>
                          )}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="font-bold text-emerald-600">THEN:</span>
                      {r.actions.map((a, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 border border-border/80 text-foreground font-semibold"
                        >
                          <span>{a.target} =</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{a.val}</span>
                        </span>
                      ))}
                    </div>

                    <div className="pt-1 text-[11px] text-muted-foreground italic">
                      &quot;{r.plainPreview}&quot;
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                    <span>
                      Owner: <strong className="text-foreground">{r.owner}</strong>
                    </span>
                    <span>•</span>
                    <span>Effective: {r.effectiveDate}</span>
                    <span>•</span>
                    <span>
                      Ref: <strong className="font-mono text-foreground">{r.ref}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddRuleOpen(true)}
                    className="rounded-xl text-xs"
                  >
                    Edit Rule AST
                  </Button>
                </div>
              </div>
            </GlassCard>
          </FadeUp>
        ))}
      </div>

      {/* Visual Rule Builder Dialog */}
      <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
        <DialogContent className="sm:max-w-xl bg-surface border-border p-6 space-y-5">
          <DialogHeader className="text-left space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AST Rule Specification</span>
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Visual Policy Rule Builder
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define Boolean eligibility conditions and allocation assignments. The compiler
              compiles conditions to deterministic bytecode.
            </DialogDescription>
          </DialogHeader>

          {/* Rule Title */}
          <div>
            <Label htmlFor="rule-name" className="text-xs font-bold text-foreground">
              Rule Display Name
            </Label>
            <Input
              id="rule-name"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              className="mt-1.5 text-xs rounded-xl"
            />
          </div>

          {/* IF Conditions Block */}
          <div className="rounded-xl border border-border/80 bg-surface-muted/30 p-4 space-y-3">
            <div className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>IF Condition Criteria</span>
            </div>

            <div className="grid grid-cols-12 gap-2 text-xs">
              <div className="col-span-5">
                <Label className="text-[10px] text-muted-foreground uppercase">
                  Attribute Field
                </Label>
                <select
                  value={ruleField}
                  onChange={(e) => setRuleField(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-xs text-foreground"
                >
                  <option value="Programme">Programme</option>
                  <option value="DisabilityCategory">Disability Category</option>
                  <option value="CGPA">CGPA Score</option>
                  <option value="Gender">Gender</option>
                </select>
              </div>

              <div className="col-span-2">
                <Label className="text-[10px] text-muted-foreground uppercase">Operator</Label>
                <select
                  value={ruleOp}
                  onChange={(e) => setRuleOp(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-xs text-foreground text-center"
                >
                  <option value="=">=</option>
                  <option value="≠">≠</option>
                  <option value="≥">≥</option>
                </select>
              </div>

              <div className="col-span-5">
                <Label className="text-[10px] text-muted-foreground uppercase">Value Target</Label>
                <Input
                  value={ruleVal}
                  onChange={(e) => setRuleVal(e.target.value)}
                  className="mt-1 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* AND Clause */}
            <div className="pt-2 border-t border-border/50 flex items-center gap-2 text-xs">
              <span className="font-bold text-muted-foreground">AND</span>
              <span className="font-mono text-foreground font-semibold">Year =</span>
              <Input
                value={ruleYear}
                onChange={(e) => setRuleYear(e.target.value)}
                className="w-16 h-8 text-xs rounded-lg"
              />
            </div>
          </div>

          {/* THEN Action Block */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              THEN Allocation Directive
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase">
                Eligible Hostel Residence
              </Label>
              <select
                value={targetHostel}
                onChange={(e) => setTargetHostel(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-xs text-foreground font-semibold"
              >
                <option value="Aryabhata Hall (Block A)">Aryabhata Hall (Block A)</option>
                <option value="Gargi Hall (Block B)">Gargi Hall (Block B)</option>
                <option value="Kalpana Chawla Hall">Kalpana Chawla Hall</option>
                <option value="Ramanujan Tower (Single Studios)">
                  Ramanujan Tower (Single Studios)
                </option>
              </select>
            </div>
          </div>

          {/* Human-Readable Preview */}
          <div className="rounded-xl bg-surface-muted/50 p-3 border border-border/50 text-xs">
            <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1">
              Human-Readable Preview
            </div>
            <p className="text-foreground font-mono">
              IF {ruleField} {ruleOp} &quot;{ruleVal}&quot; AND Year = {ruleYear} THEN Eligible
              Hostel = &quot;{targetHostel}&quot;
            </p>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddRuleOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveRule}
              className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold"
            >
              Save & Compile Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FadeIn>
  );
}
