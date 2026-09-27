"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Switch } from "@/components/ui/switch";
import { useFeatureFlags, useToggleFeatureFlag } from "@/hooks/use-mock-api";
import { Flag } from "lucide-react";
import { toast } from "sonner";

export default function SysAdminFeatureFlagsPage() {
  const { data: flags } = useFeatureFlags();
  const toggleMutation = useToggleFeatureFlag();

  const handleToggle = (key: string, enabled: boolean) => {
    toggleMutation.mutate(
      { key, enabled: !enabled },
      {
        onSuccess: () => toast.success(`Feature Flag ${key} updated across campus nodes!`),
      },
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface-muted px-3 py-1 text-xs font-semibold text-foreground">
          <Flag className="h-3.5 w-3.5" />
          <span>Dynamic Feature Toggles</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">System Feature Flags</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Safely toggle algorithmic optimization modules, student grouping, and QR verification in
          production.
        </p>
      </div>

      <div className="space-y-3">
        {flags?.map((f) => (
          <GlassCard key={f.key} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading text-sm font-bold text-foreground">{f.name}</span>
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {f.category}
                  </span>
                </div>
                <div className="font-mono text-xs text-brand-600 dark:text-brand-400 mt-0.5">
                  {f.key}
                </div>
              </div>

              <Switch checked={f.enabled} onCheckedChange={() => handleToggle(f.key, f.enabled)} />
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
