"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, HelpCircle } from "lucide-react";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { CommandPalette } from "@/components/shell/command-palette";
import { NotificationBell } from "@/components/shell/notifications";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { UserNav } from "@/components/auth/user-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { DevRoleSwitcher } from "@/components/shell/dev-role-switcher";

interface ShellHeaderProps {
  showLogo?: boolean;
}

export function ShellHeader({ showLogo = false }: ShellHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border/70 bg-surface/90 px-4 backdrop-blur-md transition-colors sm:px-6">
      {/* Left: Brand logo & Breadcrumbs */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {showLogo && (
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 text-foreground shrink-0 group"
            aria-label="HostelHub Dashboard"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white shadow-2xs group-hover:bg-brand-600 transition-colors">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline font-heading text-sm font-bold tracking-tight text-foreground">
              Hostel<span className="text-brand-500">Hub</span>
            </span>
          </Link>
        )}
        <Breadcrumbs />
      </div>

      {/* Center: Contextual Search Command Palette */}
      <div className="hidden md:flex items-center justify-center flex-1 max-w-md mx-4">
        <CommandPalette />
      </div>

      {/* Right Tools: DevRoleSwitcher, Notifications, Help, Theme, UserNav */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <div className="md:hidden">
          <CommandPalette />
        </div>

        <DevRoleSwitcher />

        <NotificationBell />

        <Link
          href="/help"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted hover:text-foreground hover:bg-surface-muted transition-colors min-target-size"
          title="Help & Policy Documentation"
          aria-label="Help Documentation"
        >
          <HelpCircle className="h-4 w-4" />
        </Link>

        <LanguageSwitcher />

        <ThemeToggle />

        <UserNav />
      </div>
    </header>
  );
}
