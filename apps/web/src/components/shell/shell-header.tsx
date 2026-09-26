"use client";

import * as React from "react";
import { HostelHubLogo } from "@/components/brand/logo";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { CommandPalette } from "@/components/shell/command-palette";
import { NotificationBell } from "@/components/shell/notifications";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { UserNav } from "@/components/auth/user-nav";
import { ThemeToggle } from "@/components/theme-toggle";

interface ShellHeaderProps {
  showLogo?: boolean;
}

export function ShellHeader({ showLogo = false }: ShellHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border/70 bg-surface/80 px-4 backdrop-blur-xl transition-all sm:px-6 shadow-xs">
      {/* Left: Brand logo + Divider + Breadcrumbs */}
      <div className="flex items-center gap-3 sm:gap-4">
        {showLogo && (
          <>
            <HostelHubLogo size="sm" />
            <span className="hidden sm:inline-block h-4 w-px bg-border/80" aria-hidden="true" />
          </>
        )}
        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right Tools: Command palette, Notifications, Language, Theme, UserNav */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <CommandPalette />
        <NotificationBell />
        <LanguageSwitcher />
        <ThemeToggle />
        <div className="h-5 w-px bg-border/60 mx-1 hidden sm:block" aria-hidden="true" />
        <UserNav />
      </div>
    </header>
  );
}
