import type { ReactNode } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { GradientMesh } from "@/components/gradient-mesh";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-background text-foreground overflow-hidden">
      {/* Subtle single-brand background backdrop */}
      <GradientMesh blobCount={3} className="opacity-70" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="HostelHub Home">
          <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center text-white shadow-2xs transition-transform group-hover:scale-105">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">
            Hostel<span className="text-brand-500">Hub</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Card Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-muted">
        HostelHub Identity &bull; Role-Based Access Control &bull; Institutional Single Sign-On
      </footer>
    </div>
  );
}
