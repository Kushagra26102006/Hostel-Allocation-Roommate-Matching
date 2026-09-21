import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ReportService } from "@hostelhub/db";
import type { ReportType } from "@hostelhub/domain";
import { REPORTS_QUEUE_NAME, type ReportJobPayload } from "@hostelhub/shared";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

const exportQuerySchema = z.object({
  format: z.enum(["csv", "xlsx", "pdf"]).optional(),
  cycleId: z.string().optional(),
  hostelId: z.string().optional(),
  async: z.string().optional(),
});

const reportService = new ReportService();

let reportsQueueInstance: Queue<ReportJobPayload> | null = null;
function getReportsQueue(): Queue<ReportJobPayload> {
  if (!reportsQueueInstance) {
    const redisUrl = process.env["REDIS_URL"] || "redis://localhost:6379";
    const redis = new Redis(redisUrl, { maxRetriesPerRequest: null });
    reportsQueueInstance = new Queue<ReportJobPayload>(REPORTS_QUEUE_NAME, {
      connection: redis,
    });
  }
  return reportsQueueInstance;
}

export const GET = apiHandler(
  {
    permission: "analytics:read",
    operationId: "exportReportByType",
    summary: "Export Report as CSV, XLSX, or PDF",
    description:
      "Generates synchronous downloadable export or queues asynchronous background export job with completion notification. Dean role is strictly read-only and authorized to export.",
    query: exportQuerySchema,
  },
  async ({ institution_id, query, req, user }) => {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Path: /api/v1/reports/[type]/export
    const reportType = (pathParts[3] || "occupancy") as ReportType;
    const requestedFormat = query.format || "csv";
    const isAsync = query.async === "true" || query.async === "1";

    // Asynchronous background job requested for long-running reports
    if (isAsync) {
      const queue = getReportsQueue();
      const job = await queue.add("generate-report", {
        reportType,
        format: requestedFormat,
        institutionId: institution_id,
        cycleId: query.cycleId,
        requestedByUserId: user?.id || "anonymous",
      });

      return NextResponse.json({
        jobId: job.id,
        status: "queued",
        message:
          "Report generation started in background. You will receive an in-app notification when ready.",
      });
    }

    // Direct synchronous export
    const { buffer, contentType, filename } = await reportService.generateExport(
      reportType,
      requestedFormat,
      institution_id,
      { cycleId: query.cycleId, hostelId: query.hostelId },
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  },
);
