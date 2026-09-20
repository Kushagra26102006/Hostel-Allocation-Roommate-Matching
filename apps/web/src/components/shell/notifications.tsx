"use client";

import * as React from "react";
import { Bell, Sparkles, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { useNotificationStore } from "@/stores/notification-store";
import { useMotionPreference } from "@/hooks/use-motion-preference";
import { useMessages } from "@/lib/i18n";

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const { notifications, isWiggling, triggerDemoNotification, markAllAsRead } =
    useNotificationStore();
  const { prefersReducedMotion } = useMotionPreference();
  const messages = useMessages();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const iconMap = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    alert: AlertTriangle,
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={messages.shell.notifications}
        aria-expanded={open}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-ctrl border border-border/70 text-muted transition-colors hover:bg-surface/80 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isWiggling && !prefersReducedMotion ? "animate-wiggle" : ""
        }`}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={messages.shell.notifications}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-card border border-border bg-surface shadow-2xl z-50 animate-in fade-in zoom-in-95 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/70 p-3.5 bg-surface/90">
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm font-bold text-text">
                {messages.shell.notifications}
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-brand-100 dark:bg-brand-900/40 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:text-brand-300">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="text-[11px] text-muted hover:text-brand-600 disabled:opacity-50 transition-colors"
              >
                {messages.shell.markAllRead}
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted">
                {messages.shell.noNotifications}
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = iconMap[n.type] ?? Info;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-3.5 text-xs transition-colors ${
                      n.read ? "opacity-75 bg-transparent" : "bg-brand-50/40 dark:bg-brand-900/10"
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5 ${
                        n.type === "success"
                          ? "bg-success/15 text-success"
                          : n.type === "warning"
                            ? "bg-warning/15 text-warning"
                            : "bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-text">{n.title}</span>
                        <span className="text-[10px] text-muted font-mono">{n.timestamp}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with Dev Trigger */}
          <div className="border-t border-border/70 p-3 bg-surface/50 flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted">Real-time alerts</span>
            <button
              type="button"
              onClick={triggerDemoNotification}
              className="inline-flex items-center gap-1.5 rounded-md border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300 transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              <span>{messages.shell.triggerDemoNotification}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
