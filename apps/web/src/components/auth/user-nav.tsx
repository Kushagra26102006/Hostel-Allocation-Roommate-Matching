"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  LogOut,
  User,
  ChevronDown,
  Building,
  Check,
  HelpCircle,
  Settings as SettingsIcon,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { UserRole } from "@hostelhub/shared";
import { ROLES_METADATA } from "@/stores/role-store";

export function UserNav() {
  const { data: session, status, update } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return <div className="h-9 w-28 animate-pulse rounded-lg bg-surface-muted" />;
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 rounded-lg bg-brand-500 text-white px-3.5 py-1.5 text-xs font-semibold hover:bg-brand-600 transition-all shadow-xs"
      >
        <User className="w-3.5 h-3.5" />
        <span>Sign in</span>
      </Link>
    );
  }

  const user = session.user;
  const activeRole: UserRole = user.activeRole ?? user.roles?.[0] ?? "student";
  const roleMeta = ROLES_METADATA[activeRole as keyof typeof ROLES_METADATA];

  const handleRoleChange = async (newRole: UserRole) => {
    await update({ activeRole: newRole });
    setOpen(false);
  };

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const profileHref = activeRole === "student" ? "/student/profile" : "/profile";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border/70 bg-surface px-2 py-1.5 hover:bg-surface-muted hover:border-border transition-all shadow-2xs"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className="w-6 h-6 rounded-md bg-brand-500 flex items-center justify-center text-[11px] font-bold text-white shadow-xs">
          {initials}
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-medium text-foreground leading-tight">{user.name}</span>
          <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold leading-none mt-0.5">
            {roleMeta?.name ?? activeRole}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-muted ml-0.5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border/80 bg-surface p-1.5 backdrop-blur-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* User Details */}
          <div className="p-2 border-b border-border/60 mb-1">
            <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
            <p className="text-[11px] text-muted truncate">{user.email}</p>
            {user.institution_id && (
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted bg-surface-muted px-2 py-1 rounded-md border border-border/40">
                <Building className="w-3 h-3 text-brand-600 shrink-0" />
                <span className="truncate">Campus: {user.institution_id}</span>
              </div>
            )}
          </div>

          {/* Navigation Items: Profile, Settings, Help */}
          <div className="p-1 border-b border-border/60 mb-1 space-y-0.5">
            <Link
              href={profileHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-foreground/80 hover:bg-surface-muted hover:text-foreground transition-colors"
            >
              <User className="w-3.5 h-3.5 text-muted" />
              <span>Profile</span>
            </Link>

            <Link
              href="/mfa/enrol"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-foreground/80 hover:bg-surface-muted hover:text-foreground transition-colors"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-muted" />
              <span>Settings & Security</span>
            </Link>

            <Link
              href="/help"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-foreground/80 hover:bg-surface-muted hover:text-foreground transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-muted" />
              <span>Help & Governance Docs</span>
            </Link>
          </div>

          {/* Role switcher (if multi-role) */}
          {user.roles && user.roles.length > 1 && (
            <div className="p-1 border-b border-border/60 mb-1">
              <span className="block text-[10px] font-semibold text-muted uppercase tracking-wider px-2 py-1">
                Switch Active Role
              </span>
              <div className="space-y-0.5">
                {user.roles.map((r) => {
                  const meta = ROLES_METADATA[r as keyof typeof ROLES_METADATA];
                  const isSelected = r === activeRole;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleChange(r)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                        isSelected
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-semibold"
                          : "text-foreground/80 hover:bg-surface-muted hover:text-foreground"
                      }`}
                    >
                      <span>{meta?.name ?? r}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-brand-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sign Out */}
          <div className="p-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
