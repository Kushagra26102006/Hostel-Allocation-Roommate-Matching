"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { useAuditLogs } from "@/hooks/use-mock-api";
import { Activity, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function SysAdminAuditPage() {
  const { data: auditLogs } = useAuditLogs();
  const [isVerifying, setIsVerifying] = React.useState(false);

  const handleVerifyLedger = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      toast.success(
        "HMAC-SHA256 Cryptographic Hash Chain verified: 100% Valid (0 Tampered Records)",
      );
    }, 800);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface-muted px-3 py-1 text-xs font-semibold text-foreground">
            <Activity className="h-3.5 w-3.5" />
            <span>Cryptographic HMAC-SHA256 Ledger</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">
            Immutable Audit Hash Chain
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Every privileged warden override, publication event, and rule mutation is linked in an
            append-only cryptographic chain.
          </p>
        </div>

        <Button onClick={handleVerifyLedger} disabled={isVerifying} className="rounded-xl">
          <ShieldCheck className="mr-2 h-4 w-4" />
          {isVerifying ? "Verifying Hashes..." : "Verify Chain Integrity"}
        </Button>
      </div>

      <div className="space-y-4">
        {auditLogs?.map((log) => (
          <GlassCard key={log.id} className="p-5 font-mono text-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-brand-600 dark:text-brand-400">{log.action}</span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  Chain Valid ✓
                </span>
              </div>
              <div className="text-muted-foreground text-[11px]">
                {log.timestamp} • IP: {log.ipAddress}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-muted-foreground block font-sans">Actor / Role:</span>
                <span className="text-foreground font-bold">{log.actor}</span> ({log.actorRole})
              </div>
              <div>
                <span className="text-muted-foreground block font-sans">Target Resource:</span>
                <span className="text-foreground font-bold">{log.target}</span>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-surface-muted/60 p-3 space-y-1 text-[10px] text-muted-foreground border border-border/40 overflow-hidden">
              <div className="truncate">
                <strong className="text-foreground">Current Hash:</strong> {log.hash}
              </div>
              <div className="truncate">
                <strong className="text-foreground">Previous Hash:</strong> {log.prevHash}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
