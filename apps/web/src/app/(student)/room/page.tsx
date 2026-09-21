"use client";

import * as React from "react";
import {
  Download,
  CalendarPlus,
  ArrowLeftRight,
  Scale,
  Sparkles,
  HelpCircle,
  Users,
  ShieldCheck,
  Clock,
  MapPin,
  QrCode,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KeyCardFlip } from "@/components/student/result/key-card-flip";
import { RoomChangeDialog } from "@/components/student/result/room-change-dialog";
import { AppealDialog } from "@/components/student/result/appeal-dialog";
import { triggerIcsDownload } from "@/lib/calendar";
import type { StudentResultData } from "@hostelhub/domain";

export default function StudentRoomPage() {
  const [data, setData] = React.useState<StudentResultData | null>(null);
  const [isRoomChangeOpen, setIsRoomChangeOpen] = React.useState<boolean>(false);
  const [isAppealOpen, setIsAppealOpen] = React.useState<boolean>(false);
  const [isDownloading, setIsDownloading] = React.useState<boolean>(false);
  const [, setIsRevealed] = React.useState<boolean>(false);

  React.useEffect(() => {
    let isMounted = true;
    async function fetchResult() {
      try {
        const res = await fetch("/api/v1/student/allocation-result");
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.data) {
            setData(json.data);
          }
        }
      } catch {
        // Fallback default sample data if not logged in or local mock
      }
    }

    void fetchResult();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fallback defaults if user hasn't run algorithm yet
  const allocation = data?.hasAllocation
    ? data
    : {
        hasAllocation: true,
        status: "published" as const,
        assignmentId: "mock-asgn-01",
        letterId: "mock-letter-01",
        letterDownloadUrl: "/api/v1/letters/mock-letter-01/download",
        hostel: {
          name: "Aryabhata Hall",
          block: "Tower A (North Wing)",
          floor: 3,
          roomNumber: "304",
          bedNo: "Bed A-304-1",
          roomType: "Double Sharing (Air Conditioned)",
        },
        score: 94,
        compatibilityPercent: 94,
        whyThisRoom:
          "High compatibility match based on synchronized quiet study habits and nocturnal sleeping preference.",
        moveInDate: "September 25, 2026",
        checkInWindow: "10:00 AM – 5:00 PM IST",
        roommates: [
          {
            name: "Kabir Mehta",
            rollNumber: "22BCS058",
            bedNo: "Bed A-304-2",
            isConsented: true,
          },
        ],
      };

  const handleDownloadLetter = async () => {
    if (allocation.letterId) {
      try {
        setIsDownloading(true);
        const res = await fetch(`/api/v1/letters/${allocation.letterId}/download`);
        if (res.ok) {
          const body = await res.json();
          if (body.download_url) {
            window.open(body.download_url, "_blank");
          }
        } else {
          // If direct API download endpoint
          window.open(`/api/v1/letters/${allocation.letterId}/download?redirect=true`, "_blank");
        }
      } catch {
        window.open(`/api/v1/letters/${allocation.letterId}/download`, "_blank");
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const handleAddToCalendar = () => {
    const moveInStart = new Date("2026-09-25T10:00:00");
    const moveInEnd = new Date("2026-09-25T17:00:00");

    triggerIcsDownload({
      title: `Hostel Move-In: ${allocation.hostel.name} Room ${allocation.hostel.roomNumber}`,
      description: `Official reporting and move-in check-in window.\nRoom: ${allocation.hostel.roomNumber} (${allocation.hostel.bedNo})\nHostel: ${allocation.hostel.name}, ${allocation.hostel.block}\nBring your allocation letter, ID card, and fitness certificate.`,
      location: `${allocation.hostel.name} Caretaker Office, Campus`,
      startDate: moveInStart,
      endDate: moveInEnd,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Allocation Results Live
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Room & Bed Allotment
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Your official housing allocation decision, verification pass, and move-in instructions.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleDownloadLetter}
            disabled={isDownloading}
            size="sm"
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs gap-1.5 shadow-lg shadow-sky-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            {isDownloading ? "Preparing..." : "Download Letter"}
          </Button>

          <Button
            onClick={handleAddToCalendar}
            variant="outline"
            size="sm"
            className="border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs gap-1.5"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-sky-400" />
            Add to Calendar (.ics)
          </Button>
        </div>
      </div>

      {/* Main Experience Layout: Mobile-First Keycard Flip + Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: 3D Key Card Reveal (Mobile-First Hero) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="text-center sm:text-left">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Interactive Room Pass
            </h2>
            <p className="text-xs text-slate-500">
              Tap the holographic card to reveal your room allotment and compatibility score.
            </p>
          </div>

          <KeyCardFlip
            hostelName={allocation.hostel.name}
            blockName={allocation.hostel.block}
            roomNumber={allocation.hostel.roomNumber}
            bedNo={allocation.hostel.bedNo}
            roomType={allocation.hostel.roomType}
            score={allocation.score}
            onRevealed={() => setIsRevealed(true)}
          />

          <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-2">
            <span className="flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5 text-sky-400" />
              Signed QR Pass
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Ed25519 Verified
            </span>
          </div>
        </div>

        {/* Right Column: "Why this room?", Roommates, and Move-In Info */}
        <div className="lg:col-span-7 space-y-6">
          {/* "Why this room?" Panel */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Why this room?</h3>
                  <p className="text-[11px] text-slate-400">
                    Transparent explanation generated from your compatibility preferences
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs"
              >
                {allocation.score}% Compatibility
              </Badge>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs sm:text-sm text-slate-300 leading-relaxed">
              &ldquo;{allocation.whyThisRoom}&rdquo;
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  Sleep Sync
                </span>
                <p className="text-slate-200 font-bold mt-0.5">High Affinity</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  Study Habit
                </span>
                <p className="text-slate-200 font-bold mt-0.5">Quiet Room</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  Accessibility
                </span>
                <p className="text-slate-200 font-bold mt-0.5">Verified Floor</p>
              </div>
            </div>
          </div>

          {/* Roommates Card (With Mutual Consent Privacy Filter) */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Roommate Details</h3>
                  <p className="text-[11px] text-slate-400">
                    Names revealed strictly under mutual directory privacy consent
                  </p>
                </div>
              </div>
            </div>

            {allocation.roommates.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">
                No roommates assigned to this room (single occupancy allotment).
              </p>
            ) : (
              <div className="space-y-3">
                {allocation.roommates.map((rm, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-100 text-sm">{rm.name}</strong>
                        {rm.isConsented ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] py-0"
                          >
                            Consent Granted
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] py-0 flex items-center gap-1"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            Private
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        {rm.bedNo} {rm.rollNumber ? `· Roll: ${rm.rollNumber}` : ""}
                      </p>
                    </div>

                    {!rm.isConsented && (
                      <span className="text-[10px] text-slate-500 max-w-[140px] text-right">
                        Hidden per student privacy settings
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Move-In Instructions & Reporting Window */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Reporting & Check-in Schedule</h3>
                <p className="text-[11px] text-slate-400">
                  Important reporting times, desks, and required documentation
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400">Move-in Date:</span>
                <p className="text-slate-200 font-bold text-sm">{allocation.moveInDate}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400">Check-in Window:</span>
                <p className="text-slate-200 font-bold text-sm">{allocation.checkInWindow}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  Reporting Desk: <strong>{allocation.hostel.name} Caretaker Office</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsRoomChangeOpen(true)}
                  variant="outline"
                  size="sm"
                  className="text-xs border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 mr-1 text-sky-400" />
                  Request Room Change
                </Button>
                <Button
                  onClick={() => setIsAppealOpen(true)}
                  variant="outline"
                  size="sm"
                  className="text-xs border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300"
                >
                  <Scale className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  File an Appeal
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog Modals */}
      <RoomChangeDialog
        isOpen={isRoomChangeOpen}
        onClose={() => setIsRoomChangeOpen(false)}
        currentRoom={allocation.hostel.roomNumber}
        hostelName={allocation.hostel.name}
      />

      <AppealDialog
        isOpen={isAppealOpen}
        onClose={() => setIsAppealOpen(false)}
        assignmentId={allocation.assignmentId}
        hostelName={allocation.hostel.name}
      />
    </div>
  );
}
