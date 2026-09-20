import type { Metadata } from "next";
import Link from "next/link";
import {
  Building,
  CheckCircle2,
  QrCode,
  Wind,
  ShieldCheck,
  Zap,
  Coffee,
  Sparkles,
  ArrowRight,
  Download,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { StatusChip } from "@/components/status-chip";

export const metadata: Metadata = {
  title: "Room & Bed Allotment — HostelHub",
  description:
    "View specifications, inventory checklist, and roommate details for your allocated room.",
};

export default function StudentRoomPage() {
  const roomDetails = {
    hostel: "Aryabhata Hall (Block A)",
    tower: "Tower A",
    floor: "3rd Floor",
    roomNumber: "304",
    bedNo: "Bed A-304-1",
    roomType: "Double Sharing (Air Conditioned)",
    wing: "North Wing (Courtyard Facing)",
    status: "allocated" as const,
    keyPassCode: "PASS-2026-ARY-304-A1",
    moveInDate: "September 25, 2026",
    checkInTime: "10:00 AM – 5:00 PM",
  };

  const roommate = {
    name: "Kabir Mehta",
    rollNo: "22BCS058",
    programme: "BTech Computer Science & Engineering",
    semester: "5th Semester",
    bedNo: "Bed A-304-2",
    compatibilityScore: 94,
    sleepSchedule: "Night Owl (12:30 AM – 7:30 AM)",
    cleanliness: "High (Daily cleaning)",
    studyHabits: "Quiet focused study",
    interests: ["Competitive Coding", "Open Source", "Badminton"],
  };

  const inventoryItems = [
    { name: "Single Wooden Bed Frame (6ft x 3ft)", qty: 1, condition: "Excellent", verified: true },
    { name: "Orthopedic High-Density Foam Mattress", qty: 1, condition: "New", verified: true },
    { name: "Ergonomic Study Desk with Bookshelf", qty: 1, condition: "Excellent", verified: true },
    { name: "Mesh Ergonomic Revolving Chair", qty: 1, condition: "Good", verified: true },
    {
      name: "Full-Length Steel Wardrobe with Lock",
      qty: 1,
      condition: "Excellent",
      verified: true,
    },
    { name: "Daikin Inverter Split AC (1.5 Ton)", qty: 1, condition: "Serviced", verified: true },
    { name: "High-Speed Ethernet LAN Port (Cat6)", qty: 1, condition: "Active", verified: true },
    { name: "LED Ceiling Fixtures & Night Lamp", qty: 2, condition: "Functional", verified: true },
  ];

  const amenities = [
    {
      title: "24/7 Silent Study Lounge",
      desc: "Located on Floor 3, opposite room 310",
      icon: Sparkles,
    },
    {
      title: "Floor Pantry & Microwave",
      desc: "Equipped with hot water kettle & microwave",
      icon: Coffee,
    },
    { title: "RO Purified Water Station", desc: "Cold and ambient water dispenser", icon: Zap },
    {
      title: "Laundry & Ironing Room",
      desc: "Automated washing machines in Basement A",
      icon: Wind,
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300 mb-2">
            <Building className="h-3.5 w-3.5" />
            <span>Campus Residence Allotment</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
            Room {roomDetails.roomNumber} • {roomDetails.bedNo}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {roomDetails.hostel} • {roomDetails.floor} • {roomDetails.wing}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Download Allotment Slip</span>
          </button>
          <Link
            href="/complaints"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-text hover:bg-muted/10 transition-colors"
          >
            <span>Report Room Issue</span>
          </Link>
        </div>
      </div>

      {/* 2. Room Overview & Digital Gate Pass */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Room Specifications */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Residential Unit
                </span>
                <h2 className="mt-1 font-heading text-2xl font-bold text-text">
                  {roomDetails.hostel}
                </h2>
                <p className="text-xs text-muted mt-0.5">{roomDetails.roomType}</p>
              </div>
              <StatusChip status="success" label="Allocated" />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-border/60 bg-muted/5 p-3.5">
                <span className="text-xs text-muted">Tower & Floor</span>
                <p className="mt-1 text-sm font-bold text-text">
                  {roomDetails.tower}, {roomDetails.floor}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/5 p-3.5">
                <span className="text-xs text-muted">Bed Position</span>
                <p className="mt-1 text-sm font-bold text-text">Window (Left Side)</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/5 p-3.5">
                <span className="text-xs text-muted">Climate Control</span>
                <p className="mt-1 text-sm font-bold text-text">Inverter AC + Fan</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/5 p-3.5">
                <span className="text-xs text-muted">Move-in Date</span>
                <p className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {roomDetails.moveInDate}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-border/40 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                Tower Amenities
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {amenities.map((amenity) => (
                  <div
                    key={amenity.title}
                    className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3"
                  >
                    <amenity.icon className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-text">{amenity.title}</h4>
                      <p className="text-[11px] text-muted">{amenity.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Roommate Details Card */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading text-lg font-bold text-text">Roommate Profile</h3>
                <p className="text-xs text-muted">Allotted roommate sharing Room 304</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" /> {roommate.compatibilityScore}% Compatibility
              </span>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/60 bg-muted/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-base shadow-sm">
                  KM
                </div>
                <div>
                  <h4 className="text-base font-bold text-text">{roommate.name}</h4>
                  <p className="text-xs text-muted">
                    {roommate.programme} • {roommate.bedNo}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">Roll No: {roommate.rollNo}</p>
                </div>
              </div>

              <Link
                href="/roommate"
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-500/20 transition-colors w-fit"
              >
                <span>Compatibility Breakdown</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/40 bg-card p-3">
                <span className="text-[11px] text-muted">Sleep Routine</span>
                <p className="text-xs font-semibold text-text mt-0.5">{roommate.sleepSchedule}</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-card p-3">
                <span className="text-[11px] text-muted">Cleanliness Preference</span>
                <p className="text-xs font-semibold text-text mt-0.5">{roommate.cleanliness}</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-card p-3">
                <span className="text-[11px] text-muted">Study Habits</span>
                <p className="text-xs font-semibold text-text mt-0.5">{roommate.studyHabits}</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Col: Digital Keycard & Check-in Pass */}
        <div className="space-y-6">
          <GlassCard className="p-6 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-600 dark:text-brand-400 mb-4">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Digital Check-in Pass</span>
            </div>

            {/* QR Mock */}
            <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-2xl border-2 border-dashed border-brand-500/40 bg-white p-4 shadow-sm dark:bg-zinc-900">
              <div className="flex flex-col items-center justify-center text-center">
                <QrCode className="h-28 w-28 text-text" />
                <span className="text-[10px] font-mono text-muted mt-1">
                  {roomDetails.keyPassCode}
                </span>
              </div>
            </div>

            <p className="mt-4 text-xs font-bold text-text">
              Present at Warden Desk during check-in
            </p>
            <p className="text-[11px] text-muted mt-1">
              Active verification code linked to your student biometric profile.
            </p>

            <div className="mt-5 rounded-xl border border-border/60 bg-muted/10 p-3 text-left">
              <div className="flex items-center justify-between text-xs font-semibold text-text">
                <span>Check-in Window</span>
                <span>{roomDetails.checkInTime}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                <span>Location</span>
                <span>Tower A Ground Reception</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
              Need a Room Swap?
            </h4>
            <p className="text-xs text-muted leading-relaxed">
              Mutual room swap window opens after the initial move-in phase on October 1, 2026.
            </p>
            <button
              type="button"
              disabled
              className="mt-3 w-full rounded-lg border border-border/80 bg-muted/20 py-2 text-xs font-semibold text-muted cursor-not-allowed"
            >
              Swap Window Opens Oct 1
            </button>
          </GlassCard>
        </div>
      </div>

      {/* 3. Room Inventory Checklist */}
      <GlassCard className="p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h3 className="font-heading text-lg font-bold text-text">
              Room Inventory & Handover Checklist
            </h3>
            <p className="text-xs text-muted">
              Inspect each item upon arrival and sign digital handover
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            8 Items Verified
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted uppercase text-[10px] tracking-wider">
                <th className="pb-3 font-semibold">Inventory Item</th>
                <th className="pb-3 font-semibold">Quantity</th>
                <th className="pb-3 font-semibold">Condition</th>
                <th className="pb-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {inventoryItems.map((item) => (
                <tr key={item.name} className="hover:bg-muted/5 transition-colors">
                  <td className="py-3 font-medium text-text flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{item.name}</span>
                  </td>
                  <td className="py-3 text-muted">{item.qty}</td>
                  <td className="py-3 text-muted">{item.condition}</td>
                  <td className="py-3 text-right">
                    <span className="inline-flex rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Verified
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
