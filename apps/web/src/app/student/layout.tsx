"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Sliders,
  Users,
  Sparkles,
  Bell,
  User,
  FolderCheck,
  ShieldCheck,
  RefreshCw,
  Scale,
  Lock,
  Settings,
  HelpCircle,
  Building,
  Menu,
  ChevronDown,
  Globe,
  Grid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { DevRoleSwitcher } from "@/components/shell/dev-role-switcher";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { useLocaleStore } from "@/stores/locale-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const { locale, setLocale } = useLocaleStore();

  const primaryNav = [
    { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/application", label: "Application", icon: FileText },
    { href: "/student/preferences", label: "Preferences", icon: Sliders },
    { href: "/student/group", label: "Roommate", icon: Users },
    { href: "/student/result", label: "Allocation", icon: Sparkles },
    { href: "/student/notifications", label: "Notifications", icon: Bell, badge: 2 },
    { href: "/student/profile", label: "Profile", icon: User },
  ];

  const secondaryNav = [
    {
      href: "/student/documents",
      label: "Documents",
      description: "Upload and verify identity, fee receipts & proofs",
      icon: FolderCheck,
    },
    {
      href: "/student/eligibility",
      label: "Eligibility",
      description: "Policy criteria check & rule-by-rule evaluation",
      icon: ShieldCheck,
    },
    {
      href: "/student/room-change",
      label: "Room Change",
      description: "Submit post-allocation transfer requests",
      icon: RefreshCw,
    },
    {
      href: "/student/appeals",
      label: "Appeals",
      description: "Lodge formal allocation grievances to warden council",
      icon: Scale,
    },
    {
      href: "/student/privacy",
      label: "Privacy Centre",
      description: "Data retention, consent controls & export archive",
      icon: Lock,
    },
    {
      href: "/student/settings",
      label: "Settings",
      description: "Language, accessibility, theme & alerts",
      icon: Settings,
    },
    {
      href: "/student/help",
      label: "Help & Support",
      description: "FAQs, warden desk directory & emergency helpline",
      icon: HelpCircle,
    },
  ];

  const isRouteActive = (href: string) => {
    if (href === "/student/dashboard") return pathname === "/student/dashboard";
    if (href === "/student/result") {
      return pathname.startsWith("/student/result") || pathname.startsWith("/student/allocation");
    }
    if (href === "/student/group") {
      return pathname.startsWith("/student/group") || pathname.startsWith("/student/roommate");
    }
    return pathname.startsWith(href);
  };

  const isSecondaryActive = secondaryNav.some((item) => isRouteActive(item.href));

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-brand-500/20 selection:text-brand-600">
      {/* Background Ambient Mesh Glows (Apple/Linear aesthetic) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-500/10 dark:bg-brand-500/15 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-purple-500/10 dark:bg-purple-500/15 blur-3xl" />
      </div>

      {/* Top University Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl transition-colors">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo & Portal Tag */}
          <div className="flex items-center gap-3">
            <Link
              href="/student/dashboard"
              className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl"
              aria-label="HostelHub Student Portal Home"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 via-brand-500 to-indigo-700 text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform duration-200">
                <Building className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-heading text-lg font-bold tracking-tight text-foreground">
                    HostelHub
                  </span>
                  <span className="hidden sm:inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 border border-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800">
                    SaaS
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Student Housing Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Primary Nav Bar */}
          <nav
            aria-label="Student Primary Navigation"
            className="hidden xl:flex items-center gap-1"
          >
            {primaryNav.map((item) => {
              const active = isRouteActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200",
                    active
                      ? "bg-brand-500/15 text-brand-700 dark:text-brand-300 shadow-2xs font-bold"
                      : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {Boolean(item.badge) && (
                    <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-extrabold text-white">
                      {item.badge}
                    </span>
                  )}
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-brand-500 rounded-full" />
                  )}
                </Link>
              );
            })}

            {/* Secondary Services Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 border border-transparent",
                  isSecondaryActive
                    ? "bg-brand-500/10 text-brand-700 dark:text-brand-300 border-brand-500/30 font-bold"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
                aria-label="Secondary university services navigation"
              >
                <Grid className="h-4 w-4" />
                <span>Services</span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-72 rounded-2xl p-2 bg-surface/95 backdrop-blur-xl border border-border/80 shadow-xl"
              >
                <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted px-2 py-1.5">
                  University Housing Services
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/60" />
                {secondaryNav.map((sec) => {
                  const SecIcon = sec.icon;
                  const active = isRouteActive(sec.href);
                  return (
                    <DropdownMenuItem key={sec.href} asChild>
                      <Link
                        href={sec.href}
                        className={cn(
                          "flex items-start gap-2.5 p-2 rounded-xl text-xs cursor-pointer transition-colors",
                          active
                            ? "bg-brand-500/15 text-brand-700 dark:text-brand-300 font-bold"
                            : "hover:bg-surface-muted text-foreground",
                        )}
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted shrink-0 text-brand-600 dark:text-brand-400 mt-0.5">
                          <SecIcon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold">{sec.label}</span>
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            {sec.description}
                          </span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Right Action Icons: Language, Dev Role, Theme, User */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-surface/60 text-muted-foreground hover:text-foreground hover:bg-surface transition-colors min-target-size"
                aria-label="Switch interface language"
              >
                <Globe className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-xl p-1.5 bg-surface/95 backdrop-blur-xl border border-border/80 shadow-lg text-xs"
              >
                <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted px-2 py-1">
                  Language / भाषा
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setLocale("en")}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer",
                    locale === "en"
                      ? "font-bold text-brand-600 bg-brand-50/60 dark:bg-brand-950/40"
                      : "",
                  )}
                >
                  <span>English (EN)</span>
                  {locale === "en" && <span className="text-[10px] font-bold">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLocale("hi")}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer font-devanagari",
                    locale === "hi"
                      ? "font-bold text-brand-600 bg-brand-50/60 dark:bg-brand-950/40"
                      : "",
                  )}
                >
                  <span>हिन्दी (Hindi)</span>
                  {locale === "hi" && <span className="text-[10px] font-bold">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLocale("pa")}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer font-gurmukhi",
                    locale === "pa"
                      ? "font-bold text-brand-600 bg-brand-50/60 dark:bg-brand-950/40"
                      : "",
                  )}
                >
                  <span>ਪੰਜਾਬੀ (Punjabi)</span>
                  {locale === "pa" && <span className="text-[10px] font-bold">✓</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Drawer Trigger */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="xl:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-surface/60 text-foreground hover:bg-surface transition-colors min-target-size"
              aria-label="Open secondary navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <DevRoleSwitcher />
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>

        {/* Breadcrumb Subbar */}
        <div className="border-t border-border/40 bg-surface/30 px-4 py-2 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl flex items-center justify-between text-xs">
            <Breadcrumbs />
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Round 1 Active</span>
              </span>
              <span>&bull;</span>
              <span>Academic Year 2026–27</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 pb-24 xl:pb-12">{children}</main>

      {/* Mobile Drawer for Secondary Navigation */}
      <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent side="right" className="w-[85vw] max-w-sm p-0 flex flex-col bg-surface">
          <SheetHeader className="p-5 border-b border-border/60 text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-xs">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold">HostelHub Services</SheetTitle>
                <SheetDescription className="text-xs">
                  Academic Housing & Student Affairs
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted px-2 mb-2">
                Primary Portal
              </div>
              <div className="space-y-1">
                {primaryNav.map((item) => {
                  const active = isRouteActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors min-target-size",
                        active
                          ? "bg-brand-500 text-white font-bold shadow-xs"
                          : "text-foreground hover:bg-surface-muted",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                      {Boolean(item.badge) && (
                        <span
                          className={cn(
                            "flex h-4 min-w-4 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                            active ? "bg-white text-brand-600" : "bg-brand-500 text-white",
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted px-2 mb-2">
                Secondary Services
              </div>
              <div className="space-y-1">
                {secondaryNav.map((sec) => {
                  const active = isRouteActive(sec.href);
                  const Icon = sec.icon;
                  return (
                    <Link
                      key={sec.href}
                      href={sec.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={cn(
                        "flex items-start gap-2.5 rounded-xl p-2.5 text-xs transition-colors min-target-size",
                        active
                          ? "bg-brand-500/15 text-brand-700 dark:text-brand-300 font-bold border border-brand-500/30"
                          : "text-foreground hover:bg-surface-muted",
                      )}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted shrink-0 text-brand-600 dark:text-brand-400 mt-0.5">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold">{sec.label}</div>
                        <div className="text-[10px] text-muted-foreground">{sec.description}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border/60 bg-surface-muted/40">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>HostelHub P03 Engine</span>
              <span>v2.4.0</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Bottom Navigation Bar (WCAG compliant >=44px touch targets) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/95 p-1.5 backdrop-blur-xl xl:hidden shadow-lg">
        <div className="grid grid-cols-6 gap-1 text-center">
          {primaryNav.slice(0, 5).map((item) => {
            const active = isRouteActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-[10px] font-semibold transition-all min-target-size",
                  active
                    ? "text-brand-600 dark:text-brand-400 font-bold bg-brand-50/50 dark:bg-brand-950/40"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-4.5 w-4.5", active ? "stroke-[2.5]" : "stroke-[1.75]")} />
                <span className="truncate max-w-[54px]">{item.label}</span>
              </Link>
            );
          })}

          {/* 6th Tab: "More" Services Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-[10px] font-semibold transition-all min-target-size",
              isSecondaryActive
                ? "text-brand-600 dark:text-brand-400 font-bold bg-brand-50/50 dark:bg-brand-950/40"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Open all services menu"
          >
            <Grid className="h-4.5 w-4.5 stroke-[1.75]" />
            <span className="truncate max-w-[54px]">Services</span>
          </button>
        </div>
      </div>
    </div>
  );
}
