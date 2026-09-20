import type { Job } from "bullmq";
import { Queue, Worker } from "bullmq";
import type { Redis } from "ioredis";
import { AllocationCycleModel, type AllocationCycleDocument } from "@hostelhub/db";
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

  // 1. Scheduled -> Open
  const dueToOpen = await AllocationCycleModel.find({
    status: "scheduled",
    window_open: { $lte: now },
  });

  for (const cycle of dueToOpen) {
    cycle.status = "open";
    await cycle.save();
    opened++;
    log.info({ cycleId: cycle._id, name: cycle.name }, "Allocation cycle is now OPEN");
  }

  // 2. Open -> Closed
  const dueToClose = await AllocationCycleModel.find({
    status: "open",
    window_close: { $lte: now },
  });

  for (const cycle of dueToClose) {
    cycle.status = "closed";
    await cycle.save();
    closed++;
    log.info({ cycleId: cycle._id, name: cycle.name }, "Allocation cycle is now CLOSED");
  }

  // 3. Reminders for 48h and 6h
  const activeOpenCycles = await AllocationCycleModel.find({ status: "open" });

  for (const cycle of activeOpenCycles) {
    const msToClose = cycle.window_close.getTime() - now.getTime();
    const hoursToClose = msToClose / (1000 * 60 * 60);

    // 48h reminder window: between 47 and 49 hours
    if (hoursToClose >= 47 && hoursToClose <= 49) {
      await sendClosingReminderHook(cycle, "48h");
      remindersSent++;
    }
    // 6h reminder window: between 5 and 7 hours
    else if (hoursToClose >= 5 && hoursToClose <= 7) {
      await sendClosingReminderHook(cycle, "6h");
      remindersSent++;
    }
  }

  return { opened, closed, remindersSent };
}

/**
 * Initialize BullMQ Queue and Worker for window scheduling.
 */
export function setupWindowScheduler(redisConnection: Redis) {
  const queue = new Queue(WINDOW_SCHEDULER_QUEUE_NAME, {
    connection: redisConnection,
  });

  // Schedule repeatable job every minute
  void queue.add(
    "check-windows",
    {},
    {
      repeat: {
        pattern: "* * * * *",
      } as any,
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );

  const worker = new Worker(
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
