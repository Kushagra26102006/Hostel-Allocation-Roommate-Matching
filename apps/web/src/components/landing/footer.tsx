"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Globe, ArrowUp } from "lucide-react";
import { useMotionStore } from "@/stores/motion-store";
import { getMessages } from "@/lib/i18n";

export function LandingFooter() {
  const { reduceMotion, setReduceMotion } = useMotionStore();
  const messages = getMessages();
  const footer = messages.footer;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="border-t border-border/60 bg-surface/70 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Col (lg: 2 cols) */}
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-text"
              aria-label="HostelHub home"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground shadow-sm">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="font-heading text-xl font-bold tracking-tight text-text">
                Hostel<span className="text-gradient">Hub</span>
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              {footer.tagline}
            </p>

            {/* Live Operational Status badge */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span>{footer.status}</span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-text">
              {footer.sections.product.title}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {footer.sections.product.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-muted transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Students Links */}
          <div>
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-text">
              {footer.sections.students.title}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {footer.sections.students.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Administration & Governance Links */}
          <div>
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-text">
              {footer.sections.administration.title}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {footer.sections.administration.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright, Language, Back to top */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 sm:flex-row">
          <p className="text-xs text-muted">
            {footer.copyright}
          </p>

          <div className="flex items-center gap-5 text-xs text-muted">
            {/* Motion toggle option */}
            <button
              type="button"
              onClick={() => setReduceMotion(reduceMotion === true ? false : true)}
              className="hover:text-text transition-colors"
            >
              Motion:{" "}
              <span className="font-semibold text-text">
                {reduceMotion === true ? "Reduced" : "Dynamic"}
              </span>
            </button>

            {/* Language Switcher indicator */}
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
              <span>English (US)</span>
            </div>

            {/* Back to top */}
            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Back to top"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 hover:bg-surface hover:text-text transition-colors"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
