/**
 * GET /api/v1/metrics
 *
 * Exposes application telemetry, BullMQ queue depths, and allocation run durations.
 * Supports both JSON (application/json) and Prometheus text format (text/plain).
 */

import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { collectMetrics, formatPrometheus } from "@/lib/metrics-collector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiHandler(
  {
    public: true,
    operationId: "getMetrics",
    summary: "System and Queue Telemetry Metrics",
    tags: ["System"],
  },
  async ({ req }) => {
    const metrics = await collectMetrics();
    const acceptHeader = req.headers.get("accept") ?? "";

    if (acceptHeader.includes("text/plain")) {
      return new NextResponse(formatPrometheus(metrics), {
        status: 200,
        headers: {
          "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        },
      });
    }

    return NextResponse.json(metrics, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  },
);
