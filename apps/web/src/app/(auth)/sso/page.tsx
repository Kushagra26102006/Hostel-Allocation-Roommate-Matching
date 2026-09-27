"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Building2, Lock, ArrowRight } from "lucide-react";
import { useRoleStore } from "@/stores/role-store";

export default function SsoPage() {
  const router = useRouter();
  const setRole = useRoleStore((s) => s.setRole);
  const [isAuthenticating, setIsAuthenticating] = React.useState(false);

  const handleSsoLogin = (role: Parameters<typeof setRole>[0]) => {
    setIsAuthenticating(true);
    setRole(role);
    setTimeout(() => {
      if (role === "student") {
        router.push("/student/dashboard");
      } else if (role === "warden") {
        router.push("/warden/dashboard");
      } else if (role === "chief_warden") {
        router.push("/chief-warden/dashboard");
      } else if (role === "hostel_admin") {
        router.push("/admin/dashboard");
      } else if (role === "dean") {
        router.push("/dean/analytics");
      } else {
        router.push("/sys-admin/users");
      }
    }, 600);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background text-foreground">
      <GlassCard className="w-full max-w-md p-8 text-center border-brand-500/30">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
          <Building2 className="h-6 w-6" />
        </div>

        <h1 className="mt-4 font-heading text-2xl font-bold">University SSO Gateway</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Single Sign-On authentication via Institutional Identity Provider (SAML 2.0 / OIDC)
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Button
            size="lg"
            className="w-full justify-between"
            onClick={() => handleSsoLogin("student")}
            disabled={isAuthenticating}
          >
            <span>Continue as Student (Aarav Sharma)</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full justify-between"
            onClick={() => handleSsoLogin("warden")}
            disabled={isAuthenticating}
          >
            <span>Continue as Hostel Warden</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full justify-between"
            onClick={() => handleSsoLogin("chief_warden")}
            disabled={isAuthenticating}
          >
            <span>Continue as Chief Warden</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full justify-between"
            onClick={() => handleSsoLogin("dean")}
            disabled={isAuthenticating}
          >
            <span>Continue as Dean Student Welfare</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 text-emerald-600" />
          <span>Encrypted with TLS 1.3 & PKCE</span>
        </div>

        <div className="mt-4 border-t border-border/40 pt-4 text-xs">
          <Link href="/login" className="text-brand-600 hover:underline dark:text-brand-400">
            Back to standard password login
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
