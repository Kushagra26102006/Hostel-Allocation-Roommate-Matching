"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { useApiKeys } from "@/hooks/use-mock-api";
import { Key, Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

export default function SysAdminApiKeysPage() {
  const { data: keys } = useApiKeys();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface-muted px-3 py-1 text-xs font-semibold text-foreground">
            <Key className="h-3.5 w-3.5" />
            <span>M2M Integration</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">API Keys & Tokens</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Manage scoped machine-to-machine API credentials for campus ERP, turnstiles, and mobile
            apps.
          </p>
        </div>

        <Button onClick={() => toast.success("Generated new API Key!")} className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Generate Key
        </Button>
      </div>

      <div className="space-y-3">
        {keys?.map((k) => (
          <GlassCard key={k.id} className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-heading text-sm font-bold text-foreground">{k.name}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-xs text-brand-600 dark:text-brand-400 font-semibold">
                    {k.prefix}
                  </span>
                  <span className="text-[11px] text-muted-foreground">• Created {k.createdAt}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {k.scopes.map((s, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-surface-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toast.success("Token prefix copied")}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toast.error("Key revoked")}
                  className="h-8 w-8 p-0 text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
