"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { FadeIn, FadeUp } from "@/components/ui/motion-primitives";
import { Bell, CheckCircle2, Check } from "lucide-react";
import { toast } from "sonner";

type NotificationCategory = "All" | "Application" | "Allocation" | "Waitlist" | "Review" | "System";

interface NotificationItem {
  id: string;
  category: "Application" | "Allocation" | "Waitlist" | "Review" | "System";
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "success" | "info" | "warning" | "notice";
}

export default function StudentNotificationsPage() {
  const [selectedCategory, setSelectedCategory] = React.useState<NotificationCategory>("All");
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([
    {
      id: "n1",
      category: "Allocation",
      title: "Fall 2026 Hostel Allotment Officially Published",
      message:
        "Your room assignment for Aryabhata Hall (Room A-204, Bed 1) has been approved and published by the Chief Warden. You may download your Allotment Letter.",
      time: "2 hours ago",
      read: false,
      type: "success",
    },
    {
      id: "n2",
      category: "Application",
      title: "Roommate Pairing Accepted & Mutual Consent Confirmed",
      message:
        "Rohan Deshmukh (23CS10088) has accepted your roommate invitation. Group status is now paired with 92% lifestyle compatibility.",
      time: "1 day ago",
      read: false,
      type: "info",
    },
    {
      id: "n3",
      category: "System",
      title: "Physical Key Handover & Check-in Schedule",
      message:
        "Aryabhata Hall Caretaker Office will conduct physical key distribution starting 1st October from Counter 2. Present your QR verification letter.",
      time: "2 days ago",
      read: true,
      type: "notice",
    },
    {
      id: "n4",
      category: "Waitlist",
      title: "General Merit Waitlist Position Updated",
      message:
        "Campus capacity expansion has moved the general waitlist queue forward by 4 positions.",
      time: "3 days ago",
      read: true,
      type: "info",
    },
    {
      id: "n5",
      category: "Review",
      title: "Warden Pre-Allotment Verification Completed",
      message:
        "Aryabhata Hall warden conducted sign-off on 420 resident beds with zero constraint exceptions.",
      time: "4 days ago",
      read: true,
      type: "success",
    },
  ]);

  const categories: NotificationCategory[] = [
    "All",
    "Application",
    "Allocation",
    "Waitlist",
    "Review",
    "System",
  ];

  const filtered = notifications.filter(
    (n) => selectedCategory === "All" || n.category === selectedCategory,
  );

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const markSingleRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <FadeIn className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <FadeUp className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
            <Bell className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
            <span>HostelHub Communications Feed</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl text-foreground">
            Notifications & Alerts
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Official announcements, allocation milestones, and verification updates from Housing
            Administration.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            className="rounded-xl text-xs shrink-0"
          >
            <Check className="mr-1.5 h-3.5 w-3.5" />
            Mark All as Read ({unreadCount})
          </Button>
        )}
      </FadeUp>

      {/* Category Filter Pills */}
      <FadeUp delay={0.05} className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                isSelected
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </FadeUp>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <GlassCard className="p-8 text-center text-xs text-muted-foreground">
            No notifications found in category &quot;{selectedCategory}&quot;.
          </GlassCard>
        ) : (
          filtered.map((n, idx) => (
            <FadeUp key={n.id} delay={0.08 + idx * 0.03}>
              <GlassCard
                onClick={() => markSingleRead(n.id)}
                className={`p-4 sm:p-5 transition-all cursor-pointer hover:border-brand-500/40 hover:bg-surface-muted/50 ${
                  !n.read ? "border-brand-500/40 bg-brand-500/5" : "border-border/70"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Category / Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      n.type === "success"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200/50"
                    }`}
                  >
                    {n.type === "success" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Bell className="h-5 w-5" />
                    )}
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/40 px-2 py-0.5 rounded-md border border-brand-200/50">
                          {n.category}
                        </span>
                        <h3 className="font-heading text-sm font-bold text-foreground truncate">
                          {n.title}
                        </h3>
                        {!n.read && (
                          <span
                            className="h-2 w-2 rounded-full bg-brand-500 shrink-0"
                            title="Unread"
                          />
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                        {n.time}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </FadeUp>
          ))
        )}
      </div>
    </FadeIn>
  );
}
