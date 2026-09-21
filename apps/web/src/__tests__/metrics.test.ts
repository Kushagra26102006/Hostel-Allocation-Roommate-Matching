import { describe, it, expect } from "vitest";
import { formatPrometheus, type MetricsPayload } from "../app/api/v1/metrics/route";

describe("Metrics Endpoint & Formatter", () => {
  const sampleMetrics: MetricsPayload = {
    queues: {
      "allocation-jobs": { waiting: 2, active: 1, delayed: 0, failed: 0, completed: 50 },
      "notification-events": { waiting: 0, active: 0, delayed: 0, failed: 1, completed: 100 },
      "simulation-jobs": { waiting: 0, active: 0, delayed: 0, failed: 0, completed: 5 },
      "report-jobs": { waiting: 0, active: 0, delayed: 0, failed: 0, completed: 12 },
      "letters-jobs": { waiting: 0, active: 0, delayed: 0, failed: 0, completed: 0 },
      "audit-verifier": { waiting: 0, active: 0, delayed: 0, failed: 0, completed: 1 },
    },
    runs: {
      totalCompleted: 50,
      lastDurationSeconds: 1.45,
      avgDurationSeconds: 2.12,
    },
    timestamp: "2026-09-21T18:00:00.000Z",
  };

  it("formats metrics according to Prometheus 0.0.4 text specifications", () => {
    const output = formatPrometheus(sampleMetrics);

    expect(output).toContain("# HELP hostelhub_queue_jobs_count");
    expect(output).toContain("# TYPE hostelhub_queue_jobs_count gauge");
    expect(output).toContain(
      'hostelhub_queue_jobs_count{queue="allocation-jobs",state="waiting"} 2',
    );
    expect(output).toContain(
      'hostelhub_queue_jobs_count{queue="allocation-jobs",state="active"} 1',
    );
    expect(output).toContain(
      'hostelhub_queue_jobs_count{queue="notification-events",state="failed"} 1',
    );
    expect(output).toContain("hostelhub_allocation_runs_total 50");
    expect(output).toContain('hostelhub_allocation_run_duration_seconds{quantile="last"} 1.45');
    expect(output).toContain('hostelhub_allocation_run_duration_seconds{quantile="avg"} 2.12');
  });

  it("handles null run durations gracefully in Prometheus output", () => {
    const noRunsMetrics: MetricsPayload = {
      ...sampleMetrics,
      runs: {
        totalCompleted: 0,
        lastDurationSeconds: null,
        avgDurationSeconds: null,
      },
    };

    const output = formatPrometheus(noRunsMetrics);
    expect(output).toContain("hostelhub_allocation_runs_total 0");
    expect(output).not.toContain('quantile="last"');
  });
});
