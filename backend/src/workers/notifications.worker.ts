import { Worker, Queue, type Job } from "bullmq";
import { Types } from "mongoose";
import { getRedisClient } from "../config/redis.js";
import { logger } from "../config/logger.js";
import { NotificationDeliveryModel, UserModel } from "@hostelhub/db";
import { getEmailAdapter } from "../adapters/email/index.js";
import { getSmsAdapter } from "../adapters/sms/index.js";

export const NOTIFICATIONS_QUEUE_NAME = "notifications-queue";

export interface NotificationJobPayload {
  notificationId: string;
  userId: string;
  institutionId: string;
  channel: "email" | "in_app" | "sms" | "push";
  title: string;
  body: string;
  link?: string | undefined;
}

export function createNotificationsQueue(): Queue<NotificationJobPayload> {
  const redis = getRedisClient();
  return new Queue<NotificationJobPayload>(NOTIFICATIONS_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    },
  });
}

export function startNotificationsWorker(): Worker<NotificationJobPayload> {
  const redis = getRedisClient();
  const emailAdapter = getEmailAdapter();
  const smsAdapter = getSmsAdapter();

  return new Worker<NotificationJobPayload>(
    NOTIFICATIONS_QUEUE_NAME,
    async (job: Job<NotificationJobPayload>) => {
      const { notificationId, userId, institutionId, channel, title, body, link } = job.data;
      logger.info({ notificationId, channel, userId }, "Processing notification delivery");

      const user = await UserModel.findById(userId);
      if (!user) throw new Error(`User ${userId} not found`);

      let deliveryStatus = "delivered";
      let errorMsg: string | undefined;

      try {
        if (channel === "email" && user.email) {
          const emailHtml = `
            <h2>${title}</h2>
            <p>${body}</p>
            ${link ? `<p><a href="${link}">View Details in HostelHub</a></p>` : ""}
            <hr />
            <small>HostelHub Notification Service</small>
          `;
          await emailAdapter.sendEmail({
            to: user.email,
            subject: `[HostelHub] ${title}`,
            html: emailHtml,
            text: `${title}\n\n${body}\n\n${link ?? ""}`,
          });
        } else if (channel === "sms") {
          await smsAdapter.sendSms({
            to: user.email,
            body: `HostelHub: ${title} - ${body}`,
          });
        }
      } catch (err: unknown) {
        deliveryStatus = "failed";
        errorMsg = err instanceof Error ? err.message : String(err);
        logger.error({ err, notificationId }, "Failed delivery attempt");
        throw err;
      } finally {
        await NotificationDeliveryModel.create({
          institution_id: new Types.ObjectId(institutionId),
          user_id: new Types.ObjectId(userId),
          event_id: notificationId || `evt-${Date.now()}`,
          event_type: "application_submitted",
          recipient: user.email,
          channel:
            channel === "push"
              ? "push"
              : channel === "sms"
                ? "sms"
                : channel === "email"
                  ? "email"
                  : "in_app",
          status: deliveryStatus,
          attempt_count: 1,
          delivered_at: deliveryStatus === "delivered" ? new Date() : undefined,
          last_error: errorMsg,
          payload: { title, body, link },
        });
      }
    },
    { connection: redis, concurrency: 10 },
  );
}
