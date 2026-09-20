"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRoleStore, ROLES_METADATA, type Role } from "@/stores/role-store";
import { getNavigationForRole } from "@/config/navigation";
import { useMessages } from "@/lib/i18n";

export function StaffSidebar() {
  const [collapsed, setCollapsed] = React.useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { role: devRole } = useRoleStore();
  const rawRole = session?.user?.activeRole ?? session?.user?.roles?.[0] ?? devRole;
  const role = (rawRole as Role) in ROLES_METADATA ? (rawRole as Role) : "warden";
  const messages = useMessages();
  const navItems = getNavigationForRole(role);

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border/70 bg-surface/85 backdrop-blur-xl transition-all duration-300 z-30 shrink-0 select-none",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Sidebar Header */}
      <div className="flex h-16 items-center justify-between border-b border-border/70 px-4">
        <Link
          href={ROLES_METADATA[role].portalPrefix}
          className="flex items-center gap-2.5 overflow-hidden"
          aria-label="Staff Portal Home"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground shadow-sm">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-heading text-base font-bold text-text">
                Hostel<span className="text-gradient">Hub</span>
              </span>
              <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                {ROLES_METADATA[role]?.badge ?? "Staff"}
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation List */}
      <nav
        aria-label="Staff Navigation"
        className="flex-1 overflow-y-auto px-2 py-4 space-y-1"
      >
        {!collapsed && (
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted font-mono">
            {messages.shell.sidebar.navigation}
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.id}
              href={item.href}
              title={collapsed ? item.fallbackTitle : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-ctrl px-3 py-2.5 text-xs font-medium transition-all duration-180",
                isActive
                  ? "bg-brand-500 text-brand-foreground shadow-sm font-semibold"
                  : "text-muted hover:bg-surface hover:text-text",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                  isActive ? "text-brand-foreground" : "text-muted group-hover:text-text",
                )}
              />
              {!collapsed && (
                <div className="flex flex-1 items-center justify-between truncate">
                  <span className="truncate">{item.fallbackTitle}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        "ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                        isActive
                          ? "bg-brand-700 text-white"
                          : "bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300",
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer: Toggle & Sign Out */}
      <div className="border-t border-border/70 p-2 space-y-1">
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={
            collapsed
              ? messages.shell.sidebar.expand
              : messages.shell.sidebar.collapse
          }
          className="flex w-full items-center justify-center rounded-ctrl py-2 text-xs text-muted hover:bg-surface hover:text-text transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <div className="flex items-center gap-2 px-2 w-full">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">{messages.shell.sidebar.collapse}</span>
            </div>
          )}
        </button>

        <Link
          href="/login"
          className="flex items-center gap-2 rounded-ctrl px-3 py-2 text-xs text-danger/80 hover:bg-danger/10 hover:text-danger transition-colors"
          title={collapsed ? messages.shell.sidebar.signOut : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{messages.shell.sidebar.signOut}</span>}
        </Link>
      </div>
    </aside>
  );
}
