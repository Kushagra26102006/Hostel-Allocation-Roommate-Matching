"use client";

import * as React from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { DevRoleSwitcher } from "@/components/shell/dev-role-switcher";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default function DeanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/dean/analytics" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-700 to-brand-900 text-white shadow-md">
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-lg font-bold tracking-tight">HostelHub</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Dean of Student Welfare (Read-Only)
                </span>
              </div>
            </Link>
          </div>

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
