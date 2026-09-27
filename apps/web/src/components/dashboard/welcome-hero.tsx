"use client";

import * as React from "react";
import Image from "next/image";
import { Sparkles, QrCode, GraduationCap, Download } from "lucide-react";

interface WelcomeHeroProps {
  student: {
    name: string;
    rollNo: string;
    department: string;
    programme: string;
    semester: number;
    hostel: string;
    room: string;
    bed: string;
  };
  onOpenGatePass: () => void;
  onOpenAllotmentLetter: () => void;
}

export function WelcomeHero({ student, onOpenGatePass, onOpenAllotmentLetter }: WelcomeHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-surface/80 p-6 sm:p-8 backdrop-blur-xl shadow-lg">
      {/* Ambient background mesh gradient glow */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left Side: Greeting & Student Credentials */}
        <div className="max-w-2xl">
          {/* Semester Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-gradient-to-r from-brand-500/10 via-indigo-500/10 to-cyan-500/10 px-3.5 py-1 text-xs font-bold text-brand-700 dark:text-brand-300 shadow-xs mb-3">
            <Sparkles className="h-3.5 w-3.5 text-brand-500" />
            <span>Autumn 2026 Semester</span>
            <span className="h-1 w-1 rounded-full bg-brand-500" />
            <span className="font-normal text-muted">Semester {student.semester}</span>
          </div>

          {/* Headline */}
          <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-text">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
              {student.name}
            </span>{" "}
            <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
          </h1>

          {/* Department & Roll Number */}
          <div className="mt-2.5 flex flex-wrap items-center gap-y-1 gap-x-3 text-xs sm:text-sm text-muted">
            <span className="flex items-center gap-1.5 font-medium text-text">
              <GraduationCap className="h-4 w-4 text-brand-500" />
              {student.programme} {student.department}
            </span>
            <span className="hidden sm:inline text-border">•</span>
            <span className="font-mono text-xs bg-muted/10 border border-border/60 px-2 py-0.5 rounded-md text-text font-semibold">
              Roll No: {student.rollNo}
            </span>
            <span className="hidden sm:inline text-border">•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {student.hostel}
            </span>
          </div>

          {/* Action CTAs */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenGatePass}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 hover:from-brand-500 hover:to-cyan-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <QrCode className="h-4 w-4" />
              <span>Digital Gate Pass</span>
            </button>

            <button
              type="button"
              onClick={onOpenAllotmentLetter}
              className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-surface/90 hover:bg-muted/10 px-4 py-2.5 text-xs font-bold text-text shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="h-4 w-4 text-brand-500" />
              <span>Allotment Letter</span>
            </button>
          </div>
        </div>

        {/* Right Side: Decorative 3D Campus Residence Artwork with Ambient Glow */}
        <div className="relative shrink-0 flex items-center justify-center lg:justify-end">
          <div className="relative h-44 w-44 sm:h-52 sm:w-52 rounded-3xl overflow-hidden border-2 border-border/80 shadow-2xl group">
            <Image
              src="/images/campus_building_hero.jpg"
              alt="Smart Campus Residential Hall"
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            {/* Soft Ambient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />

            {/* Floating Live Badge */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 px-2.5 py-1.5 flex items-center justify-between text-[10px] text-white">
              <span className="font-semibold truncate">Aryabhata Block A</span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                Turnstile Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
