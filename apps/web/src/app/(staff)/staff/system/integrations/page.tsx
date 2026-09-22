"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Key,
  Webhook,
  Plus,
  Trash2,
  Copy,
  Check,
  Send,
  History,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Clock,
  RefreshCw,
  Loader2,
  Terminal,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";

interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit: number;
  last_used_at?: string | undefined;
  revoked: boolean;
  revoked_at?: string | undefined;
  createdAt: string;
}

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  status: "active" | "disabled";
  failure_count: number;
  auto_disabled_at?: string | undefined;
  createdAt: string;
}

interface WebhookLogItem {
  id: string;
  event: string;
  url: string;
  status_code: number;
  response_body?: string | undefined;
  duration_ms: number;
  attempt: number;
  success: boolean;
  error_message?: string | undefined;
  delivered_at: string;
}

const ALL_EVENTS = [
  {
    id: "application.submitted",
    label: "application.submitted",
    desc: "Student submits hostel room application",
  },
  {
    id: "run.completed",
    label: "run.completed",
    desc: "Gale-Shapley matching algorithm run finishes",
  },
  {
    id: "draft.approved",
    label: "draft.approved",
    desc: "Chief Warden escalates and approves draft allocation",
  },
  {
    id: "allocation.published",
    label: "allocation.published",
    desc: "Allotment letters and final room allocations published",
  },
  {
    id: "waitlist.promoted",
    label: "waitlist.promoted",
    desc: "Student promoted from waitlist to confirmed room",
  },
  {
    id: "room.changed",
    label: "room.changed",
    desc: "Student completes room swap or room reassignment",
  },
];

const AVAILABLE_SCOPES = [
  {
    id: "occupancy:read",
    label: "occupancy:read",
    desc: "Read live bed counts, availability and block capacities",
  },
  {
    id: "allocations:read",
    label: "allocations:read",
    desc: "Read published room allocations and student assignments",
  },
  {
    id: "inventory:read",
    label: "inventory:read",
    desc: "Read building floor plans, room attributes and wings",
  },
  {
    id: "reports:read",
    label: "reports:read",
    desc: "Read historical allocation statistics and fairness reports",
  },
];

