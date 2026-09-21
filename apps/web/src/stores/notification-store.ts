"use client";

import { create } from "zustand";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "info" | "success" | "warning" | "alert";
  deepLink?: string | undefined;
  category?: string | undefined;
  priority?: string | undefined;
}

interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  isWiggling: boolean;
  isBadgePopping: boolean;
  isLoading: boolean;
  triggerWiggle: () => void;
  triggerBadgePop: () => void;
  triggerDemoNotification: () => void;
  fetchNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  addLiveNotification: (notif: Partial<AppNotification>) => void;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-1",
    title: "Draft Allocation Published",
    message: "Provisional room match for Semester 1 (Block B) is ready for student review.",
    timestamp: "10m ago",
    read: false,
    type: "info",
    deepLink: "/room",
    category: "allocation",
  },
  {
    id: "notif-2",
    title: "Questionnaire Verified",
    message: "Your roommate compatibility vectors were successfully calculated (98.4% match).",
    timestamp: "1h ago",
    read: false,
    type: "success",
    deepLink: "/application",
    category: "application",
  },
  {
    id: "notif-3",
    title: "Maintenance Notice",
    message: "Water heater servicing in Aryabhata Hall on Saturday 10:00 AM - 1:00 PM.",
    timestamp: "4h ago",
    read: true,
    type: "warning",
    category: "system",
  },
];

export const useNotificationStore = create<NotificationStore>()((set, get) => ({
  notifications: INITIAL_NOTIFICATIONS,
  unreadCount: INITIAL_NOTIFICATIONS.filter((n) => !n.read).length,
  isWiggling: false,
  isBadgePopping: false,
  isLoading: false,

  triggerWiggle: () => {
    set({ isWiggling: true });
    setTimeout(() => {
      set({ isWiggling: false });
    }, 1000);
  },

  triggerBadgePop: () => {
    set({ isBadgePopping: true });
    setTimeout(() => {
      set({ isBadgePopping: false });
    }, 800);
  },

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/v1/notifications?limit=20");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.notifications) && data.notifications.length > 0) {
          const mapped: AppNotification[] = data.notifications.map(
            (n: Record<string, unknown>) => ({
              id: String(n._id || n.id),
              title: String(n.title ?? "Notification"),
              message: String(n.message ?? ""),
              timestamp: n.created_at
                ? new Date(String(n.created_at)).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Just now",
              read: Boolean(n.read),
              type: (n.priority === "urgent"
                ? "alert"
                : n.category === "allocation"
                  ? "success"
                  : "info") as AppNotification["type"],
              deepLink: n.deep_link ? String(n.deep_link) : undefined,
              category: n.category ? String(n.category) : undefined,
              priority: n.priority ? String(n.priority) : undefined,
            }),
          );
          set({
            notifications: mapped,
            unreadCount: data.unreadCount ?? mapped.filter((n) => !n.read).length,
          });
        }
      }
    } catch {
      // Keep initial/fallback notifications on fetch error
    } finally {
      set({ isLoading: false });
    }
  },

  addLiveNotification: (notif) => {
    const newItem: AppNotification = {
      id: notif.id ?? `notif-${Date.now()}`,
      title: notif.title ?? "New Notification",
      message: notif.message ?? "",
      timestamp: "Just now",
      read: false,
      type: notif.type ?? "info",
      deepLink: notif.deepLink,
      category: notif.category,
      priority: notif.priority,
    };

    set((state) => ({
      notifications: [newItem, ...state.notifications],
      unreadCount: state.unreadCount + 1,
      isWiggling: true,
      isBadgePopping: true,
    }));

    setTimeout(() => {
      set({ isWiggling: false, isBadgePopping: false });
    }, 1000);
  },

  triggerDemoNotification: () => {
    const demoItems = [
      {
        title: "Warden Approved Application",
        message: "Your special medical accommodation request was approved by Chief Warden.",
        type: "success" as const,
        deepLink: "/application",
      },
      {
        title: "Gate Pass Issued",
        message: "Digital gate QR pass for Block B is active for semester entry.",
        type: "info" as const,
        deepLink: "/room",
      },
      {
        title: "Roommate Match Confirmed",
        message: "Mutual roommate pairing confirmed for Aryabhata Hall.",
        type: "success" as const,
        deepLink: "/room",
      },
      {
        title: "Allocation Published",
        message: "Official room assignment letter is ready for signed download.",
        type: "alert" as const,
        deepLink: "/room",
      },
    ];

    const pick = demoItems[Math.floor(Math.random() * demoItems.length)]!;
    get().addLiveNotification(pick);
  },

  markAllAsRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));

    try {
      await fetch("/api/v1/notifications/mark-all-read", { method: "POST" });
    } catch {
      // Non-blocking
    }
  },

  markAsRead: async (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));

    try {
      await fetch(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      // Non-blocking
    }
  },
}));
