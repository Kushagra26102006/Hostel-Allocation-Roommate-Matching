"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getBottomTabsForRole } from "@/config/navigation";

export function StudentBottomBar() {
  const pathname = usePathname();
  const tabs = getBottomTabsForRole("student");

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-surface/90 pb-safe backdrop-blur-xl md:hidden"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center py-1 text-[11px] font-medium transition-colors",
                isActive
                  ? "text-brand-600 dark:text-brand-400 font-bold"
                  : "text-muted hover:text-text",
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", isActive && "scale-110 transition-transform")} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-brand-500" />
                )}
              </div>
              <span className="mt-1 truncate max-w-[64px] text-[10px]">{tab.fallbackTitle}</span>
              {isActive && (
                <span className="absolute -bottom-1 h-0.5 w-6 rounded-full bg-brand-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
