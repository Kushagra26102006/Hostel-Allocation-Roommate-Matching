"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { getNavItemByPath } from "@/config/navigation";
import { useMessages } from "@/lib/i18n";
import { useRoleStore, ROLES_METADATA } from "@/stores/role-store";

export function Breadcrumbs() {
  const pathname = usePathname();
  const role = useRoleStore((state) => state.role);
  const messages = useMessages();
  const navItem = getNavItemByPath(pathname);

  const homeHref = role === "student" ? "/dashboard" : ROLES_METADATA[role].portalPrefix;

  // Derive segment labels
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumbs" className="flex items-center text-xs text-muted">
      <ol className="flex items-center gap-1.5 flex-wrap">
        <li>
          <Link
            href={homeHref}
            className="flex items-center gap-1 transition-colors hover:text-text"
            aria-label={messages.shell.breadcrumbs.home}
          >
            <Home className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
            <span className="hidden sm:inline">{ROLES_METADATA[role].name}</span>
          </Link>
        </li>

        {segments.map((segment, idx) => {
          const isLast = idx === segments.length - 1;
          const segmentPath = `/${segments.slice(0, idx + 1).join("/")}`;
          const currentItem = getNavItemByPath(segmentPath);
          const label =
            currentItem?.fallbackTitle ??
            segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

          return (
            <React.Fragment key={segmentPath}>
              <li aria-hidden="true" className="text-border">
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
              <li>
                {isLast ? (
                  <span
                    aria-current="page"
                    className="font-semibold text-text truncate max-w-[160px] sm:max-w-none"
                  >
                    {navItem?.fallbackTitle ?? label}
                  </span>
                ) : (
                  <Link
                    href={segmentPath}
                    className="transition-colors hover:text-text truncate max-w-[120px] sm:max-w-none"
                  >
                    {label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
