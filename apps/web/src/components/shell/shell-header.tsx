"use client";

import * as React from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
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
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border/60 bg-surface/80 px-4 backdrop-blur-md transition-colors sm:px-6">
      {/* Left: Optional Brand logo (for student top-bar) + Breadcrumbs */}
      <div className="flex items-center gap-4">
        {showLogo && (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-text"
            aria-label="HostelHub Dashboard"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand text-brand-foreground shadow-sm">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline font-heading text-base font-bold tracking-tight text-text">
              Hostel<span className="text-gradient">Hub</span>
            </span>
          </Link>
        )}
        <Breadcrumbs />
      </div>

      {/* Right Tools: Command palette, UserNav, Notifications, Theme, Language */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <CommandPalette />
        <UserNav />
        <NotificationBell />
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
