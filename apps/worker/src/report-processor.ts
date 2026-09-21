/**
 * @hostelhub/worker — report-processor.ts
 *
 * BullMQ processor for:
 * 1. Asynchronous long-running report generation with in-app/push notification when ready.
 * 2. Weekly scheduled executive PDF digest for Dean and Chief Warden (cron: 0 8 * * 1).
 */

import { Worker, Queue, type Job } from "bullmq";
import type { Redis } from "ioredis";
import { ReportService, NotificationService, UserModel, InstitutionModel } from "@hostelhub/db";
import {
  createLogger,
  REPORTS_QUEUE_NAME,
  REPORTS_SCHEDULED_QUEUE_NAME,
  NOTIFICATIONS_QUEUE_NAME,
  type ReportJobPayload,
  type ScheduledSummaryPayload,
} from "@hostelhub/shared";

const log = createLogger("report-worker");

export function createReportsQueue(redis: Redis): Queue<ReportJobPayload> {
  return new Queue<ReportJobPayload>(REPORTS_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  });
}

export function createScheduledSummaryQueue(redis: Redis): Queue<ScheduledSummaryPayload> {
  return new Queue<ScheduledSummaryPayload>(REPORTS_SCHEDULED_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 100 },
    },
  });
}

export function setupReportWorker(redis: Redis): {
  reportWorker: Worker<ReportJobPayload>;
  scheduledWorker: Worker<ScheduledSummaryPayload>;
  reportQueue: Queue<ReportJobPayload>;
  scheduledQueue: Queue<ScheduledSummaryPayload>;
} {
  const reportService = new ReportService();
  const reportQueue = createReportsQueue(redis);
  const scheduledQueue = createScheduledSummaryQueue(redis);
  const notificationsQueue = new Queue(NOTIFICATIONS_QUEUE_NAME, { connection: redis });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Long-Running Report Generation Worker
  // ──────────────────────────────────────────────────────────────────────────
  const reportWorker = new Worker<ReportJobPayload>(
    REPORTS_QUEUE_NAME,
    async (job: Job<ReportJobPayload>) => {
      const { reportType, format, institutionId, cycleId, requestedByUserId } = job.data;
      log.info({ reportType, format, requestedByUserId }, "Starting async report generation");

      await job.updateProgress(20);

      // 1. Generate export
      const exportResult = await reportService.generateExport(reportType, format, institutionId, {
        cycleId,
      });

      await job.updateProgress(80);

      // 2. Notify requester that report is ready
      if (requestedByUserId) {
        const title = "Report Export Ready";
        const body = `Your ${reportType.replace(/_/g, " ")} (${format.toUpperCase()}) report is generated and ready for download.`;
        const deepLink = `/staff/reports?view=${reportType}`;

        try {
          await NotificationService.createInAppNotification({
            userId: requestedByUserId,
            institutionId,
            eventId: `report_${Date.now()}`,
            eventType: "allocation.published",
            title,
            message: body,
            deepLink,
            category: "system",
          });

          // Also publish to notifications queue for email delivery if configured
          await notificationsQueue.add("send", {
            userId: requestedByUserId,
            template: "report.ready",
            subject: title,
            payload: {
              reportType,
              format,
              filename: exportResult.filename,
              deepLink,
            },
          });
        } catch (notifErr) {
          log.warn({ notifErr }, "Failed to send report ready notification");
        }
      }

      await job.updateProgress(100);
      log.info({ reportType, format, filename: exportResult.filename }, "Async report completed");
      return { success: true, filename: exportResult.filename };
    },
    { connection: redis, concurrency: 2 },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Weekly Scheduled PDF Executive Digest (Dean & Chief Warden)
  // ──────────────────────────────────────────────────────────────────────────
  const scheduledWorker = new Worker<ScheduledSummaryPayload>(
    REPORTS_SCHEDULED_QUEUE_NAME,
    async (job: Job<ScheduledSummaryPayload>) => {
      log.info("Processing weekly executive reporting summary for Dean and Chief Warden");

      let institutions: Array<{ _id: unknown; name: string }> = [];
      if (job.data.institutionId) {
        const inst = await InstitutionModel.findById(job.data.institutionId).lean();
        if (inst) institutions = [{ _id: inst._id, name: inst.name }];
      } else {
        institutions = await InstitutionModel.find({}).lean();
      }

      for (const inst of institutions) {
        const instIdStr = String(inst._id);

        // Find Dean and Chief Warden users
        const recipients = await UserModel.find({
          institution_id: inst._id,
          roles: { $in: ["dean", "chief_warden"] },
        })
          .select("_id name email roles")
          .lean();

        if (recipients.length === 0) continue;

        // Generate Executive PDF Report (Fairness & Occupancy)
        const pdfOccupancy = await reportService.generateExport("occupancy", "pdf", instIdStr, {
          cycleId: job.data.cycleId,
        });

        const pdfFairness = await reportService.generateExport("fairness", "pdf", instIdStr, {
          cycleId: job.data.cycleId,
        });

        // Dispatch summary to each Dean and Chief Warden
        for (const recipient of recipients) {
          const title = "Weekly Executive Housing & Fairness Digest";
          const body = `Your weekly executive residential summary for ${inst.name} is ready. Occupancy, preference satisfaction, and fairness metrics have been audited.`;
          const deepLink = "/staff/reports";

          await NotificationService.createInAppNotification({
            userId: recipient._id.toString(),
            institutionId: instIdStr,
            eventId: `weekly_${instIdStr}_${Date.now()}`,
            eventType: "allocation.published",
            title,
            message: body,
            deepLink,
            category: "system",
          });

          await notificationsQueue.add("send", {
            userId: recipient._id.toString(),
            template: "executive.weekly_summary",
            subject: title,
            payload: {
              recipientName: recipient.name,
              institutionName: inst.name,
              occupancyFilename: pdfOccupancy.filename,
              fairnessFilename: pdfFairness.filename,
              deepLink,
            },
          });
        }
      }

      log.info("Weekly executive reporting summary dispatched to Dean and Chief Warden");
      return { success: true };
    },
    { connection: redis, concurrency: 1 },
  );

  // Register the weekly repeat schedule (every Monday at 08:00 AM)
  scheduledQueue
    .add(
      "weekly-summary",
      { institutionId: "" },
      {
        repeat: {
          pattern: "0 8 * * 1", // Monday at 8 AM
        },
        jobId: "weekly-executive-report-digest",
      },
    )
    .catch((err) => {
      log.warn({ err }, "Could not register repeatable weekly summary cron");
    });

  return {
    reportWorker,
    scheduledWorker,
    reportQueue,
    scheduledQueue,
  };
}
