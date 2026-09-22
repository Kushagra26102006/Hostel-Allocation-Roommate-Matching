import type { Metadata } from "next";
import Link from "next/link";
import {
  Building,
  Bed,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Download,
  CreditCard,
  QrCode,
  Wrench,
  ChevronRight,
  MapPin,
  Wifi,
  Wind,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { StatusChip } from "@/components/status-chip";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPortalForRole } from "@/stores/role-store";

export const metadata: Metadata = {
  title: "Student Housing Dashboard — HostelHub",
  description: "View room allotment status, roommate match, announcements, and quick actions.",
};

export default async function StudentDashboardPage() {
  const session = await auth();
  const primaryRole = session?.user?.activeRole || session?.user?.roles?.[0];
  if (primaryRole && primaryRole !== "student") {
    redirect(getPortalForRole(primaryRole));
  }

  const student = {
    name: "Aarav Sharma",
    rollNo: "22BCS042",
    programme: "BTech",
    department: "Computer Science & Engineering",
    semester: 5,
    hostel: "Aryabhata Hall (Block A)",
    tower: "Tower A",
    room: "304",
    bed: "Bed A-304-1",
    floor: "3rd Floor",
    roomType: "Double Sharing (AC)",
    roommate: "Kabir Mehta",
    compatibility: 94,
    status: "allocated" as const,
    cycle: "Autumn 2026 Hostel Allocation Cycle",
  };

  const steps = [
    { label: "Application Submitted", date: "Sep 11, 2026", done: true },
    { label: "Documents Verified", date: "Sep 13, 2026", done: true },
    { label: "Roommate Matched", date: "Sep 16, 2026", done: true },
    { label: "Room Allocated", date: "Sep 18, 2026", done: true },
    { label: "Move-in Check-in", date: "Sep 25, 2026", done: false, active: true },
  ];

  const announcements = [
    {
      id: "ann-1",
      title: "Autumn 2026 Key Handover & Check-in Schedule",
      date: "Sep 20, 2026",
      tag: "Notice",
      summary:
        "Keys for Towers A & B will be distributed at the North Gate Warden Office from 9:00 AM to 6:00 PM.",
    },
    {
      id: "ann-2",
      title: "High-Speed Campus Wi-Fi & LAN Activation",
      date: "Sep 19, 2026",
      tag: "Facility",
      summary:
        "Ethernet ports in rooms 301–320 have been configured for 1 Gbps access. Register your MAC address.",
    },
    {
      id: "ann-3",
      title: "Mandatory Resident Safety & Fire Drill Briefing",
      date: "Sep 17, 2026",
      tag: "Welfare",
      summary: "Join the Chief Warden for an orientation webinar on September 24 at 5:00 PM.",
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header with Student Info */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300 mb-2">
            <Sparkles className="h-3 w-3" />
            <span>Autumn 2026 Semester</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
            Welcome back, {student.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {student.programme} • {student.department} • Roll No: {student.rollNo}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/room"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 transition-colors"
          >
            <QrCode className="h-4 w-4" />
            <span>Digital Gate Pass</span>
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-text hover:bg-muted/10 transition-colors shadow-xs"
          >
            <Download className="h-4 w-4 text-muted" />
            <span>Allotment Letter</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Allotment Status
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-text">Allocated</div>
            <div className="text-xs text-muted mt-1">Room 304 • {student.bed}</div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Roommate Match
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-text">{student.compatibility}% Match</div>
            <div className="text-xs text-muted mt-1">Matched with {student.roommate}</div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Hostel & Room
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Building className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-text">Aryabhata</div>
            <div className="text-xs text-muted mt-1">Tower A • 3rd Floor (AC)</div>
          </div>
        </GlassCard>

        <Link href="/payments" className="block transition-transform hover:-translate-y-0.5">
          <GlassCard className="p-5 hover:border-violet-500/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted flex items-center gap-1.5">
                <span>Fee Status</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500">
                  TEST
                </span>
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <CreditCard className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                Dues Cleared
              </div>
              <div className="text-xs text-muted mt-1 flex items-center justify-between">
                <span>Receipt #NIT-2026-FEE-409</span>
                <span className="text-primary font-semibold">Manage &rarr;</span>
              </div>
            </div>
          </GlassCard>
        </Link>
      </div>

      {/* 3. Stepper: Allocation Journey */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading text-lg font-bold text-text">Housing Allocation Journey</h2>
            <p className="text-xs text-muted mt-0.5">
              Track verification, matching, and room allotment status
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Step 4 of 5 Complete
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, idx) => (
            <div
              key={s.label}
              className={`relative rounded-xl border p-4 transition-all ${
                s.done
                  ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
                  : s.active
                    ? "border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/20"
                    : "border-border/60 bg-card/40 opacity-70"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    s.done
                      ? "bg-emerald-600 text-white"
                      : s.active
                        ? "bg-brand-600 text-white"
                        : "bg-muted/30 text-muted"
                  }`}
                >
                  {s.done ? "✓" : idx + 1}
                </span>
                <span className="text-xs font-semibold text-text truncate">{s.label}</span>
              </div>
              <p className="mt-2 text-[11px] text-muted">{s.date}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* 4. Allocated Room Card & Roommate Highlight */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Room Card */}
        <div className="lg:col-span-2">
          <GlassCard className="h-full p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{student.hostel}</span>
                  </div>
                  <h3 className="mt-1 font-heading text-2xl font-bold text-text">
                    Room {student.room} — {student.bed}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    {student.tower} • {student.floor} • {student.roomType}
                  </p>
                </div>
                <StatusChip status="success" label="Allocated" />
              </div>

              {/* Room Features */}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-center">
                  <Wind className="mx-auto h-4 w-4 text-brand-500 mb-1" />
                  <span className="block text-xs font-medium text-text">Air Conditioned</span>
                  <span className="text-[10px] text-muted">22°C Climate Ctrl</span>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-center">
                  <Wifi className="mx-auto h-4 w-4 text-emerald-500 mb-1" />
                  <span className="block text-xs font-medium text-text">Gigabit LAN</span>
                  <span className="text-[10px] text-muted">Port A-304-1</span>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-center">
                  <Bed className="mx-auto h-4 w-4 text-blue-500 mb-1" />
                  <span className="block text-xs font-medium text-text">Window View</span>
                  <span className="text-[10px] text-muted">Garden Courtyard</span>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-center">
                  <ShieldCheck className="mx-auto h-4 w-4 text-violet-500 mb-1" />
                  <span className="block text-xs font-medium text-text">Biometric Lock</span>
                  <span className="text-[10px] text-muted">Keycard RFID Ready</span>
                </div>
              </div>

              {/* Roommate details snippet */}
              <div className="mt-6 rounded-xl border border-border/80 bg-background/60 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-sm">
                      KM
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text">{student.roommate}</h4>
                      <p className="text-xs text-muted">BTech Computer Science • Bed A-304-2</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <Sparkles className="h-3 w-3" /> {student.compatibility}% Match
                    </span>
                    <p className="text-[10px] text-muted mt-0.5">Compatible sleep & study habits</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border/40 pt-4">
              <Link
                href="/room"
                className="inline-flex items-center gap-2 text-xs font-bold text-brand-600 hover:text-brand-500 transition-colors"
              >
                <span>Full Room & Inventory Specifications</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </GlassCard>
        </div>

        {/* Quick Actions Panel */}
        <div>
          <GlassCard className="h-full p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-heading text-lg font-bold text-text mb-4">
                Resident Quick Actions
              </h3>
              <div className="space-y-2.5">
                <Link
                  href="/room"
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/5 p-3 hover:bg-muted/15 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                      <Bed className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-text group-hover:text-brand-600 transition-colors">
                        Room & Bed Details
                      </span>
                      <p className="text-[11px] text-muted">Specs, amenities, floor plan</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  href="/roommate"
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/5 p-3 hover:bg-muted/15 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-text group-hover:text-brand-600 transition-colors">
                        Roommate Matching
                      </span>
                      <p className="text-[11px] text-muted">Compatibility questionnaire</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  href="/complaints"
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/5 p-3 hover:bg-muted/15 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-text group-hover:text-brand-600 transition-colors">
                        Maintenance & Helpdesk
                      </span>
                      <p className="text-[11px] text-muted">Raise electrical/plumbing request</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  href="/payments"
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/5 p-3 hover:bg-muted/15 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-text group-hover:text-brand-600 transition-colors">
                        Fee Payments & Invoices
                      </span>
                      <p className="text-[11px] text-muted">Hostel & mess receipts</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-brand-500/30 bg-brand-500/10 p-3 text-center">
              <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
                Warden Support Desk
              </span>
              <p className="text-[11px] text-muted mt-0.5">
                Emergency Helpline: +91 1800-NIT-HOSTEL
              </p>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* 5. Campus Hostel Notices & Announcements */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading text-lg font-bold text-text">
              Campus Hostel Announcements
            </h3>
            <p className="text-xs text-muted">
              Official updates from the Chief Warden and Estate Office
            </p>
          </div>
          <span className="text-xs font-semibold text-brand-600 hover:underline cursor-pointer">
            View All Notices
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="rounded-xl border border-border/60 bg-card/60 p-4 flex flex-col justify-between hover:border-brand-500/50 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="rounded-md bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                    {ann.tag}
                  </span>
                  <span className="text-[11px] text-muted flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {ann.date}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-text line-clamp-2">{ann.title}</h4>
                <p className="mt-2 text-xs text-muted line-clamp-3">{ann.summary}</p>
              </div>
              <div className="mt-4 pt-2 border-t border-border/30">
                <span className="text-xs font-semibold text-brand-600 hover:text-brand-500 flex items-center gap-1">
                  Read Full Notice <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
