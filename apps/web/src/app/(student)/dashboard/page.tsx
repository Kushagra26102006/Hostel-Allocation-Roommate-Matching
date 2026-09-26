import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPortalForRole } from "@/stores/role-store";
import { StudentDashboardClient } from "@/components/dashboard/student-dashboard-client";

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
    name: session?.user?.name || "Aarav Sharma",
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
    status: "allocated",
    cycle: "Autumn 2026 Hostel Allocation Cycle",
  };

  return <StudentDashboardClient student={student} />;
}
