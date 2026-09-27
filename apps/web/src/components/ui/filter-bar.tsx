"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterOption {
  id: string;
  label: string;
}

export interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filters?: {
    id: string;
    label: string;
    options: FilterOption[];
    selected: string;
    onChange: (value: string) => void;
  }[];
  activeFilterCount?: number;
  onClearAll?: () => void;
  className?: string;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search records by name, roll no, room...",
  filters,
  activeFilterCount = 0,
  onClearAll,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 pr-8 bg-surface/80 backdrop-blur-md"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Select Filters */}
      {filters && filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <select
              key={f.id}
              value={f.selected}
              onChange={(e) => f.onChange(e.target.value)}
              className="h-9 rounded-xl border border-input bg-surface/80 px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 backdrop-blur-md"
            >
              <option value="all">{f.label}: All</option>
              {f.options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          ))}

          {activeFilterCount > 0 && onClearAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
