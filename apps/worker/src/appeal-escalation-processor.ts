/**
 * @hostelhub/worker — appeal-escalation-processor.ts
 *
 * BullMQ repeatable job that runs every hour to check for overdue appeals.
 * When the SLA deadline is breached, automatically escalates from
 * warden_review → chief_warden_review and fires notification events.
 */

import { Worker, Queue } from "bullmq";
import type { Redis } from "ioredis";
import { APPEAL_ESCALATION_QUEUE_NAME, NOTIFICATIONS_QUEUE_NAME } from "@hostelhub/shared";
import { AppealService } from "@hostelhub/db";

const ESCALATION_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour in ms

export function setupAppealEscalationWorker(redis: Redis): {
  worker: Worker;
  queue: Queue;
} {
  const queue = new Queue(APPEAL_ESCALATION_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });

  const notificationQueue = new Queue(NOTIFICATIONS_QUEUE_NAME, {
    connection: redis,
  });

  // Add repeatable job (runs every hour)
  void queue.add(
    "check-overdue-appeals",
    {},
    {
      repeat: {
        every: ESCALATION_CHECK_INTERVAL,
      },
      jobId: "appeal-escalation-cron",
    },
  );

  const worker = new Worker(
    APPEAL_ESCALATION_QUEUE_NAME,
    async () => {
      const appealService = new AppealService();
      const nowIso = new Date().toISOString();

      const escalationResults = await appealService.escalateOverdueAppeals(nowIso);

      if (escalationResults.length === 0) {
        return { escalated: 0 };
      }

      // Fire notification events for each escalated appeal
      for (const result of escalationResults) {
        // SLA breach notification to warden and admin
        await notificationQueue.add("sla.breached", {
          eventType: "sla.breached",
          recipientId: "warden", // Will be resolved by notification processor
          data: {
            appealId: result.appealId,
            reason: result.reason,
            escalatedAt: result.escalatedAt,
          },
          priority: "urgent",
        });

        // Appeal status change notification
        await notificationQueue.add("appeal.decided", {
          eventType: "appeal.decided",
          recipientId: result.appealId,
          data: {
            appealId: result.appealId,
            previousStatus: result.previousStatus,
            newStatus: result.newStatus,
            reason: "Auto-escalated due to SLA breach",
          },
        });
      }

      return { escalated: escalationResults.length, results: escalationResults };
    },
    {
      connection: redis,
      concurrency: 1, // Only one escalation check at a time
    },
  );

  worker.on("completed", (job) => {
    const val = job?.returnvalue as Record<string, number> | undefined;
    if (val && typeof val.escalated === "number" && val.escalated > 0) {
      console.log(`[APPEAL-ESCALATION] Escalated ${val.escalated} overdue appeals`);
    }
  });

  worker.on("failed", (job, err) => {
    console.error(`[APPEAL-ESCALATION] Job ${job?.id} failed:`, err.message);
  });

  return { worker, queue };
}
