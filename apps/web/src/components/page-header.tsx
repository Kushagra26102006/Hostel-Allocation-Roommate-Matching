"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader — sticky top-of-page header with breadcrumb, title, and action slot.
 */
export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm px-6 py-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          {/* Breadcrumb */}
          {breadcrumb && breadcrumb.length > 0 && (
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-1 text-xs text-muted">
                {breadcrumb.map((item, i) => (
                  <React.Fragment key={item.label}>
                    {i > 0 && (
                      <li aria-hidden="true">
                        <ChevronRight className="h-3 w-3" />
                      </li>
                    )}
                    <li>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="hover:text-text transition-colors duration-100"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <span aria-current="page" className="text-text font-medium">
                          {item.label}
                        </span>
                      )}
                    </li>
                  </React.Fragment>
                ))}
              </ol>
            </nav>
          )}

          {/* Title + description */}
          <h1 className="font-heading text-xl font-bold text-text truncate">{title}</h1>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>

        {/* Actions slot */}
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
