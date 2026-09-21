"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sliders,
  ExternalLink,
  CheckCheck,
} from "lucide-react";
import { useNotificationStore } from "@/stores/notification-store";

export default function NotificationsInboxPage() {
  const { notifications, unreadCount, markAllAsRead, markAsRead, fetchNotifications } =
    useNotificationStore();

  const [activeTab, setActiveTab] = React.useState<"all" | "unread" | "application" | "allocation">(
    "all",
  );

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filtered = notifications.filter((n) => {
    if (activeTab === "unread") return !n.read;
    if (activeTab === "application") return n.category === "application";
    if (activeTab === "allocation") return n.category === "allocation";
    return true;
  });

  const iconMap = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    alert: AlertTriangle,
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-heading text-text">Notification Inbox</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-sm text-muted mt-1">
            Real-time multi-channel updates regarding your housing applications, allocations, and
            deadlines.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/notifications/preferences"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-btn border border-border bg-surface text-xs font-semibold text-text hover:bg-surface-elevated transition-colors shadow-sm"
          >
            <Sliders className="h-4 w-4 text-muted" />
            <span>Preferences</span>
          </Link>
          <button
            type="button"
            onClick={() => markAllAsRead()}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-btn bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <CheckCheck className="h-4 w-4" />
            <span>Mark all as read</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 pt-6 pb-4 overflow-x-auto">
        {(
          [
            { id: "all", label: "All Updates" },
            { id: "unread", label: `Unread (${unreadCount})` },
            { id: "application", label: "Application" },
            { id: "allocation", label: "Allocation" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
              activeTab === tab.id
                ? "bg-text text-background font-bold"
                : "bg-surface border border-border/70 text-muted hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-surface rounded-card border border-border divide-y divide-border overflow-hidden shadow-sm mt-2">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated text-muted mb-3">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-text">No notifications found</h3>
            <p className="text-xs text-muted mt-1">
              You have caught up with all updates in this category.
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const Icon = iconMap[item.type] ?? Info;
            return (
              <div
                key={item.id}
                className={`p-4.5 sm:p-5 flex items-start gap-4 transition-colors ${
                  item.read ? "opacity-75 bg-transparent" : "bg-brand-50/30 dark:bg-brand-900/10"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl mt-0.5 shadow-sm ${
                    item.type === "success"
                      ? "bg-success/15 text-success"
                      : item.type === "warning" || item.type === "alert"
                        ? "bg-warning/15 text-warning"
                        : "bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-text">{item.title}</h4>
                      {!item.read && (
                        <span className="h-2 w-2 rounded-full bg-brand-600 shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-muted font-mono">{item.timestamp}</span>
                  </div>

                  <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
                    {item.message}
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    {item.deepLink && (
                      <Link
                        href={item.deepLink}
                        onClick={() => markAsRead(item.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        <span>Take Action</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                    {!item.read && (
                      <button
                        type="button"
                        onClick={() => markAsRead(item.id)}
                        className="text-xs text-muted hover:text-text transition-colors"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
