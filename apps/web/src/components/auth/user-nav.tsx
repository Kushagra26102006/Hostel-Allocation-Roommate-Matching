"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  LogOut,
  User,
  Shield,
  ChevronDown,
  Building,
  Check,
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
    return (
      <div className="h-9 w-28 animate-pulse rounded-xl bg-white/5" />
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-all"
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-1.5 pr-3 hover:bg-white/10 transition-all"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
          {initials}
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xs font-semibold text-white leading-tight">
            {user.name}
          </span>
          <span className="text-[10px] text-primary font-medium leading-none mt-0.5">
            {roleMeta?.name ?? activeRole}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/10 bg-slate-900/95 p-2 backdrop-blur-2xl shadow-2xl shadow-black/80 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-white/10 mb-1">
            <p className="text-xs font-semibold text-white">{user.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 bg-white/5 px-2 py-1 rounded-md">
              <Building className="w-3 h-3 text-primary" />
              <span className="truncate">Institution: {user.institution_id?.slice(-6)}</span>
            </div>
          </div>

          {/* If user has multiple assigned roles, allow switching */}
          {user.roles && user.roles.length > 1 && (
            <div className="p-1 border-b border-white/10 mb-1">
              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
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
                          ? "bg-primary/20 text-white font-medium"
                          : "text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <span>{meta?.name ?? r}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-1 space-y-0.5">
            <Link
              href="/mfa/enrol"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/5 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>MFA Security Settings</span>
            </Link>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/40 transition-colors"
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
