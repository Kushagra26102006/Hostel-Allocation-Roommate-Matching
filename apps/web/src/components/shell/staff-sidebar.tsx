"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRoleStore, ROLES_METADATA, type Role } from "@/stores/role-store";
import { getNavigationForRole } from "@/config/navigation";
import { useMessages } from "@/lib/i18n";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "relative flex flex-col border-r border-border/70 bg-surface/95 backdrop-blur-xl transition-[width] duration-250 ease-in-out z-30 shrink-0 select-none",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-border/60 px-3.5">
          <Link
            href={ROLES_METADATA[role].portalPrefix}
            className="flex items-center gap-2.5 overflow-hidden group"
            aria-label="Staff Portal Home"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white shadow-xs group-hover:bg-brand-600 transition-colors">
              <Building2 className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-heading text-sm font-bold tracking-tight text-foreground">
                  Hostel<span className="text-brand-500">Hub</span>
                </span>
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                  {ROLES_METADATA[role]?.badge ?? "Governance"}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation List */}
        <nav aria-label="Staff Navigation" className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted font-mono">
              {messages.shell.sidebar.navigation}
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            const linkNode = (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150",
                  isActive
                    ? "bg-brand-50/80 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r before:bg-brand-500"
                    : "text-muted hover:bg-surface-muted hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                    isActive ? "text-brand-500" : "text-muted group-hover:text-foreground",
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
                            ? "bg-brand-500 text-white"
                            : "bg-surface-muted text-muted border border-border/50",
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{linkNode}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>
                    <p className="text-xs font-medium">{item.fallbackTitle}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkNode;
          })}
        </nav>

        {/* Sidebar Footer: Toggle & Sign Out */}
        <div className="border-t border-border/60 p-2 space-y-1">
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? messages.shell.sidebar.expand : messages.shell.sidebar.collapse}
            className="flex w-full items-center justify-center rounded-lg py-2 text-xs text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
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

          <SignOutButton
            variant="full"
            label={messages.shell.sidebar.signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          />
        </div>
      </aside>
    </TooltipProvider>
  );
}