export default function IntegrationsPlatformPage() {
  const [activeTab, setActiveTab] = useState<"keys" | "webhooks" | "logs">("keys");

  // State
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [logs, setLogs] = useState<WebhookLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Key creation state
  const [isCreatingKey, setIsCreatingKey] = useState<boolean>(false);
  const [newKeyName, setNewKeyName] = useState<string>("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "occupancy:read",
    "allocations:read",
  ]);
  const [newKeyRateLimit, setNewKeyRateLimit] = useState<number>(60);
  const [createdPlaintextKey, setCreatedPlaintextKey] = useState<string | null>(null);
  const [hasCopiedKey, setHasCopiedKey] = useState<boolean>(false);

  // Webhook creation state
  const [isCreatingWebhook, setIsCreatingWebhook] = useState<boolean>(false);
  const [newWebhookName, setNewWebhookName] = useState<string>("");
  const [newWebhookUrl, setNewWebhookUrl] = useState<string>("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "application.submitted",
    "allocation.published",
  ]);

  // Test Ping state
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    webhookId: string;
    success: boolean;
    statusCode: number;
    durationMs: number;
    error?: string;
  } | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/platform/keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch {
      // Fallback
    }
  }, []);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/platform/webhooks");
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
      }
    } catch {
      // Fallback
    }
  }, []);

  const fetchLogs = useCallback(async (webhookId?: string) => {
    try {
      const targetUrl = webhookId
        ? `/api/v1/platform/webhooks/${webhookId}/logs`
        : "/api/v1/platform/webhooks/dummy/logs";
      const res = await fetch(targetUrl);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // Fallback
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchKeys(), fetchWebhooks()]);
    setIsLoading(false);
  }, [fetchKeys, fetchWebhooks]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Handle Create API Key
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || selectedScopes.length === 0) return;

    try {
      const res = await fetch("/api/v1/platform/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: selectedScopes,
          rate_limit: newKeyRateLimit,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedPlaintextKey(data.plaintextToken);
        setNewKeyName("");
        setIsCreatingKey(false);
        fetchKeys();
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || "Failed to create API key.");
      }
    } catch {
      setErrorMsg("Network error creating API key.");
    }
  };

  // Handle Revoke Key
  const handleRevokeKey = async (keyId: string) => {
    if (
      !confirm(
        "Are you sure you want to revoke this API key? Applications using this key will immediately receive 401 Unauthorized.",
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/platform/keys/${keyId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchKeys();
      }
    } catch {
      // Ignore
    }
  };

  // Handle Create Webhook
  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookName.trim() || !newWebhookUrl.trim() || selectedEvents.length === 0) return;

    try {
      const res = await fetch("/api/v1/platform/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWebhookName.trim(),
          url: newWebhookUrl.trim(),
          events: selectedEvents,
        }),
      });

      if (res.ok) {
        setNewWebhookName("");
        setNewWebhookUrl("");
        setIsCreatingWebhook(false);
        fetchWebhooks();
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || "Failed to register webhook.");
      }
    } catch {
      setErrorMsg("Network error creating webhook.");
    }
  };

  // Handle Delete Webhook
  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm("Deactivate this webhook subscription?")) return;
    try {
      const res = await fetch(`/api/v1/platform/webhooks/${webhookId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchWebhooks();
      }
    } catch {
      // Ignore
    }
  };

  // Handle Send Test Event
  const handleSendTestEvent = async (webhookId: string) => {
    setTestingWebhookId(webhookId);
    setTestResult(null);
    try {
      const res = await fetch(`/api/v1/platform/webhooks/${webhookId}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setTestResult({
        webhookId,
        success: data.success,
        statusCode: data.statusCode,
        durationMs: data.durationMs,
        error: data.error,
      });
      fetchWebhooks();
    } catch (err: unknown) {
      setTestResult({
        webhookId,
        success: false,
        statusCode: 0,
        durationMs: 0,
        error: err instanceof Error ? err.message : "Failed to trigger test ping",
      });
    } finally {
      setTestingWebhookId(null);
    }
  };

  // Handle Inspect Logs
  const handleInspectLogs = (webhookId: string) => {
    setActiveTab("logs");
    fetchLogs(webhookId);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setHasCopiedKey(true);
    setTimeout(() => setHasCopiedKey(false), 2500);
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Platform Integration Gateway (E22)</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground font-heading">
            API Keys & Webhooks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Safely connect external university applications (e.g. P04 Hostel Room Exchange) with
            rate-limited bearer tokens and HMAC-SHA256 signed event streams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (activeTab === "keys") setIsCreatingKey(true);
              else setIsCreatingWebhook(true);
            }}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{activeTab === "keys" ? "Generate API Key" : "Register Webhook"}</span>
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between">
          <span>{errorMsg}</span>
          <Button variant="ghost" size="sm" onClick={() => setErrorMsg(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Secret Shown Once Modal */}
      {createdPlaintextKey && (
        <GlassCard className="p-6 border-amber-500/40 bg-amber-500/5 space-y-4 shadow-lg animate-in fade-in zoom-in duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
              <AlertTriangle className="h-5 w-5" />
              <span>Save Your API Key Secret Now</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCreatedPlaintextKey(null)}
              className="text-xs"
            >
              Done & Dismiss
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            For security, this secret token is hashed with SHA-256 and will{" "}
            <strong>never be shown again</strong>. If lost, you will need to revoke and generate a
            new key.
          </p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-950 border border-border text-emerald-400 font-mono text-sm overflow-x-auto">
            <span className="flex-1 select-all">{createdPlaintextKey}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copyToClipboard(createdPlaintextKey)}
              className="gap-1.5 shrink-0"
            >
              {hasCopiedKey ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{hasCopiedKey ? "Copied" : "Copy"}</span>
            </Button>
          </div>
          <div className="p-3 rounded-lg bg-background/50 border border-border/60 text-xs text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              <span>Example Authorization Header:</span>
            </div>
            <code className="text-[11px] block text-foreground/90 select-all">
              curl -H &quot;Authorization: Bearer {createdPlaintextKey}&quot;
              https://hostelhub.campus.edu/api/v1/platform/occupancy
            </code>
          </div>
        </GlassCard>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <button
          onClick={() => setActiveTab("keys")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "keys"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Key className="h-4 w-4" />
          <span>API Keys ({keys.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("webhooks")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "webhooks"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Webhook className="h-4 w-4" />
          <span>Webhooks ({webhooks.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("logs");
            if (webhooks[0]) fetchLogs(webhooks[0].id);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "logs"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <History className="h-4 w-4" />
          <span>Delivery History</span>
        </button>
      </div>

      {/* ── TAB 1: API KEYS ─────────────────────────────────────────────────── */}
      {activeTab === "keys" && (
        <div className="space-y-6">
          {/* Create Key Modal/Drawer */}
          {isCreatingKey && (
            <GlassCard className="p-6 border-primary/30 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Generate New Platform API Key</h3>
                <Button variant="ghost" size="sm" onClick={() => setIsCreatingKey(false)}>
                  Cancel
                </Button>
              </div>
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Application Name / Consumer Label
                  </label>
                  <Input
                    placeholder="e.g., P04 Hostel Room Exchange"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Authorized Scopes
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AVAILABLE_SCOPES.map((scope) => {
                      const isChecked = selectedScopes.includes(scope.id);
                      return (
                        <label
                          key={scope.id}
                          className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? "bg-primary/10 border-primary/40 text-foreground"
                              : "bg-muted/30 border-border/60 text-muted-foreground hover:border-border"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedScopes([...selectedScopes, scope.id]);
                              } else {
                                setSelectedScopes(selectedScopes.filter((s) => s !== scope.id));
                              }
                            }}
                            className="mt-0.5"
                          />
                          <div>
                            <div className="font-bold font-mono text-primary">{scope.label}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {scope.desc}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Rate Limit (Requests per Minute)
                  </label>
                  <Input
                    type="number"
                    min={10}
                    max={1000}
                    value={newKeyRateLimit}
                    onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value, 10) || 60)}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Enforced per key using sliding window token buckets. Exceeding requests receive
                    429 Too Many Requests.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreatingKey(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!newKeyName.trim() || selectedScopes.length === 0}
                  >
                    Create & Generate Key
                  </Button>
                </div>
              </form>
            </GlassCard>
          )}

          {/* Keys Table */}
          <GlassCard className="overflow-hidden">
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground">Registered API Keys</h3>
                <p className="text-xs text-muted-foreground">
                  Active keys authenticating &quot;Authorization: Bearer &lt;key&gt;&quot; for
                  read-only scopes.
                </p>
              </div>
            </div>

            {keys.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Key className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                <p className="text-sm font-semibold text-foreground">No API Keys Configured</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Generate an API key to allow external campus systems to securely read occupancy
                  and room allocation rosters.
                </p>
                <Button size="sm" onClick={() => setIsCreatingKey(true)} className="gap-1.5 mt-2">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Generate Key</span>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground uppercase font-bold tracking-wider">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Key Prefix</th>
                      <th className="py-3 px-4">Scopes</th>
                      <th className="py-3 px-4">Rate Limit</th>
                      <th className="py-3 px-4">Last Used</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {keys.map((k) => (
                      <tr key={k.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-foreground">{k.name}</td>
                        <td className="py-3.5 px-4 font-mono text-muted-foreground">
                          {k.key_prefix}...
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {k.scopes.map((s) => (
                              <Badge key={s} variant="secondary" className="font-mono text-[10px]">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {k.rate_limit} req/min
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}
                        </td>
                        <td className="py-3.5 px-4">
                          {k.revoked ? (
                            <Badge variant="destructive">Revoked</Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-emerald-500 border-emerald-500/30"
                            >
                              Active
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {!k.revoked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeKey(k.id)}
                              className="text-destructive hover:bg-destructive/10 text-xs gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Revoke</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ── TAB 2: WEBHOOKS ─────────────────────────────────────────────────── */}
      {activeTab === "webhooks" && (
        <div className="space-y-6">
          {/* Create Webhook Drawer */}
          {isCreatingWebhook && (
            <GlassCard className="p-6 border-primary/30 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Register New Webhook</h3>
                <Button variant="ghost" size="sm" onClick={() => setIsCreatingWebhook(false)}>
                  Cancel
                </Button>
              </div>
              <form onSubmit={handleCreateWebhook} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Webhook Name / Target Description
                  </label>
                  <Input
                    placeholder="e.g., P04 Room Exchange Sync Receiver"
                    value={newWebhookName}
                    onChange={(e) => setNewWebhookName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Endpoint URL (Must be accessible via HTTP/HTTPS)
                  </label>
                  <Input
                    type="url"
                    placeholder="https://exchange.campus.edu/api/webhooks/hostelhub"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Subscribed Events
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_EVENTS.map((event) => {
                      const isChecked = selectedEvents.includes(event.id);
                      return (
                        <label
                          key={event.id}
                          className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? "bg-primary/10 border-primary/40 text-foreground"
                              : "bg-muted/30 border-border/60 text-muted-foreground hover:border-border"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEvents([...selectedEvents, event.id]);
                              } else {
                                setSelectedEvents(selectedEvents.filter((ev) => ev !== event.id));
                              }
                            }}
                            className="mt-0.5"
                          />
                          <div>
                            <div className="font-bold font-mono text-primary">{event.label}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {event.desc}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreatingWebhook(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      !newWebhookName.trim() || !newWebhookUrl.trim() || selectedEvents.length === 0
                    }
                  >
                    Register Webhook
                  </Button>
                </div>
              </form>
            </GlassCard>
          )}

          {/* Test Ping Result Banner */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-200 ${
                testResult.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span>
                  {testResult.success
                    ? `Test ping delivered successfully! Status: ${testResult.statusCode} OK (${testResult.durationMs}ms)`
                    : `Test delivery failed: ${testResult.error || `HTTP ${testResult.statusCode}`}`}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTestResult(null)}
                className="h-7 text-xs"
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Webhook Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {webhooks.length === 0 ? (
              <GlassCard className="p-12 text-center col-span-full space-y-3">
                <Webhook className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                <p className="text-sm font-semibold text-foreground">No Webhooks Configured</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Add an endpoint to start broadcasting HMAC-SHA256 signed event notifications to
                  other campus platforms.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsCreatingWebhook(true)}
                  className="gap-1.5 mt-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Register Webhook</span>
                </Button>
              </GlassCard>
            ) : (
              webhooks.map((w) => {
                const isAutoDisabled =
                  w.status === "disabled" && (w.failure_count >= 5 || w.auto_disabled_at);
                return (
                  <GlassCard key={w.id} className="p-5 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                            <span>{w.name}</span>
                            {isAutoDisabled ? (
                              <Badge variant="destructive" className="text-[10px]">
                                Auto-Disabled (5 Failures)
                              </Badge>
                            ) : w.status === "active" ? (
                              <Badge
                                variant="outline"
                                className="text-emerald-500 border-emerald-500/30 text-[10px]"
                              >
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                Disabled
                              </Badge>
                            )}
                          </h4>
                          <p className="text-xs font-mono text-muted-foreground break-all mt-1">
                            {w.url}
                          </p>
                        </div>
                      </div>

                      {isAutoDisabled && (
                        <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[11px] flex items-center gap-2 mt-3">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>
                            Endpoint failed 5 consecutive attempts. Auto-disabled on{" "}
                            {new Date(w.auto_disabled_at || "").toLocaleDateString()}.
                          </span>
                        </div>
                      )}

                      <div className="mt-3 space-y-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Subscribed Events
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {w.events.map((ev) => (
                            <Badge key={ev} variant="secondary" className="font-mono text-[10px]">
                              {ev}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                        <span>Failures: {w.failure_count}/5</span>
                        <span className="font-mono">HMAC: {w.secret.slice(0, 10)}...</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInspectLogs(w.id)}
                        className="text-xs gap-1"
                      >
                        <History className="h-3 w-3" />
                        <span>History</span>
                      </Button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={testingWebhookId === w.id}
                          onClick={() => handleSendTestEvent(w.id)}
                          className="text-xs gap-1"
                        >
                          {testingWebhookId === w.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          <span>Send Test</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWebhook(w.id)}
                          className="text-destructive hover:bg-destructive/10 text-xs"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: DELIVERY HISTORY ─────────────────────────────────────────── */}
      {activeTab === "logs" && (
        <GlassCard className="overflow-hidden">
          <div className="p-4 border-b border-border/60 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-foreground">Webhook Delivery Logs</h3>
              <p className="text-xs text-muted-foreground">
                Audit trail of outgoing HTTP dispatches, HMAC signatures, response status codes, and
                retry attempts.
              </p>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Clock className="h-10 w-10 text-muted-foreground/50 mx-auto" />
              <p className="text-sm font-semibold text-foreground">No Delivery History Yet</p>
              <p className="text-xs text-muted-foreground">
                Trigger a test ping event or wait for allocation lifecycle updates to view real-time
                delivery logs.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Endpoint</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Attempt</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4">Delivered At</th>
                    <th className="py-3 px-4">Response Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">{l.event}</td>
                      <td className="py-3 px-4 font-mono text-muted-foreground max-w-[200px] truncate">
                        {l.url}
                      </td>
                      <td className="py-3 px-4">
                        {l.success ? (
                          <Badge
                            variant="outline"
                            className="text-emerald-500 border-emerald-500/30"
                          >
                            {l.status_code} OK
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            {l.status_code > 0 ? l.status_code : "Network Error"}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">Attempt {l.attempt}</td>
                      <td className="py-3 px-4 text-muted-foreground">{l.duration_ms}ms</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(l.delivered_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground max-w-[220px] truncate">
                        {l.response_body || l.error_message || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
