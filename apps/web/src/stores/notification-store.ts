"use client";

import { create } from "zustand";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "info" | "success" | "warning" | "alert";
}

interface NotificationStore {
  notifications: AppNotification[];
  isWiggling: boolean;
  triggerWiggle: () => void;
  triggerDemoNotification: () => void;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-1",
    title: "Draft Allocation Published",
    message: "Provisional room match for Semester 1 (Block B Room 304) is ready for student review.",
    timestamp: "10m ago",
    read: false,
    type: "info",
  },
  {
    id: "notif-2",
    title: "Questionnaire Verified",
    message: "Your roommate compatibility vectors were successfully calculated (98.4% match).",
    timestamp: "1h ago",
    read: false,
    type: "success",
  },
  {
    id: "notif-3",
    title: "Maintenance Notice",
    message: "Water heater scheduled servicing in Aryabhata Hall on Saturday 10:00 AM - 1:00 PM.",
    timestamp: "4h ago",
    read: true,
    type: "warning",
  },
];

export const useNotificationStore = create<NotificationStore>()((set) => ({
  notifications: INITIAL_NOTIFICATIONS,
  isWiggling: false,

  triggerWiggle: () => {
    set({ isWiggling: true });
    setTimeout(() => {
      set({ isWiggling: false });
    }, 1000);
  },

  triggerDemoNotification: () => {
    const demoItems = [
      {
        title: "Warden Approved Application",
        message: "Your special medical accommodation request was approved by Chief Warden.",
        type: "success" as const,
      },
      {
        title: "Gate Pass Issued",
        message: "Digital gate QR pass for Block B Room 304 is active for semester entry.",
        type: "info" as const,
      },
      {
        title: "Roommate Match Confirmed",
        message: "Advait K. confirmed mutual roommate pairing for Aryabhata Hall.",
        type: "success" as const,
      },
      {
        title: "Allotment Fee Due",
        message: "Hostel amenities deposit pending verification by accounts section.",
        type: "warning" as const,
      },
    ];

    const pick = demoItems[Math.floor(Math.random() * demoItems.length)]!;
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: pick.title,
      message: pick.message,
      timestamp: "Just now",
      read: false,
      type: pick.type,
    };

    set((state) => ({
      notifications: [newNotif, ...state.notifications],
      isWiggling: true,
    }));

    setTimeout(() => {
      set({ isWiggling: false });
    }, 1000);
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  markAsRead: (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    }));
  },
}));
