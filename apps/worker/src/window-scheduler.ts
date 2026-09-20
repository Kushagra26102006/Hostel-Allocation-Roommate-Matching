import { Queue, Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import {
  AllocationCycleModel,
  AuditService,
  type AllocationCycleDocument,
} from "@hostelhub/db";
import { createLogger } from "@hostelhub/shared";

const log = createLogger("window-scheduler");

export const WINDOW_SCHEDULER_QUEUE_NAME = "allocation-cycle-window";

export interface NotificationReminderHookPayload {
  cycleId: string;
  institutionId: string;
  cycleName: string;
  windowClose: Date;
  hoursRemaining: number;
  type: "48h" | "6h";
}

/**
 * Notification hook for cycle closing reminders.
 * Logs and returns structured payload (can be wired to email/push notifications).
 */
export async function sendClosingReminderHook(
  cycle: AllocationCycleDocument,
  type: "48h" | "6h",
): Promise<NotificationReminderHookPayload> {
  const payload: NotificationReminderHookPayload = {
    cycleId: String(cycle._id),
    institutionId: String(cycle.institution_id),
    cycleName: cycle.name,
    windowClose: cycle.window_close,
    hoursRemaining: type === "48h" ? 48 : 6,
    type,
  };

  log.info(
    { payload },
    `[NOTIFICATION HOOK] Application cycle "${cycle.name}" closes in ${type}. Reminder sent.`,
  );

  return payload;
}

/**
 * Checks all active/scheduled cycles against current server clock and updates statuses or emits reminder notifications.
 * All status transitions are atomic and audited.
 */
export async function processCycleWindowCheck(): Promise<{
  opened: number;
  closed: number;
  remindersSent: number;
}> {
  const now = new Date();
  let opened = 0;
  let closed = 0;
  let remindersSent = 0;

  // 1. Scheduled -> Open (Atomic transition)
  const dueToOpen = await AllocationCycleModel.find({
    status: "scheduled",
    window_open: { $lte: now },
  });

  for (const candidate of dueToOpen) {
    const updated = await AllocationCycleModel.findOneAndUpdate(
      {
        _id: candidate._id,
        status: "scheduled",
        window_open: { $lte: now },
      },
      {
        $set: { status: "open" },
        $inc: { version: 1 },
      },
      { new: true },
    );

    if (updated) {
      opened++;
      log.info({ cycleId: updated._id, name: updated.name }, "Allocation cycle is now OPEN");

      try {
        await AuditService.append({
          institution_id: updated.institution_id,
          actor: { user_id: "system_worker", email: "worker@hostelhub.local", roles: ["system"] },
          action: "cycle:opened",
          target: { type: "AllocationCycle", id: String(updated._id) },
          before: { status: "scheduled" },
          after: { status: "open" },
        });
      } catch (auditErr) {
        log.error({ auditErr }, "Failed to write audit entry for cycle opening");
      }
    }
  }

  // 2. Open -> Closed (Atomic transition)
  const dueToClose = await AllocationCycleModel.find({
    status: "open",
    window_close: { $lte: now },
  });

  for (const candidate of dueToClose) {
    const updated = await AllocationCycleModel.findOneAndUpdate(
      {
        _id: candidate._id,
        status: "open",
        window_close: { $lte: now },
      },
      {
        $set: { status: "closed" },
        $inc: { version: 1 },
      },
      { new: true },
    );

    if (updated) {
      closed++;
      log.info({ cycleId: updated._id, name: updated.name }, "Allocation cycle is now CLOSED");

      try {
        await AuditService.append({
          institution_id: updated.institution_id,
          actor: { user_id: "system_worker", email: "worker@hostelhub.local", roles: ["system"] },
          action: "cycle:closed",
          target: { type: "AllocationCycle", id: String(updated._id) },
          before: { status: "open" },
          after: { status: "closed" },
        });
      } catch (auditErr) {
        log.error({ auditErr }, "Failed to write audit entry for cycle closing");
      }
    }
  }

  // 3. Reminders for 48h and 6h (Deduplicated with reminders_sent)
  const activeOpenCycles = await AllocationCycleModel.find({ status: "open" });

  for (const cycle of activeOpenCycles) {
    const msToClose = cycle.window_close.getTime() - now.getTime();
    const hoursToClose = msToClose / (1000 * 60 * 60);

    // 48h reminder: hoursToClose <= 48 and not yet sent
    if (hoursToClose <= 48 && hoursToClose > 6 && !cycle.reminders_sent?.["48h"]) {
      const updated = await AllocationCycleModel.findOneAndUpdate(
        {
          _id: cycle._id,
          "reminders_sent.48h": { $exists: false },
        },
        {
          $set: { "reminders_sent.48h": now },
        },
        { new: true },
      );

      if (updated) {
        await sendClosingReminderHook(updated, "48h");
        remindersSent++;
      }
    }
    // 6h reminder: hoursToClose <= 6 and not yet sent
    else if (hoursToClose <= 6 && hoursToClose > 0 && !cycle.reminders_sent?.["6h"]) {
      const updated = await AllocationCycleModel.findOneAndUpdate(
        {
          _id: cycle._id,
          "reminders_sent.6h": { $exists: false },
        },
        {
          $set: { "reminders_sent.6h": now },
        },
        { new: true },
      );

      if (updated) {
        await sendClosingReminderHook(updated, "6h");
        remindersSent++;
      }
    }
  }

  return { opened, closed, remindersSent };
}

/**
 * Initialize BullMQ Queue and Worker for window scheduling.
 */
export async function setupWindowScheduler(redisConnection: Redis) {
  const queue = new Queue(WINDOW_SCHEDULER_QUEUE_NAME, {
    connection: redisConnection,
  });

  // Schedule repeatable job every minute (properly awaited)
  try {
    await queue.add(
      "check-windows",
      {},
      {
        repeat: {
          pattern: "* * * * *",
        },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  } catch (err) {
    log.error({ err }, "Failed to register repeatable window check job");
  }

  const worker = new Worker<unknown, { opened: number; closed: number; remindersSent: number }>(
    WINDOW_SCHEDULER_QUEUE_NAME,
    async (_job: Job) => {
      log.info("Running scheduled cycle window check...");
      const result = await processCycleWindowCheck();
      log.info(result, "Cycle window check complete");
      return result;
    },
    {
      connection: redisConnection,
    },
  );

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, err }, "Window scheduler job failed");
  });

  return { queue, worker };
}
