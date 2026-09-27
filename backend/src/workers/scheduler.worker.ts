import { Worker, Queue, type Job } from "bullmq";
import { getRedisClient } from "../config/redis.js";
import { logger } from "../config/logger.js";
import { AllocationCycleModel, AppealModel, InstitutionModel } from "@hostelhub/db";
import { createAuditQueue } from "./audit.worker.js";

export const SCHEDULER_QUEUE_NAME = "scheduler-queue";

export interface SchedulerJobPayload {
  task: "check_windows" | "escalate_appeals" | "audit_check";
}

export function createSchedulerQueue(): Queue<SchedulerJobPayload> {
  const redis = getRedisClient();
  return new Queue<SchedulerJobPayload>(SCHEDULER_QUEUE_NAME, {
    connection: redis,
  });
}

export function startSchedulerWorker(): Worker<SchedulerJobPayload> {
  const redis = getRedisClient();
  const auditQueue = createAuditQueue();

  return new Worker<SchedulerJobPayload>(
    SCHEDULER_QUEUE_NAME,
    async (job: Job<SchedulerJobPayload>) => {
      const now = new Date();
      logger.info({ task: job.data.task }, "Running scheduler worker task");

      if (job.data.task === "check_windows") {
        const toOpen = await AllocationCycleModel.find({
          status: "scheduled",
          window_open: { $lte: now },
        });
        for (const cycle of toOpen) {
          cycle.status = "open";
          await cycle.save();
          logger.info({ cycleId: cycle._id }, "Cycle status auto-transitioned to open");
        }

        const toClose = await AllocationCycleModel.find({
          status: "open",
          window_close: { $lte: now },
        });
        for (const cycle of toClose) {
          cycle.status = "closed";
          await cycle.save();
          logger.info({ cycleId: cycle._id }, "Cycle status auto-transitioned to closed");
        }
      } else if (job.data.task === "escalate_appeals") {
        const expiredAppeals = await AppealModel.find({
          status: "warden_review",
          sla_due_at: { $lte: now },
        });
        for (const appeal of expiredAppeals) {
          appeal.status = "chief_warden_review";
          appeal.current_reviewer_role = "chief_warden";
          appeal.escalated_at = new Date();
          appeal.escalation_reason = "SLA expired for warden review";
          await appeal.save();
          logger.info(
            { appealId: appeal._id },
            "Appeal auto-escalated to chief warden due to SLA timeout",
          );
        }
      } else if (job.data.task === "audit_check") {
        const institutions = await InstitutionModel.find();
        for (const inst of institutions) {
          await auditQueue.add(`audit-${inst._id}-${Date.now()}`, {
            institutionId: inst._id.toString(),
          });
        }
      }
    },
    { connection: redis, concurrency: 1 },
  );
}
