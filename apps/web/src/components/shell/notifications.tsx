"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Sparkles,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { useNotificationStore } from "@/stores/notification-store";
import { useMotionPreference } from "@/hooks/use-motion-preference";
import { useMessages } from "@/lib/i18n";

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isWiggling,
    isBadgePopping,
    fetchNotifications,
    triggerDemoNotification,
    markAllAsRead,
    markAsRead,
    addLiveNotification,
  } = useNotificationStore();
  const { prefersReducedMotion } = useMotionPreference();
  const messages = useMessages();

  // 1. Initial fetch
  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // 2. Real-time Server-Sent Events (SSE) connection
  React.useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/v1/notifications/stream");
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "notification" && data.notification) {
            addLiveNotification(data.notification);
          }
        } catch {
          // Heartbeat or malformed data ignored
        }
      };
    } catch {
      // Non-blocking fallback
    }

    return () => {
      eventSource?.close();
    };
  }, [addLiveNotification]);

  const iconMap = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    alert: AlertTriangle,
  };

  const handleNotificationClick = async (id: string, deepLink?: string) => {
    await markAsRead(id);
    setOpen(false);
    if (deepLink) {
      router.push(deepLink);
    }
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
          <span
            className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white shadow-sm transition-transform duration-300 ${
              isBadgePopping && !prefersReducedMotion
                ? "scale-125 ring-2 ring-brand-500/50"
                : "scale-100"
            }`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
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

            <div className="flex items-center gap-3">
              <Link
                href="/notifications/preferences"
                onClick={() => setOpen(false)}
                className="text-muted hover:text-text transition-colors p-1 rounded hover:bg-surface"
                title="Notification Preferences"
                aria-label="Preferences"
              >
                <Sliders className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => markAllAsRead()}
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
                    onClick={() => handleNotificationClick(n.id, n.deepLink)}
                    className={`flex items-start gap-3 p-3.5 text-xs transition-colors cursor-pointer hover:bg-surface-elevated/80 ${
                      n.read ? "opacity-75 bg-transparent" : "bg-brand-50/40 dark:bg-brand-900/10"
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5 ${
                        n.type === "success"
                          ? "bg-success/15 text-success"
                          : n.type === "warning" || n.type === "alert"
                            ? "bg-warning/15 text-warning"
                            : "bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-text truncate">{n.title}</span>
                        <span className="text-[10px] text-muted font-mono shrink-0">
                          {n.timestamp}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      {n.deepLink && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                          <span>Open</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/70 p-3 bg-surface/50 flex items-center justify-between">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
            >
              View all in inbox &rarr;
            </Link>
            <button
              type="button"
              onClick={triggerDemoNotification}
              className="inline-flex items-center gap-1.5 rounded-md border border-brand-300 bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300 transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              <span>Simulate Alert</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
