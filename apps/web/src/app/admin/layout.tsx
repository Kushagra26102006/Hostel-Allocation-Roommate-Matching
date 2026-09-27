"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building,
  UploadCloud,
  Calendar,
  Sliders,
  PlayCircle,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { DevRoleSwitcher } from "@/components/shell/dev-role-switcher";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/inventory", label: "Inventory Tree", icon: Building },
    { href: "/admin/import", label: "CSV Import Wizard", icon: UploadCloud },
    { href: "/admin/cycles", label: "Cycles", icon: Calendar },
    { href: "/admin/policies", label: "Policy Rules", icon: Sliders },
    { href: "/admin/allocation", label: "Run Console", icon: PlayCircle },
    { href: "/admin/documents", label: "Document Queue", icon: FileCheck },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-md shadow-brand-500/20">
                <Building className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-lg font-bold tracking-tight text-foreground">
                  HostelHub
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Hostel Operations & Admin
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
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                    isActive
                      ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold"
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
          <div className="mx-auto max-w-7xl">
            <Breadcrumbs />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-16">{children}</main>
    </div>
  );
}
