"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWebhooks } from "@/hooks/use-mock-api";
import { Webhook, Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";

export default function SysAdminWebhooksPage() {
  const { data: webhooks } = useWebhooks();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface-muted px-3 py-1 text-xs font-semibold text-foreground">
            <Webhook className="h-3.5 w-3.5" />
            <span>Event Streaming</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">Outbound Webhooks</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Configure HMAC-SHA256 signed event dispatchers for campus ERP and biometric door
            turnstiles.
          </p>
        </div>

        <Button
          onClick={() => toast.success("Webhook endpoint configured!")}
          className="rounded-xl"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      <div className="space-y-3">
        {webhooks?.map((w) => (
          <GlassCard key={w.id} className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-foreground">{w.url}</span>
                  <StatusBadge status="approved" label={w.status} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Subscribed Event:{" "}
                  <strong className="text-brand-600 dark:text-brand-400 font-mono">
                    {w.event}
                  </strong>{" "}
                  • Delivery Success: {w.successRate}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.info("Test webhook ping dispatched!")}
                  className="rounded-xl text-xs"
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Test Ping
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toast.error("Webhook deleted")}
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
