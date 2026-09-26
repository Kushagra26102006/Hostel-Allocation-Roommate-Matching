"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BedDouble,
  Users,
  QrCode,
  CreditCard,
  AlertCircle,
  Radio,
  FileText,
  HelpCircle,
} from "lucide-react";
import { HostelHubLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

interface StudentSidebarProps {
  className?: string;
  activeItem?: string;
}

export const STUDENT_NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "room",
    label: "My Room",
    href: "/room",
    icon: BedDouble,
  },
  {
    id: "roommate",
    label: "Roommate",
    href: "/roommate",
    icon: Users,
    badge: "94% Match",
  },
  {
    id: "gatepass",
    label: "Gate Pass",
    href: "/dashboard#gatepass",
    icon: QrCode,
  },
  {
    id: "payments",
    label: "Payments",
    href: "/payments",
    icon: CreditCard,
  },
  {
    id: "maintenance",
    label: "Maintenance",
    href: "/complaints",
    icon: AlertCircle,
  },
  {
    id: "announcements",
    label: "Announcements",
    href: "/dashboard#announcements",
    icon: Radio,
  },
  {
    id: "documents",
    label: "Documents",
    href: "/room",
    icon: FileText,
  },
  {
    id: "support",
    label: "Help & Support",
    href: "/dashboard#help",
    icon: HelpCircle,
  },
];

export function StudentSidebar({ className, activeItem = "roommate" }: StudentSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "w-[240px] shrink-0 border-r border-slate-800/80 bg-[#030816]/95 backdrop-blur-2xl flex flex-col justify-between py-6 px-4 select-none min-h-[calc(100vh-4rem)]",
        className,
      )}
    >
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="px-2">
          <HostelHubLogo size="sm" href="/dashboard" />
          <div className="mt-2.5 flex items-center gap-1.5 px-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 font-mono">
              SMART CAMPUS HOUSING
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1.5" aria-label="Student Main Navigation">
          <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            Navigation
          </div>

          {STUDENT_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isCurrent =
              item.id === activeItem ||
              pathname === item.href ||
              (item.href === "/roommate" && pathname.startsWith("/roommate"));

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer",
                  isCurrent
                    ? "bg-gradient-to-r from-cyan-500/20 via-sky-500/15 to-indigo-500/10 text-cyan-300 border border-cyan-500/35 shadow-[0_0_20px_rgba(6,182,212,0.18)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                    isCurrent ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200",
                  )}
                />
                <span className="truncate">{item.label}</span>

                {item.badge && (
                  <span
                    className={cn(
                      "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0",
                      isCurrent
                        ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/30"
                        : "bg-slate-800 text-slate-400",
                    )}
                  >
                    {item.badge}
                  </span>
                )}

                {isCurrent && (
                  <span className="absolute -left-1 top-2.5 bottom-2.5 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer: Resident status pill */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="p-3 rounded-2xl bg-[#071026]/80 border border-slate-800/80 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-cyan-500 text-white font-bold text-xs shadow-md">
            AS
          </div>
          <div className="truncate">
            <p className="text-xs font-bold text-white truncate">Aarav Sharma</p>
            <p className="text-[10px] text-cyan-400 font-mono truncate">Room 304 • Tower A</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between px-1 text-[10px] text-slate-500 font-mono">
          <span>Campus IoT Active</span>
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        </div>
      </div>
    </aside>
  );
}
