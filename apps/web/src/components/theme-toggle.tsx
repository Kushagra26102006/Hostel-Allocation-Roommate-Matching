"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

/**
 * ThemeToggle — animated sun ↔ moon toggle button.
 * Uses CSS transition on opacity + transform (rotate/scale) for the morph effect.
 * Keyboard accessible with correct aria-label.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  const toggle = () => setTheme(isDark ? "light" : "dark");

  if (!mounted) {
    return <div className={cn("h-9 w-9 rounded-ctrl", className)} />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-pressed={isDark}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-ctrl",
        "text-muted hover:text-text hover:bg-surface/60",
        "transition-colors duration-180 ease-standard",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      {/* Sun icon — visible in dark mode (clicking switches to light) */}
      <Sun
        aria-hidden="true"
        className={cn(
          "absolute h-4 w-4 transition-all duration-280 ease-emphasized",
          isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-75",
        )}
      />
      {/* Moon icon — visible in light mode (clicking switches to dark) */}
      <Moon
        aria-hidden="true"
        className={cn(
          "absolute h-4 w-4 transition-all duration-280 ease-emphasized",
          isDark ? "opacity-0 -rotate-90 scale-75" : "opacity-100 rotate-0 scale-100",
        )}
      />
    </button>
  );
}
