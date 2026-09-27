"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { WelcomeHero } from "@/components/dashboard/welcome-hero";
import { AnimatedKpiCards } from "@/components/dashboard/kpi-cards";
import { HousingJourneyStepper } from "@/components/dashboard/housing-journey-stepper";
import { RoomShowcaseCard } from "@/components/dashboard/room-showcase-card";
import { RoommateCard } from "@/components/dashboard/roommate-card";
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card";
import { SupportCard } from "@/components/dashboard/support-card";
import { CampusAnnouncements } from "@/components/dashboard/campus-announcements";
import { GatePassModal } from "@/components/dashboard/gate-pass-modal";
import { AllotmentLetterModal } from "@/components/dashboard/allotment-letter-modal";

export interface StudentDashboardData {
  name: string;
  rollNo: string;
  programme: string;
  department: string;
  semester: number;
  hostel: string;
  tower: string;
  room: string;
  bed: string;
  floor: string;
  roomType: string;
  roommate: string;
  compatibility: number;
  status: string;
  cycle: string;
}

interface StudentDashboardClientProps {
  student: StudentDashboardData;
}

export function StudentDashboardClient({ student }: StudentDashboardClientProps) {
  const [isGatePassOpen, setIsGatePassOpen] = React.useState(false);
  const [isAllotmentLetterOpen, setIsAllotmentLetterOpen] = React.useState(false);

  return (
    <div className="relative min-h-screen">
      {/* Background Ambient Mesh Glows (Apple/Linear aesthetic) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-brand-500/10 dark:bg-brand-500/15 blur-3xl" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* 1. Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <WelcomeHero
            student={student}
            onOpenGatePass={() => setIsGatePassOpen(true)}
            onOpenAllotmentLetter={() => setIsAllotmentLetterOpen(true)}
          />
        </motion.div>

        {/* 2. Key Metrics Animated KPI Grid */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <AnimatedKpiCards student={student} />
        </motion.div>

        {/* 3. Housing Allocation Journey Stepper */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <HousingJourneyStepper />
        </motion.div>

        {/* 4. Room Showcase & Roommate Match Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
        >
          {/* Room Showcase (7 cols) */}
          <div className="lg:col-span-7 h-full">
            <RoomShowcaseCard student={student} />
          </div>

          {/* Roommate Match Card (5 cols) */}
          <div className="lg:col-span-5 h-full">
            <RoommateCard
              roommate={{
                name: student.roommate,
                department: student.department,
                bed: "Bed A-304-2",
                compatibility: student.compatibility,
              }}
            />
          </div>
        </motion.div>

        {/* 5. Resident Quick Actions & Maintenance Helpdesk */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
        >
          {/* Quick Actions (7 cols) */}
          <div className="lg:col-span-7 h-full">
            <QuickActionsCard onOpenGatePass={() => setIsGatePassOpen(true)} />
          </div>

          {/* Maintenance & Helpdesk (5 cols) */}
          <div className="lg:col-span-5 h-full">
            <SupportCard />
          </div>
        </motion.div>

        {/* 6. Campus Announcements */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <CampusAnnouncements />
        </motion.div>
      </div>

      {/* Interactive Modals */}
      <GatePassModal
        isOpen={isGatePassOpen}
        onClose={() => setIsGatePassOpen(false)}
        student={student}
      />

      <AllotmentLetterModal
        isOpen={isAllotmentLetterOpen}
        onClose={() => setIsAllotmentLetterOpen(false)}
        student={student}
      />
    </div>
  );
}
