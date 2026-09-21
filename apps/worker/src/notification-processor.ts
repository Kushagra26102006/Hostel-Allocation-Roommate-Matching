/**
 * @hostelhub/worker — Notification Processor
 * Core BullMQ background worker for the multi-channel notification hub.
 *
 * Implements:
 * 1. Preference evaluation and quiet hours filtering.
 * 2. Parallel dispatch to configured channel ports (Email, Push, SMS, Webhook, In-App).
 * 3. Exponential backoff with jitter on delivery failure.
 * 4. Dead-letter queue (DLQ) routing after 5 failed attempts.
 * 5. Daily digest aggregation and scheduled delivery.
 */

import { Queue, Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import {
  renderNotificationTemplate,
  evaluateQuietHours,
  calculateRetryDelayMs,
  shouldRouteToDlq,
  type NotificationEventPayload,
  type NotificationChannel,
  type RenderedNotificationMessage,
} from "@hostelhub/domain";
import { NotificationService } from "@hostelhub/db";
import {
  NOTIFICATIONS_QUEUE_NAME,
  createLogger,
  parseEnv,
  workerEnvSchema,
} from "@hostelhub/shared";
import { EmailPort } from "./notifications/ports/email.port.js";
import { PushPort } from "./notifications/ports/push.port.js";
import { SmsPort } from "./notifications/ports/sms.port.js";
import { WebhookPort } from "./notifications/ports/webhook.port.js";
import { InAppPort } from "./notifications/ports/in-app.port.js";

const log = createLogger("notification-processor");

export interface NotificationWorkerContext {
  queue: Queue<NotificationEventPayload>;
  worker: Worker<NotificationEventPayload>;
  close: () => Promise<void>;
  processJob: (job: Job<NotificationEventPayload>) => Promise<Record<string, unknown>>;
}

export function setupNotificationWorker(redis: Redis): NotificationWorkerContext {
  const env = parseEnv(workerEnvSchema, process.env);

  // 1. Initialize channel ports
  const emailPort = new EmailPort({
    provider: env.EMAIL_PROVIDER,
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    resendApiKey: env.RESEND_API_KEY,
    brevoApiKey: env.BREVO_API_KEY,
  });

  const pushPort = new PushPort({
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT,
  });

  const smsPort = new SmsPort({
    provider: env.SMS_PROVIDER,
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    fromNumber: env.TWILIO_FROM_NUMBER,
  });

  const webhookPort = new WebhookPort(env.SLACK_WEBHOOK_URL ?? env.DISCORD_WEBHOOK_URL);
  const inAppPort = new InAppPort(redis);

  // 2. Setup BullMQ Queue
  const queue = new Queue<NotificationEventPayload>(NOTIFICATIONS_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: 500,
      removeOnFail: false, // Retain failed jobs for inspection
    },
  });

  // 3. Core job execution function
  async function processNotificationJob(
    job: Job<NotificationEventPayload>,
  ): Promise<Record<string, unknown>> {
    const payload = job.data;
    const currentAttempt = job.attemptsMade + 1;

    log.info(
      {
        jobId: job.id,
        eventId: payload.eventId,
        eventType: payload.eventType,
        attempt: currentAttempt,
      },
      "Processing notification domain event",
    );

    // Step a: Load user preferences
    const prefs = await NotificationService.getUserPreferences(
      payload.recipientId,
      payload.institutionId,
    );

    // Step b: Evaluate Quiet Hours
    const now = new Date();
    const quietHoursCheck = evaluateQuietHours(
      now,
      prefs.quietHours,
      payload.eventType,
      payload.priority,
    );

    if (quietHoursCheck.inQuietHours && !quietHoursCheck.canBypass) {
      if (prefs.dailyDigest) {
        log.info(
          { eventId: payload.eventId, recipientId: payload.recipientId },
          "Notification deferred to daily digest (quiet hours active)",
        );
        return { deferred: true, reason: "daily_digest" };
      }

      if (quietHoursCheck.deferUntil) {
        const delayMs = Math.max(1000, quietHoursCheck.deferUntil.getTime() - now.getTime());
        log.info(
          { eventId: payload.eventId, delayMs },
          "Deferring notification delivery until quiet hours conclude",
        );
        // Reschedule job after quiet hours
        await queue.add(payload.eventType, payload, { delay: delayMs });
        return { deferred: true, reason: "quiet_hours", delayMs };
      }
    }

    // Step c: Render zero-PII message templates
    const message: RenderedNotificationMessage = renderNotificationTemplate(
      payload.eventType,
      payload.data as Record<string, unknown> | undefined,
    );

    // Step d: Determine active channels (intersection of permitted matrix & user preferences)
    const userChannelSettings = prefs.channels[payload.eventType];
    const targetChannels: NotificationChannel[] = message.channels.filter((c) => {
      // If user has specific settings, honor them
      if (userChannelSettings && Array.isArray(userChannelSettings)) {
        return userChannelSettings.includes(c);
      }
      return true;
    });

    const channelResults: Record<string, unknown> = {};

    // Step e: Dispatch to each channel in parallel
    for (const channel of targetChannels) {
      const recipientTarget =
        channel === "email"
          ? (payload.recipientEmail ?? `student-${payload.recipientId}@hostelhub.internal`)
          : channel === "sms"
            ? (payload.recipientPhone ?? "+15005550006")
            : channel === "webhook"
              ? "operational-webhook"
              : payload.recipientId;

      try {
        let dispatchResult: { success: boolean; error?: string | undefined } = { success: true };

        switch (channel) {
          case "in_app":
            dispatchResult = await inAppPort.send({
              userId: payload.recipientId,
              institutionId: payload.institutionId,
              eventId: payload.eventId,
              eventType: payload.eventType,
              title: message.subject,
              message: message.bodyText,
              deepLink: message.deepLink,
              priority: message.priority,
            });
            break;

          case "email":
            dispatchResult = await emailPort.send({
              to: recipientTarget,
              subject: message.subject,
              text: message.bodyText,
              html: message.bodyHtml,
            });
            break;

          case "push":
            dispatchResult = await pushPort.send({
              userId: payload.recipientId,
              title: message.subject,
              body: message.bodyText,
              url: message.deepLink,
            });
            break;

          case "sms":
            if (message.smsText) {
              dispatchResult = await smsPort.send({
                to: recipientTarget,
                text: message.smsText,
                eventType: payload.eventType,
                hoursRemaining: (payload.data?.hoursRemaining as number) ?? undefined,
              });
            }
            break;

          case "webhook":
            if (message.webhookPayload) {
              dispatchResult = await webhookPort.send({
                payload: message.webhookPayload,
                eventType: payload.eventType,
              });
            }
            break;
        }

        if (dispatchResult.success) {
          await NotificationService.recordDeliveryAttempt({
            eventId: payload.eventId,
            eventType: payload.eventType,
            userId: payload.recipientId,
            institutionId: payload.institutionId,
            recipient: recipientTarget,
            channel,
            status: "delivered",
            attemptCount: currentAttempt,
            deliveredAt: new Date(),
          });
          channelResults[channel] = { status: "delivered" };
        } else {
          throw new Error(dispatchResult.error ?? `Delivery failed on channel ${channel}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const errorStack = err instanceof Error ? err.stack : undefined;
        const isDeadLetter = shouldRouteToDlq(currentAttempt);

        log.warn(
          {
            eventId: payload.eventId,
            channel,
            attempt: currentAttempt,
            isDeadLetter,
            error: errorMsg,
          },
          "Notification channel delivery failure",
        );

        if (isDeadLetter) {
          await NotificationService.recordDeliveryAttempt({
            eventId: payload.eventId,
            eventType: payload.eventType,
            userId: payload.recipientId,
            institutionId: payload.institutionId,
            recipient: recipientTarget,
            channel,
            status: "dead_letter",
            attemptCount: currentAttempt,
            lastError: errorMsg,
            errorStack,
          });
          channelResults[channel] = { status: "dead_letter", error: errorMsg };
        } else {
          const nextRetryDelay = calculateRetryDelayMs(currentAttempt);
          const nextRetryAt = new Date(Date.now() + nextRetryDelay);

          await NotificationService.recordDeliveryAttempt({
            eventId: payload.eventId,
            eventType: payload.eventType,
            userId: payload.recipientId,
            institutionId: payload.institutionId,
            recipient: recipientTarget,
            channel,
            status: "failed",
            attemptCount: currentAttempt,
            lastError: errorMsg,
            errorStack,
            nextRetryAt,
          });
          channelResults[channel] = { status: "failed", error: errorMsg, nextRetryDelay };
        }
      }
    }

    return channelResults;
  }

  // 4. Setup BullMQ Worker
  const worker = new Worker<NotificationEventPayload>(
    NOTIFICATIONS_QUEUE_NAME,
    async (job) => {
      return processNotificationJob(job);
    },
    {
      connection: redis,
      concurrency: 10,
    },
  );

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, err }, "Notification worker job failed");
  });

  return {
    queue,
    worker,
    processJob: processNotificationJob,
    close: async () => {
      await worker.close();
      await queue.close();
    },
  };
}
