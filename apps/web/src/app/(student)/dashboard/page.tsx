import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPortalForRole } from "@/stores/role-store";
import { StudentDashboardClient } from "@/components/dashboard/student-dashboard-client";
import { connectDb, StudentService, type StudentProfileDto } from "@hostelhub/db";

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

  let profile: StudentProfileDto | null = null;
  if (session?.user?.id) {
    try {
      await connectDb();
      profile = await StudentService.getStudentProfile(session.user.id);
    } catch {
      // Non-fatal DB error fallback
    }
  }

  const student = {
    name: profile?.fullName || session?.user?.name || "Student Resident",
    rollNo: profile?.rollNumber || session?.user?.rollNumber || "Pending Enrollment",
    programme: profile?.programme || "BTech Computer Science",
    department: profile?.department || "Computer Science & Engineering",
    semester: Number(profile?.semester?.replace(/\D/g, "")) || 1,
    hostel: profile?.hasAllocation ? "Aryabhata Hall (Block A)" : "Unallocated",
    tower: profile?.hasAllocation ? "Tower A" : "N/A",
    room: profile?.hasAllocation ? "304" : "N/A",
    bed: profile?.hasAllocation ? "Bed A-304-1" : "N/A",
    floor: profile?.hasAllocation ? "3rd Floor" : "N/A",
    roomType: "Double Sharing (AC)",
    roommate: profile?.hasAllocation ? "Kabir Mehta" : "Open",
    compatibility: profile?.hasAllocation ? 94 : 0,
    status: profile?.hasAllocation ? "allocated" : "unallocated",
    cycle: "Autumn 2026 Hostel Allocation Cycle",
  };

  return <StudentDashboardClient student={student} />;
}
