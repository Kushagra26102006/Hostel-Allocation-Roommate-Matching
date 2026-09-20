"use client";

import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Calendar, Layers, FileCheck, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CycleWizardForm {
  academic_year: string;
  name: string;
  window_open: string;
  window_close: string;
  status: "draft" | "scheduled" | "open" | "closed";
  quota_buckets: Array<{ name: string; capacity: number }>;
  document_requirements: Array<{ type: string; label: string; required: boolean }>;
  priority_tier_order: string[];
}

export function CycleWizard({ onCreated }: { onCreated?: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<CycleWizardForm>({
    defaultValues: {
      academic_year: "2026-2027",
      name: "Main Autumn Allocation Cycle",
      window_open: new Date().toISOString().slice(0, 16),
      window_close: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      status: "scheduled",
      quota_buckets: [
        { name: "PWD", capacity: 20 },
        { name: "Single Parent", capacity: 30 },
        { name: "General Merit", capacity: 250 },
      ],
      document_requirements: [
        { type: "id_proof", label: "Aadhaar / National ID Card", required: true },
        { type: "income_certificate", label: "Family Income Certificate", required: true },
      ],
      priority_tier_order: ["pwd", "single_parent", "merit", "general"],
    },
  });

  const { fields: quotaFields, append: appendQuota, remove: removeQuota } = useFieldArray({
    control,
    name: "quota_buckets",
  });

  const { fields: docFields, append: appendDoc, remove: removeDoc } = useFieldArray({
    control,
    name: "document_requirements",
  });

  const onSubmit = async (data: CycleWizardForm) => {
    setIsSubmitting(true);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/v1/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || "Failed to create cycle");
        return;
      }

      setSuccessMsg("Allocation cycle created successfully!");
      if (onCreated) onCreated();
    } catch {
      alert("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto border-border/60 bg-surface/80 backdrop-blur-md shadow-2xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-brand-400" />
          Create Allocation Cycle Wizard
        </CardTitle>
        <CardDescription>
          Configure application open/close schedule window, quota seat capacity buckets, document requirements & priority tier rules.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> {successMsg}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="academic_year">Academic Year</Label>
              <Input id="academic_year" {...register("academic_year", { required: true })} />
            </div>
            <div>
              <Label htmlFor="name">Cycle Name</Label>
              <Input id="name" {...register("name", { required: true })} />
            </div>
            <div>
              <Label htmlFor="window_open">Window Open (Server Clock)</Label>
              <Input id="window_open" type="datetime-local" {...register("window_open", { required: true })} />
            </div>
            <div>
              <Label htmlFor="window_close">Window Close (Server Clock)</Label>
              <Input id="window_close" type="datetime-local" {...register("window_close", { required: true })} />
            </div>
          </div>

          {/* Quota Buckets */}
          <div className="space-y-3 pt-4 border-t border-border/40">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-400" /> Quota Buckets & Seat Capacities
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={() => appendQuota({ name: "New Category", capacity: 10 })}>
                <Plus className="w-4 h-4 mr-1" /> Add Bucket
              </Button>
            </div>
            <div className="space-y-2">
              {quotaFields.map((field: Record<string, unknown>, idx: number) => (
                <div key={field.id as string} className="flex items-center gap-3">
                  <Input {...register(`quota_buckets.${idx}.name` as const)} placeholder="Bucket Name" />
                  <Input type="number" {...register(`quota_buckets.${idx}.capacity` as const, { valueAsNumber: true })} placeholder="Seats" className="w-32" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeQuota(idx)}>
                    <Trash2 className="w-4 h-4 text-rose-400" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Document Requirements */}
          <div className="space-y-3 pt-4 border-t border-border/40">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-brand-400" /> Required Application Documents
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={() => appendDoc({ type: "other", label: "Additional Cert", required: true })}>
                <Plus className="w-4 h-4 mr-1" /> Add Document Rule
              </Button>
            </div>
            <div className="space-y-2">
              {docFields.map((field: Record<string, unknown>, idx: number) => (
                <div key={field.id as string} className="flex items-center gap-3">
                  <Input {...register(`document_requirements.${idx}.type` as const)} placeholder="doc_type" className="w-40" />
                  <Input {...register(`document_requirements.${idx}.label` as const)} placeholder="Display Label" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeDoc(idx)}>
                    <Trash2 className="w-4 h-4 text-rose-400" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="bg-brand-600 hover:bg-brand-700 text-white font-bold">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save & Schedule Allocation Cycle"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
