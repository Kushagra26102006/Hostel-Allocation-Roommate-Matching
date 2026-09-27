"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Sliders,
  HelpCircle,
  Users,
  Sparkles,
  RefreshCw,
  Scale,
  Bell,
  User,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { DevRoleSwitcher } from "@/components/shell/dev-role-switcher";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/application", label: "Application", icon: FileText },
    { href: "/student/preferences", label: "Hostel Ranking", icon: Sliders },
    { href: "/student/questionnaire", label: "Lifestyle Match", icon: HelpCircle },
    { href: "/student/group", label: "Roommate Group", icon: Users },
    { href: "/student/result", label: "Allotment Result", icon: Sparkles },
    { href: "/student/room-change", label: "Room Change", icon: RefreshCw },
    { href: "/student/appeals", label: "Appeals", icon: Scale },
    { href: "/student/notifications", label: "Notifications", icon: Bell },
    { href: "/student/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-brand-500/20 selection:text-brand-600">
      {/* Top University Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/student/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent text-white shadow-md">
                <Building className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-lg font-bold tracking-tight">HostelHub</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Student Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Strip */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.slice(0, 6).map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                    isActive
                      ? "bg-brand-500/15 text-brand-700 dark:text-brand-300"
                      : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <DevRoleSwitcher />
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>

        {/* Breadcrumb subbar */}
        <div className="border-t border-border/40 bg-surface/40 px-4 py-2 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Breadcrumbs />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-20 lg:pb-12">{children}</main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/95 p-2 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5 gap-1 text-center">
          {navLinks.slice(0, 5).map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold transition-all",
                  isActive
                    ? "text-brand-600 dark:text-brand-400 font-bold"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate max-w-[60px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
