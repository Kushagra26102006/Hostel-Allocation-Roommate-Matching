"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Globe,
  Menu,
  X,
  ArrowRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/i18n";

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [langMenuOpen, setLangMenuOpen] = React.useState(false);
  const messages = getMessages();
  const nav = messages.navbar;

  const navLinks = [
    { href: "#how-it-works", label: nav.links.howItWorks },
    { href: "#hostels", label: nav.links.hostels },
    { href: "#live-occupancy", label: nav.links.occupancy },
    { href: "#faq", label: nav.links.faq },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-surface/75 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-lg text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="HostelHub home"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground shadow-sm transition-transform duration-200 group-hover:scale-105">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-lg font-bold tracking-tight text-text">
              Hostel<span className="text-gradient">Hub</span>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Main Navigation"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-ctrl px-3.5 py-1.5 text-sm font-medium text-muted transition-colors duration-180 hover:bg-surface/80 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Controls: Language, Theme Toggle, Sign in */}
        <div className="flex items-center gap-2.5">
          {/* Language Switcher Placeholder */}
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setLangMenuOpen((prev) => !prev)}
              aria-label={nav.language.select}
              aria-expanded={langMenuOpen}
              className="flex items-center gap-1.5 rounded-ctrl border border-border/70 bg-surface/60 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Globe className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
              <span>{nav.language.current}</span>
            </button>

            {langMenuOpen && (
              <div
                role="dialog"
                aria-label={nav.language.select}
                className="absolute right-0 top-full mt-2 w-44 rounded-card border border-border bg-surface p-1.5 shadow-lg animate-in fade-in zoom-in-95 z-50"
              >
                <button
                  type="button"
                  onClick={() => setLangMenuOpen(false)}
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-text hover:bg-brand-50 dark:hover:bg-brand-900/30"
                >
                  <span>{nav.language.en}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                </button>
                <div className="my-1 border-t border-border/50" />
                <div className="px-2.5 py-1 text-[11px] text-muted">
                  {nav.language.hi}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Sign In Button */}
          <Button
            asChild
            size="sm"
            className="hidden sm:inline-flex bg-gradient-brand text-brand-foreground shadow-sm hover:opacity-95"
          >
            <Link href="/login">
              <span>{nav.signIn}</span>
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-ctrl border border-border text-text md:hidden hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-surface/95 px-4 pb-6 pt-3 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-base font-medium text-text hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/20"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-brand-500" />
                Language
              </span>
              <span className="font-semibold text-text">English (EN)</span>
            </div>
            <Button
              asChild
              className="w-full justify-center bg-gradient-brand text-brand-foreground"
            >
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                {nav.signIn}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
