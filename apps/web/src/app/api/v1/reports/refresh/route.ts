import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { assertNotReadOnly } from "@/lib/auth/policy.js";
import { ReportService } from "@hostelhub/db";

const refreshBodySchema = z.object({
  cycleId: z.string(),
});

const reportService = new ReportService();

export const POST = apiHandler(
  {
    permission: "cycles:manage",
    body: refreshBodySchema,
    operationId: "refreshReportReadModels",
    summary: "Refresh Pre-Aggregated Report Read Models",
    description:
      "Recalculates and caches all 8 read models for <3s dashboard latency. Dean role is strictly read-only and blocked from invoking this endpoint.",
  },
  async ({ institution_id, body, user }) => {
    // Layer 1: Enforce Dean strictly read-only policy
    assertNotReadOnly(user);

    await reportService.refreshReadModels(institution_id, body.cycleId);

    return NextResponse.json({
      success: true,
      cycleId: body.cycleId,
      message: "Pre-aggregated report read models refreshed successfully.",
      refreshed_at: new Date().toISOString(),
    });
  },
);
