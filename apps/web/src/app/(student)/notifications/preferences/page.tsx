"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Moon, Mail, Smartphone, Bell, MessageSquare, Save, Check } from "lucide-react";
import {
  NOTIFICATION_EVENT_TYPES,
  DEFAULT_NOTIFICATION_MATRIX,
  type NotificationEventType,
  type NotificationChannel,
} from "@hostelhub/domain";
import { toast } from "sonner";
import {
  getPushSubscriptionStatus,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  type PushStatus,
} from "@/lib/notifications/push-subscription";

const EVENT_LABELS: Record<NotificationEventType, { title: string; desc: string }> = {
  "application.submitted": {
    title: "Application Submitted",
    desc: "Confirmation when your application is queued",
  },
  "window.closing": {
    title: "Application Window Closing",
    desc: "Reminders 48h and 24h before submission deadline",
  },
  "document.rejected": {
    title: "Document Action Required",
    desc: "Notice if a submitted document requires re-upload",
  },
  "eligibility.result": {
    title: "Eligibility Outcome",
    desc: "Notice when your verification eligibility is decided",
  },
  "draft.ready": {
    title: "Allocation Draft Ready",
    desc: "Operational notification when draft allocation is built",
  },
  "draft.approved": {
    title: "Draft Approved",
    desc: "Notice when draft completes dual authorization",
  },
  "allocation.published": {
    title: "Final Allocation Published",
    desc: "Results reveal and signed allocation letter readiness",
  },
  "waitlist.promoted": {
    title: "Waitlist Vacancy Promotion",
    desc: "Notice when an upgraded room or bed becomes allotted",
  },
  "roomchange.decided": {
    title: "Room Change Outcome",
    desc: "Decision recorded on your swap or relocation request",
  },
  "appeal.decided": {
    title: "Housing Appeal Decision",
    desc: "Committee determination on your special housing appeal",
  },
  "sla.breached": {
    title: "Review SLA Alert",
    desc: "Operational alert when a review period SLA expires",
  },
  "auditchain.failed": {
    title: "Security Audit Chain Alert",
    desc: "Critical alert if cryptographic hash chain diverges",
  },
};

