/**
 * GET /api/v1/metrics
 *
 * Exposes application telemetry, BullMQ queue depths, and allocation run durations.
 * Supports both JSON (application/json) and Prometheus text format (text/plain).
 */

import { NextResponse } from "next/server";
import { Queue } from "bullmq";
import { apiHandler } from "@/lib/api/handler";
import { getRedis } from "@/lib/redis";
import { AllocationRunModel, connectDb } from "@hostelhub/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONITORED_QUEUES = [
  "allocation-jobs",
  "notification-events",
  "simulation-jobs",
  "report-jobs",
  "letters-jobs",
  "audit-verifier",
] as const;

export interface QueueJobCounts {
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
}

export interface MetricsPayload {
  queues: Record<string, QueueJobCounts>;
  runs: {
    totalCompleted: number;
    lastDurationSeconds: number | null;
    avgDurationSeconds: number | null;
  };
  timestamp: string;
}

export async function collectMetrics(): Promise<MetricsPayload> {
  const redis = getRedis();
  const queueMetrics: Record<string, QueueJobCounts> = {};

  if (redis) {
    await Promise.all(
      MONITORED_QUEUES.map(async (queueName) => {
        try {
          const q = new Queue(queueName, { connection: redis });
          const counts = await q.getJobCounts(
            "waiting",
            "active",
            "delayed",
            "failed",
            "completed",
          );
          queueMetrics[queueName] = {
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            delayed: counts.delayed ?? 0,
            failed: counts.failed ?? 0,
            completed: counts.completed ?? 0,
          };
          await q.close();
        } catch {
          queueMetrics[queueName] = {
            waiting: 0,
            active: 0,
            delayed: 0,
            failed: 0,
            completed: 0,
          };
        }
      }),
    );
  } else {
    for (const q of MONITORED_QUEUES) {
      queueMetrics[q] = { waiting: 0, active: 0, delayed: 0, failed: 0, completed: 0 };
    }
  }

  // Collect run durations from database
  let totalCompleted = 0;
  let lastDurationSeconds: number | null = null;
  let avgDurationSeconds: number | null = null;

  try {
    await connectDb();
    const completedRuns = await AllocationRunModel.find({ status: "completed" })
      .sort({ completed_at: -1 })
      .limit(100)
      .select("started_at completed_at")
      .lean();

    totalCompleted = completedRuns.length;
    if (completedRuns.length > 0) {
      const durations = completedRuns
        .filter((r) => r.started_at && r.completed_at)
        .map(
          (r) => (new Date(r.completed_at!).getTime() - new Date(r.started_at!).getTime()) / 1000,
        );

      if (durations.length > 0) {
        const first = durations[0];
        if (first !== undefined) {
          lastDurationSeconds = Math.round(first * 100) / 100;
        }
        const sum = durations.reduce((acc, d) => acc + d, 0);
        avgDurationSeconds = Math.round((sum / durations.length) * 100) / 100;
      }
    }
  } catch {
    // Gracefully handle DB offline during metrics scrape
  }

  return {
    queues: queueMetrics,
    runs: {
      totalCompleted,
      lastDurationSeconds,
      avgDurationSeconds,
    },
    timestamp: new Date().toISOString(),
  };
}

export function formatPrometheus(metrics: MetricsPayload): string {
  const lines: string[] = [
    "# HELP hostelhub_queue_jobs_count Current count of jobs in BullMQ queues by state",
    "# TYPE hostelhub_queue_jobs_count gauge",
  ];

  for (const [queue, counts] of Object.entries(metrics.queues)) {
    for (const [state, count] of Object.entries(counts)) {
      lines.push(`hostelhub_queue_jobs_count{queue="${queue}",state="${state}"} ${count}`);
    }
  }

  lines.push(
    "# HELP hostelhub_allocation_runs_total Total completed allocation runs",
    "# TYPE hostelhub_allocation_runs_total counter",
    `hostelhub_allocation_runs_total ${metrics.runs.totalCompleted}`,
  );

  if (metrics.runs.lastDurationSeconds !== null) {
    lines.push(
      "# HELP hostelhub_allocation_run_duration_seconds Duration of allocation runs in seconds",
      "# TYPE hostelhub_allocation_run_duration_seconds gauge",
      `hostelhub_allocation_run_duration_seconds{quantile="last"} ${metrics.runs.lastDurationSeconds}`,
    );
  }

  if (metrics.runs.avgDurationSeconds !== null) {
    lines.push(
      `hostelhub_allocation_run_duration_seconds{quantile="avg"} ${metrics.runs.avgDurationSeconds}`,
    );
  }

  return lines.join("\n") + "\n";
}

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
