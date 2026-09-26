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
  Bed,
  Users,
  CreditCard,
  QrCode,
  FileText,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    return <div className="h-9 w-28 animate-pulse rounded-xl bg-white/5" />;
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 rounded-xl bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-500 transition-all shadow-xs"
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
    : "AS";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-surface/60 p-1.5 pr-2.5 hover:bg-surface/90 hover:border-brand-500/40 transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        aria-expanded={open}
        aria-label="User navigation menu"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shadow-sm ring-1 ring-white/20">
          {initials}
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-semibold text-text leading-tight">{user.name}</span>
          <span className="text-[10px] text-brand-600 dark:text-brand-400 font-medium leading-none mt-0.5 capitalize">
            {roleMeta?.name ?? activeRole}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-border/80 bg-surface/95 p-2 backdrop-blur-2xl shadow-xl z-50 overflow-hidden text-text"
          >
            {/* User Profile Header */}
            <div className="p-2.5 border-b border-border/60 mb-1 rounded-xl bg-muted/5">
              <p className="text-xs font-bold text-text truncate">{user.name}</p>
              <p className="text-[11px] text-muted truncate">{user.email}</p>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted bg-surface/80 px-2 py-1 rounded-md border border-border/50">
                <Building className="w-3 h-3 text-brand-500" />
                <span className="truncate">Roll No: 22BCS042</span>
              </div>
            </div>

            {/* Quick Navigation Items */}
            <div className="p-1 space-y-0.5 border-b border-border/60 mb-1">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-text hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/30 dark:hover:text-brand-300 transition-colors font-medium"
              >
                <User className="w-3.5 h-3.5 text-muted" />
                <span>Profile &amp; Dashboard</span>
              </Link>
              <Link
                href="/room"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-text hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/30 dark:hover:text-brand-300 transition-colors"
              >
                <Bed className="w-3.5 h-3.5 text-blue-500" />
                <span>My Room &amp; Bed</span>
              </Link>
              <Link
                href="/roommate"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-text hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/30 dark:hover:text-brand-300 transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-brand-500" />
                <span>Roommate Match</span>
              </Link>
              <Link
                href="/payments"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-text hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/30 dark:hover:text-brand-300 transition-colors"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                <span>Payments &amp; Receipts</span>
              </Link>
              <Link
                href="/room"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-text hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/30 dark:hover:text-brand-300 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5 text-cyan-500" />
                <span>Digital Gate Pass</span>
              </Link>
              <Link
                href="/applications"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-text hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/30 dark:hover:text-brand-300 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-violet-500" />
                <span>Allotment Documents</span>
              </Link>
            </div>

            {/* Role switcher if user has multiple roles */}
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
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          isSelected
                            ? "bg-brand-600/15 text-brand-700 dark:text-brand-300 font-medium"
                            : "text-text hover:bg-muted/10"
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

            {/* Security Settings & Logout */}
            <div className="p-1 space-y-0.5">
              <Link
                href="/mfa/enrol"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-text hover:bg-muted/10 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span>Security &amp; MFA Settings</span>
              </Link>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-danger hover:bg-danger/10 transition-colors font-medium text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