export default function NotificationPreferencesPage() {
  const [channels, setChannels] = React.useState<Record<string, NotificationChannel[]>>({});
  const [quietHours, setQuietHours] = React.useState({
    enabled: false,
    start: "22:00",
    end: "07:00",
    timezone: "UTC",
  });
  const [dailyDigest, setDailyDigest] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  // Web Push Subscription State
  const [pushStatus, setPushStatus] = React.useState<PushStatus>({
    supported: false,
    permission: "unsupported",
    isSubscribed: false,
  });
  const [isSubscribingPush, setIsSubscribingPush] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/v1/notifications/preferences")
      .then((res) => res.json())
      .then((data) => {
        if (data.channels) setChannels(data.channels);
        if (data.quietHours) setQuietHours(data.quietHours);
        if (typeof data.dailyDigest === "boolean") setDailyDigest(data.dailyDigest);
      })
      .catch(() => {});

    void getPushSubscriptionStatus().then(setPushStatus);
  }, []);

  const handleTogglePushSubscription = async () => {
    setIsSubscribingPush(true);
    try {
      if (pushStatus.isSubscribed) {
        const success = await unsubscribeFromPushNotifications();
        if (success) {
          toast.success("Push notifications disabled on this device");
          setPushStatus((prev) => ({ ...prev, isSubscribed: false }));
        }
      } else {
        const result = await subscribeToPushNotifications();
        if (result.success) {
          toast.success("Web Push enabled! You will receive live allotment updates.");
          setPushStatus((prev) => ({ ...prev, isSubscribed: true, permission: "granted" }));
        } else {
          toast.error(result.error || "Failed to enable Web Push.");
        }
      }
    } finally {
      setIsSubscribingPush(false);
    }
  };

  const handleToggleChannel = (eventType: NotificationEventType, channel: NotificationChannel) => {
    if (channel === "push" && !pushStatus.isSubscribed && pushStatus.supported) {
      void handleTogglePushSubscription();
    }
    setChannels((prev) => {
      const currentList = prev[eventType] ?? [...DEFAULT_NOTIFICATION_MATRIX[eventType].channels];
      const nextList = currentList.includes(channel)
        ? currentList.filter((c) => c !== channel)
        : [...currentList, channel];
      return { ...prev, [eventType]: nextList };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch("/api/v1/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channels,
          quietHours,
          dailyDigest,
        }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {/* Back Link */}
      <Link
        href="/notifications"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-text mb-4 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Inbox</span>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold font-heading text-text">Notification Preferences</h1>
          <p className="text-sm text-muted mt-1">
            Configure delivery channels, quiet hours schedule, and summary digest delivery.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-btn bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-sm shrink-0"
        >
          {savedSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          <span>
            {savedSuccess ? "Saved Successfully" : isSaving ? "Saving..." : "Save Preferences"}
          </span>
        </button>
      </div>

      {/* Quiet Hours Card */}
      <div className="bg-surface rounded-card border border-border p-6 shadow-sm mt-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Moon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text">Quiet Hours</h3>
                <p className="text-xs text-muted mt-0.5">
                  During quiet hours, non-critical alerts are paused or held for morning delivery.
                  Critical security and publication alerts bypass quiet hours.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={quietHours.enabled}
                  onChange={(e) => setQuietHours({ ...quietHours, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>

            {quietHours.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/70">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Start Time</label>
                  <input
                    type="time"
                    value={quietHours.start}
                    onChange={(e) => setQuietHours({ ...quietHours, start: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-ctrl border border-border bg-surface-elevated text-xs text-text focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">End Time</label>
                  <input
                    type="time"
                    value={quietHours.end}
                    onChange={(e) => setQuietHours({ ...quietHours, end: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-ctrl border border-border bg-surface-elevated text-xs text-text focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Timezone</label>
                  <select
                    value={quietHours.timezone}
                    onChange={(e) => setQuietHours({ ...quietHours, timezone: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-ctrl border border-border bg-surface-elevated text-xs text-text focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="UTC">UTC</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (BST)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Web Push Registration Card */}
      <div className="bg-surface rounded-card border border-border p-6 shadow-sm mt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text">Web Push Device Registration</h3>
                {pushStatus.isSubscribed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Check className="h-3 w-3" /> Active on This Device
                  </span>
                ) : (
                  <span className="rounded-full bg-muted/20 px-2.5 py-0.5 text-[11px] font-medium text-muted">
                    Not Registered
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5 leading-relaxed max-w-xl">
                Receive instant OS notifications for allocation reveals, dual-authorization
                sign-offs, and critical review windows even when the browser is closed.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="toggle-web-push-btn"
            onClick={handleTogglePushSubscription}
            disabled={!pushStatus.supported || isSubscribingPush}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-btn text-xs font-bold transition-all shadow-sm ${
              pushStatus.isSubscribed
                ? "border border-border bg-background text-text hover:bg-muted/20"
                : "bg-brand-600 text-white hover:bg-brand-700"
            } disabled:opacity-50`}
          >
            {isSubscribingPush ? (
              <span>Connecting...</span>
            ) : pushStatus.isSubscribed ? (
              <span>Disable on This Device</span>
            ) : (
              <>
                <Smartphone className="h-4 w-4" />
                <span>Enable Web Push</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Daily Digest Card */}
      <div className="bg-surface rounded-card border border-border p-6 shadow-sm mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text">Daily Digest Summary</h3>
            <p className="text-xs text-muted mt-0.5">
              Combine non-urgent notifications into a single morning email digest at 8:00 AM instead
              of immediate alerts.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              checked={dailyDigest}
              onChange={(e) => setDailyDigest(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-surface rounded-card border border-border overflow-hidden shadow-sm mt-6">
        <div className="p-4 border-b border-border bg-surface-elevated/40">
          <h3 className="text-sm font-bold text-text">Channel Delivery Matrix</h3>
          <p className="text-xs text-muted mt-0.5">
            Choose which channels receive each specific event. SMS is cost-restricted and strictly
            reserved for final allocations and critical window deadlines.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted uppercase text-[10px] tracking-wider bg-surface/80">
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Bell className="h-3.5 w-3.5" />
                    <span>In-App</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>Push</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>SMS</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {NOTIFICATION_EVENT_TYPES.map((eventType) => {
                const info = EVENT_LABELS[eventType];
                const matrix = DEFAULT_NOTIFICATION_MATRIX[eventType];
                const userChannels = channels[eventType] ?? matrix.channels;

                return (
                  <tr key={eventType} className="hover:bg-surface-elevated/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-text block">{info.title}</span>
                      <span className="text-[11px] text-muted">{info.desc}</span>
                    </td>

                    {/* In-App */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={userChannels.includes("in_app")}
                        onChange={() => handleToggleChannel(eventType, "in_app")}
                        className="rounded border-border text-brand-600 focus:ring-brand-500 h-4 w-4 cursor-pointer"
                      />
                    </td>

                    {/* Email */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={userChannels.includes("email")}
                        onChange={() => handleToggleChannel(eventType, "email")}
                        className="rounded border-border text-brand-600 focus:ring-brand-500 h-4 w-4 cursor-pointer"
                      />
                    </td>

                    {/* Push */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={userChannels.includes("push")}
                        onChange={() => handleToggleChannel(eventType, "push")}
                        className="rounded border-border text-brand-600 focus:ring-brand-500 h-4 w-4 cursor-pointer"
                      />
                    </td>

                    {/* SMS (Guardrail enforced) */}
                    <td className="py-3 px-3 text-center">
                      {matrix.allowSms ? (
                        <input
                          type="checkbox"
                          checked={userChannels.includes("sms")}
                          onChange={() => handleToggleChannel(eventType, "sms")}
                          className="rounded border-border text-brand-600 focus:ring-brand-500 h-4 w-4 cursor-pointer"
                        />
                      ) : (
                        <span className="text-[10px] text-muted italic">N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
