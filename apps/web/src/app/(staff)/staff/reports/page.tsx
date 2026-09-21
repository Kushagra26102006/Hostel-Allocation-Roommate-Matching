import type { Metadata } from "next";
import { auth } from "@/auth";
import { ReportService } from "@hostelhub/db";
import { BentoDashboard } from "@/components/reports/dashboard-bento";

export const metadata: Metadata = {
  title: "Reports & Fairness Dashboard — HostelHub",
  description:
    "Audited occupancy heatmaps, preference satisfaction metrics, priority inversion guarantees, and executive reports.",
};

const reportService = new ReportService();

export default async function StaffReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const userRole = session?.user?.roles?.[0] || "dean";
  const institutionId = session?.user?.institution_id || "000000000000000000000001";

  const resolvedParams = await searchParams;
  const cycleId =
    typeof resolvedParams["cycleId"] === "string" ? resolvedParams["cycleId"] : undefined;
  const hostelId =
    typeof resolvedParams["hostel"] === "string" ? resolvedParams["hostel"] : undefined;

  const filterOpts = {
    cycleId,
    hostelId,
    forceLive: false,
  };

  // Fetch pre-aggregated read models concurrently (<3s response)
  const [occupancy, preference, fairness, yoy, accessibility, overrides, waitlist, cycleTime] =
    await Promise.all([
      reportService.getOccupancyReport(institutionId, filterOpts),
      reportService.getPreferenceSatisfactionReport(institutionId, filterOpts),
      reportService.getFairnessReport(institutionId, undefined, filterOpts),
      reportService.getYearOnYearComparison(institutionId, filterOpts),
      reportService.getAccessibilityCompliance(institutionId, filterOpts),
      reportService.getOverrideAnalysis(institutionId, filterOpts),
      reportService.getWaitlistMovement(institutionId, filterOpts),
      reportService.getCycleTimeReport(institutionId, filterOpts),
    ]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <BentoDashboard
        initialOccupancy={occupancy}
        initialPreference={preference}
        initialFairness={fairness}
        initialYearOnYear={yoy}
        initialAccessibility={accessibility}
        initialOverrides={overrides}
        initialWaitlist={waitlist}
        initialCycleTime={cycleTime}
        userRole={userRole}
      />
    </div>
  );
}
