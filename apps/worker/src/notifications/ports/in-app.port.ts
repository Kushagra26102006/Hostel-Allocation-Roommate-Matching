/**
 * @hostelhub/worker — In-App Port
 * Persists in-app notification to MongoDB and publishes real-time SSE event to Redis.
 */

import type { Redis } from "ioredis";
import { NotificationService, type NotificationDocument } from "@hostelhub/db";
import { getUserNotificationChannel, createLogger } from "@hostelhub/shared";
import type { NotificationEventType, NotificationPriority } from "@hostelhub/domain";

const log = createLogger("in-app-port");

export interface SendInAppOptions {
  userId: string;
  institutionId: string;
  eventId: string;
  eventType: NotificationEventType;
  title: string;
  message: string;
  deepLink: string;
  priority?: NotificationPriority | undefined;
}

export interface InAppDeliveryResult {
  success: boolean;
  notificationId?: string | undefined;
  error?: string | undefined;
}

export class InAppPort {
  constructor(private readonly redis: Redis) {}

  async send(options: SendInAppOptions): Promise<InAppDeliveryResult> {
    try {
      // 1. Persist to MongoDB
      const doc: NotificationDocument = await NotificationService.createInAppNotification({
        userId: options.userId,
        institutionId: options.institutionId,
        eventId: options.eventId,
        eventType: options.eventType,
        title: options.title,
        message: options.message,
        deepLink: options.deepLink,
        priority: options.priority,
      });

      // 2. Publish real-time SSE event to user channel
      const channel = getUserNotificationChannel(options.userId);
      const unreadCount = await NotificationService.getUnreadCount(options.userId);

      const ssePayload = JSON.stringify({
        type: "notification",
        notification: {
          id: String(doc._id),
          title: doc.title,
          message: doc.message,
          deepLink: doc.deep_link,
          eventType: doc.event_type,
          category: doc.category,
          priority: doc.priority,
          read: doc.read,
          createdAt: doc.created_at,
        },
        unreadCount,
      });

      await this.redis.publish(channel, ssePayload);
      log.info(
        { userId: options.userId, notificationId: doc._id },
        "In-app notification saved and published via SSE",
      );

      return {
        success: true,
        notificationId: String(doc._id),
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error({ err, userId: options.userId }, "Failed to deliver in-app notification");
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}
