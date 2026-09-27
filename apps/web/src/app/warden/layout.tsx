"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  Grid,
  ListOrdered,
  Users,
  CheckCircle2,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { DevRoleSwitcher } from "@/components/shell/dev-role-switcher";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default function WardenLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/warden/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/warden/review", label: "Draft Review", icon: ClipboardCheck },
    { href: "/warden/bed-map", label: "Visual Bed Map", icon: Grid },
    { href: "/warden/assignments", label: "Assignments Table", icon: ListOrdered },
    { href: "/warden/waitlist", label: "Waitlist Management", icon: Users },
    { href: "/warden/approvals", label: "Sign-Off & Approvals", icon: CheckCircle2 },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/warden/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-md">
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-lg font-bold tracking-tight">HostelHub</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Warden Operations Console
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((item) => {
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

        <div className="border-t border-border/40 bg-surface/40 px-4 py-2 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl flex items-center justify-between text-xs">
            <Breadcrumbs />
            <div className="flex items-center gap-2 text-muted-foreground hidden sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Aryabhata Hall (BH-1) • Active SLA: 18h remaining</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-16">{children}</main>
    </div>
  );
}
