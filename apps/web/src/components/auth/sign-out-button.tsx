"use client";

import { signOut } from "next-auth/react";
import { LogOut, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface SignOutButtonProps {
  className?: string;
  variant?: "icon" | "full";
  label?: string;
}

export function SignOutButton({
  className,
  variant = "icon",
  label = "Sign Out",
}: SignOutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);

    try {
      await signOut({ callbackUrl: "/login", redirect: true });
    } catch {
      window.location.href = "/login";
    }
  };

  if (!mounted) {
    if (variant === "full") {
      return (
        <div
          className={
            className ??
            "flex w-full items-center gap-2 rounded-ctrl px-3 py-2 text-xs text-danger/80"
          }
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>{label}</span>
        </div>
      );
    }
    return (
      <div
        className={
          className ??
          "flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 text-muted-foreground"
        }
      >
        <LogOut className="h-4 w-4" />
      </div>
    );
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        suppressHydrationWarning
        onClick={handleSignOut}
        disabled={loading}
        title={label}
        className={
          className ??
          "flex w-full items-center gap-2 rounded-ctrl px-3 py-2 text-xs text-danger/80 hover:bg-danger/10 hover:text-danger transition-colors disabled:opacity-50"
        }
      >
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4 shrink-0" />
        )}
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      suppressHydrationWarning
      onClick={handleSignOut}
      disabled={loading}
      title={label}
      aria-label={label}
      className={
        className ??
        "flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors disabled:opacity-50"
      }
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
    </button>
  );
}
