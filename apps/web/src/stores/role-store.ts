"use client";

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";

export type Role =
  | "student"
  | "warden"
  | "chief_warden"
  | "hostel_admin"
  | "dean"
  | "sys_admin";

export interface RoleInfo {
  id: Role;
  name: string;
  badge: string;
  description: string;
  portalPrefix: string;
}

export const ROLES_METADATA: Record<Role, RoleInfo> = {
  student: {
    id: "student",
    name: "Student",
    badge: "Student Portal",
    description: "Submit room preferences, view matches, and report issues",
    portalPrefix: "/dashboard",
  },
  warden: {
    id: "warden",
    name: "Hostel Warden",
    badge: "Warden Console",
    description: "Review provisional allocations, verify medical requests, and sign off rosters",
    portalPrefix: "/staff/warden/overview",
  },
  chief_warden: {
    id: "chief_warden",
    name: "Chief Warden",
    badge: "Chief Executive",
    description: "Manage university-wide algorithm runs, inventory quotas, and student appeals",
    portalPrefix: "/staff/chief-warden/overview",
  },
  hostel_admin: {
    id: "hostel_admin",
    name: "Hostel Administrator",
    badge: "Operations & Facilities",
    description: "Manage room inventory, physical keys, maintenance logs, and check-ins",
    portalPrefix: "/staff/admin/inventory",
  },
  dean: {
    id: "dean",
    name: "Dean of Student Welfare",
    badge: "Dean Welfare",
    description: "Oversee campus housing policies, demographic balance, and audit compliance",
    portalPrefix: "/staff/dean/overview",
  },
  sys_admin: {
    id: "sys_admin",
    name: "System Administrator",
    badge: "Root Governance",
    description: "Configure Gale-Shapley parameters, audit trail ledger, and RBAC",
    portalPrefix: "/staff/system/health",
  },
};

interface RoleStore {
  role: Role;
  setRole: (role: Role) => void;
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useRoleStore = create<RoleStore>()(
  persist(
    (set) => ({
      role: "student",
      setRole: (role) => set({ role }),
    }),
    {
      name: "hostelhub-active-role",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
    },
  ),
);
