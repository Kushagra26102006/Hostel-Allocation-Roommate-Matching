"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Bell,
  CheckCircle2,
  Check,
  Sparkles,
  FolderCheck,
  RefreshCw,
  Scale,
  ArrowRight,
  Settings,
  Moon,
  Mail,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type NotificationCategory =
  "All" | "Allocation" | "Application" | "Documents" | "Room Change" | "Appeals" | "System";

interface NotificationItem {
  id: string;
  category: "Allocation" | "Application" | "Documents" | "Room Change" | "Appeals" | "System";
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "success" | "info" | "warning" | "notice";
  actionHref?: string;
  actionLabel?: string;
}

export default function StudentNotificationsPage() {
  const [selectedCategory, setSelectedCategory] = React.useState<NotificationCategory>("All");
  const [showPreferences, setShowPreferences] = React.useState(false);
  const [filterRead, setFilterRead] = React.useState<"all" | "unread">("all");

  const [notifications, setNotifications] = React.useState<NotificationItem[]>([
    {
      id: "n1",
      category: "Allocation",
      title: "Autumn 2026 Room Allotment Officially Published",
      message:
        "Your official room assignment in Aryabhata Hall (Room A-204, Bed 1) has been confirmed and digitally signed by the Chief Warden. You may download your Allotment Letter.",
      time: "2 hours ago",
      read: false,
      type: "success",
      actionHref: "/student/result",
      actionLabel: "View Allotment Letter",
    },
    {
      id: "n2",
      category: "Documents",
      title: "Fee Receipt & Student ID Digitally Verified",
      message:
        "Warden administrative desk approved your tuition fee receipt and institutional identity proof. Your status is 100% policy compliant.",
      time: "5 hours ago",
      read: false,
      type: "success",
      actionHref: "/student/documents",
      actionLabel: "Document Vault",
    },
    {
      id: "n3",
      category: "Application",
      title: "Mutual Roommate Pairing Confirmed (CAMPUS-8819)",
      message:
        "Rohan Deshmukh (23CS10088) accepted your pairing invitation. Group mutual consent confirmed with a 92% lifestyle compatibility alignment.",
      time: "1 day ago",
      read: true,
      type: "info",
      actionHref: "/student/group",
      actionLabel: "Manage Group",
    },
    {
      id: "n4",
      category: "Room Change",
      title: "Room Change Petition Under Review (RC-101)",
      message:
        "Warden review for transfer to Single Suite in Ramanujan Tower has verified your Teaching Assistant endorsement. Awaiting final vacancy check.",
      time: "2 days ago",
      read: true,
      type: "info",
      actionHref: "/student/room-change",
      actionLabel: "Track Timeline",
    },
    {
      id: "n5",
      category: "System",
      title: "Physical Key Handover Schedule: Window Announced",
      message:
        "Key distribution will commence October 1st at Caretaker Desk Counter 2. Ensure you bring your printed Allotment Letter with QR verification.",
      time: "3 days ago",
      read: true,
      type: "notice",
      actionHref: "/student/dashboard",
      actionLabel: "Move-In Guide",
    },
    {
      id: "n6",
      category: "Appeals",
      title: "Appeal APL-501 Endorsed by Warden Council",
      message:
        "Your distance hardship declaration was endorsed by the local warden and forwarded to Prof. Verma for statutory quota alignment.",
      time: "4 days ago",
      read: true,
      type: "notice",
      actionHref: "/student/appeals",
      actionLabel: "View Appeal",
    },
  ]);

  // Preferences State
  const [prefEmail, setPrefEmail] = React.useState(true);
  const [prefSms, setPrefSms] = React.useState(true);
  const [prefPush, setPrefPush] = React.useState(true);
  const [prefQuietHours, setPrefQuietHours] = React.useState(true);

  const categories: NotificationCategory[] = [
    "All",
    "Allocation",
    "Application",
    "Documents",
    "Room Change",
    "Appeals",
    "System",
  ];

  const filtered = notifications.filter((n) => {
    if (selectedCategory !== "All" && n.category !== selectedCategory) return false;
    if (filterRead === "unread" && n.read) return false;
    return true;
  });

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const markSingleRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-7 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <Bell className="h-3.5 w-3.5" />
            <span>Instant Student Notification Centre</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-2 text-xs font-bold text-white shadow-xs">
                {unreadCount} New
              </span>
            )}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Track real-time room assignments, warden council reviews, and deadline reminders.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPreferences(true)}
            className="text-xs border-border/80 min-target-size"
          >
            <Settings className="mr-1.5 h-3.5 w-3.5 text-muted" />
            <span>Alert Preferences</span>
          </Button>

          {unreadCount > 0 && (
            <Button
              size="sm"
              onClick={markAllRead}
              className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold min-target-size"
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              <span>Mark All Read</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Unread Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all min-target-size ${
                selectedCategory === cat
                  ? "bg-brand-500 text-white shadow-xs"
                  : "text-muted hover:text-foreground hover:bg-surface-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setFilterRead("all")}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filterRead === "all"
                ? "text-brand-600 font-bold bg-brand-50 dark:bg-brand-950/40"
                : "text-muted"
            }`}
          >
            All Alerts
          </button>
          <span>&bull;</span>
          <button
            type="button"
            onClick={() => setFilterRead("unread")}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filterRead === "unread"
                ? "text-brand-600 font-bold bg-brand-50 dark:bg-brand-950/40"
                : "text-muted"
            }`}
          >
            Unread Only ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/80 p-12 text-center text-muted">
            <Bell className="h-10 w-10 mx-auto text-muted/50 mb-3" />
            <p className="font-heading text-base font-bold text-foreground">
              No alerts in this category
            </p>
            <p className="text-xs mt-1">
              You are all caught up with university housing communications.
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isUnread = !item.read;

            return (
              <div
                key={item.id}
                onClick={() => markSingleRead(item.id)}
                className={`group rounded-2xl border p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-xs ${
                  isUnread
                    ? "border-brand-500/50 bg-brand-50/20 dark:bg-brand-950/20 hover:border-brand-500/80"
                    : "border-border/80 bg-surface hover:border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 mt-0.5 ${
                        item.type === "success"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : item.type === "warning"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-brand-500/10 text-brand-600"
                      }`}
                    >
                      {item.category === "Allocation" && <Sparkles className="h-4.5 w-4.5" />}
                      {item.category === "Documents" && <FolderCheck className="h-4.5 w-4.5" />}
                      {item.category === "Application" && <CheckCircle2 className="h-4.5 w-4.5" />}
                      {item.category === "Room Change" && <RefreshCw className="h-4.5 w-4.5" />}
                      {item.category === "Appeals" && <Scale className="h-4.5 w-4.5" />}
                      {item.category === "System" && <Bell className="h-4.5 w-4.5" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading text-sm sm:text-base font-bold text-foreground">
                          {item.title}
                        </span>
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-brand-500 shrink-0" />
                        )}
                        <span className="rounded-md bg-surface-muted px-2 py-0.5 text-[10px] font-bold text-muted border border-border/60">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed max-w-2xl">{item.message}</p>

                      {item.actionHref && (
                        <div className="pt-2">
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="text-xs text-brand-600 font-bold p-0 h-auto hover:bg-transparent min-target-size"
                          >
                            <Link href={item.actionHref}>
                              <span>{item.actionLabel}</span>
                              <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-muted shrink-0 flex flex-col items-end gap-1">
                    <span>{item.time}</span>
                    {isUnread && (
                      <span className="text-[10px] font-bold text-brand-600 uppercase">Unread</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Notification Preferences Modal */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="max-w-md p-6 bg-surface text-foreground border-border/80">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-base font-bold">Notification & Alert Channels</DialogTitle>
            <DialogDescription className="text-xs text-muted">
              Configure delivery methods and quiet hours for university housing alerts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-muted/50 border border-border/60">
              <div className="flex items-center gap-3">
                <Mail className="h-4.5 w-4.5 text-brand-600" />
                <div>
                  <span className="font-bold text-foreground block">Campus Email Alerts</span>
                  <span className="text-[11px] text-muted">aarav.sharma@campus.edu</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefEmail}
                onChange={(e) => setPrefEmail(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-muted/50 border border-border/60">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4.5 w-4.5 text-brand-600" />
                <div>
                  <span className="font-bold text-foreground block">SMS Emergency Alerts</span>
                  <span className="text-[11px] text-muted">+91 98765 43210</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefSms}
                onChange={(e) => setPrefSms(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-muted/50 border border-border/60">
              <div className="flex items-center gap-3">
                <Bell className="h-4.5 w-4.5 text-brand-600" />
                <div>
                  <span className="font-bold text-foreground block">
                    Browser Push Notifications
                  </span>
                  <span className="text-[11px] text-muted">
                    Immediate desktop & mobile web push
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefPush}
                onChange={(e) => setPrefPush(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-muted/50 border border-border/60">
              <div className="flex items-center gap-3">
                <Moon className="h-4.5 w-4.5 text-purple-600" />
                <div>
                  <span className="font-bold text-foreground block">
                    Quiet Hours (10 PM – 7 AM)
                  </span>
                  <span className="text-[11px] text-muted">Suppress non-critical alerts</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefQuietHours}
                onChange={(e) => setPrefQuietHours(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              size="sm"
              onClick={() => {
                toast.success("Notification preferences saved successfully!");
                setShowPreferences(false);
              }}
              className="bg-brand-500 hover:bg-brand-600 text-white text-xs min-target-size"
            >
              Save Preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
