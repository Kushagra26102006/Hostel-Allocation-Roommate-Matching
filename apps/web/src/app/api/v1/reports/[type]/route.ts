import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ReportService } from "@hostelhub/db";
import type { ReportType } from "@hostelhub/domain";

const querySchema = z.object({
  cycleId: z.string().optional(),
  hostelId: z.string().optional(),
  academicYear: z.string().optional(),
  forceLive: z.string().optional(),
});

const paramsSchema = z.object({
  type: z.enum([
    "occupancy",
    "preference_satisfaction",
    "override_analysis",
    "waitlist_movement",
    "cycle_time",
    "accessibility_compliance",
    "year_on_year",
    "fairness",
  ]),
});

const reportService = new ReportService();

export const GET = apiHandler(
  {
    permission: "analytics:read",
    operationId: "getReportByType",
    summary: "Get Pre-Aggregated Report or Live Metrics",
    description:
      "Returns pre-aggregated report data (<3s response time) with privacy-preserving suppression (<5 individuals). Dean role is authorized for read-only access.",
    query: querySchema,
  },
  async ({ institution_id, query, req }) => {
    // Extract type from URL pathname: /api/v1/reports/[type]
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // pathParts: ["api", "v1", "reports", "occupancy"]
    const typeFromPath = pathParts[3] as ReportType;

    const validatedType = paramsSchema.shape.type.safeParse(typeFromPath);
    const reportType = validatedType.success ? validatedType.data : "occupancy";

    const filterOpts = {
      cycleId: query.cycleId,
      hostelId: query.hostelId,
      academicYear: query.academicYear,
      forceLive: query.forceLive === "true" || query.forceLive === "1",
    };

    let data: unknown;
    switch (reportType) {
      case "occupancy":
        data = await reportService.getOccupancyReport(institution_id, filterOpts);
        break;
      case "preference_satisfaction":
        data = await reportService.getPreferenceSatisfactionReport(institution_id, filterOpts);
        break;
      case "override_analysis":
        data = await reportService.getOverrideAnalysis(institution_id, filterOpts);
        break;
      case "waitlist_movement":
        data = await reportService.getWaitlistMovement(institution_id, filterOpts);
        break;
      case "cycle_time":
        data = await reportService.getCycleTimeReport(institution_id, filterOpts);
        break;
      case "accessibility_compliance":
        data = await reportService.getAccessibilityCompliance(institution_id, filterOpts);
        break;
      case "year_on_year":
        data = await reportService.getYearOnYearComparison(institution_id, filterOpts);
        break;
      case "fairness":
        data = await reportService.getFairnessReport(institution_id, undefined, filterOpts);
        break;
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    return NextResponse.json({
      reportType,
      data,
      retrieved_at: new Date().toISOString(),
    });
  },
);
