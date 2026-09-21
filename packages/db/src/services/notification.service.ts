import { Types } from "mongoose";
import {
  DEFAULT_NOTIFICATION_MATRIX,
  NOTIFICATION_EVENT_TYPES,
  type NotificationEventType,
  type NotificationChannel,
  type NotificationPriority,
  type QuietHoursConfig,
  type DeliveryStatus,
} from "@hostelhub/domain";
import {
  NotificationModel,
  type NotificationDocument,
  type NotificationCategory,
} from "../models/notification.model.js";
import {
  NotificationPreferenceModel,
  type NotificationPreferenceDocument,
} from "../models/notification-preference.model.js";
import {
  NotificationDeliveryModel,
  type NotificationDeliveryDocument,
} from "../models/notification-delivery.model.js";
import {
  PushSubscriptionModel,
  type PushSubscriptionDocument,
} from "../models/push-subscription.model.js";

export interface CreateInAppNotificationParams {
  userId: string;
  institutionId: string;
  eventId: string;
  eventType: NotificationEventType;
  title: string;
  message: string;
  deepLink: string;
  category?: NotificationCategory | undefined;
  priority?: NotificationPriority | undefined;
}

export interface UserPreferencesDto {
  userId: string;
  institutionId: string;
  channels: Record<string, NotificationChannel[]>;
  quietHours: QuietHoursConfig;
  dailyDigest: boolean;
}

function toObjectId(id: string): Types.ObjectId {
  return Types.ObjectId.isValid(id)
    ? new Types.ObjectId(id)
    : new Types.ObjectId("000000000000000000000001");
}

export class NotificationService {
  /**
   * Creates an in-app notification record.
   */
  static async createInAppNotification(
    params: CreateInAppNotificationParams,
  ): Promise<NotificationDocument> {
    const category: NotificationCategory =
      params.category ??
      (params.eventType.startsWith("draft.") || params.eventType.startsWith("sla.")
        ? "warden"
        : params.eventType.startsWith("allocation.") || params.eventType.startsWith("waitlist.")
          ? "allocation"
          : params.eventType.startsWith("auditchain.")
            ? "system"
            : "application");

    const priority: NotificationPriority =
      params.priority ?? DEFAULT_NOTIFICATION_MATRIX[params.eventType]?.priority ?? "normal";

    const doc = await NotificationModel.create({
      user_id: toObjectId(params.userId),
      institution_id: toObjectId(params.institutionId),
      event_id: params.eventId,
      event_type: params.eventType,
      title: params.title,
      message: params.message,
      deep_link: params.deepLink,
      read: false,
      category,
      priority,
    });

    return doc;
  }

  /**
   * Retrieves paginated notifications for a user.
   */
  static async getUserNotifications(
    userId: string,
    options: {
      page?: number | undefined;
      limit?: number | undefined;
      unreadOnly?: boolean | undefined;
      category?: string | undefined;
    } = {},
  ): Promise<{
    notifications: NotificationDocument[];
    total: number;
    unreadCount: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(50, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      user_id: toObjectId(userId),
    };

    if (options.unreadOnly) {
      query.read = false;
    }
    if (options.category && options.category !== "all") {
      query.category = options.category;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      NotificationModel.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).exec(),
      NotificationModel.countDocuments(query).exec(),
      NotificationModel.countDocuments({
        user_id: toObjectId(userId),
        read: false,
      }).exec(),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves the unread notification count for a user.
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return NotificationModel.countDocuments({
      user_id: toObjectId(userId),
      read: false,
    }).exec();
  }

  /**
   * Marks a single notification as read.
   */
  static async markNotificationAsRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationDocument | null> {
    return NotificationModel.findOneAndUpdate(
      {
        _id: toObjectId(notificationId),
        user_id: toObjectId(userId),
      },
      {
        $set: {
          read: true,
          read_at: new Date(),
        },
      },
      { new: true },
    ).exec();
  }

  /**
   * Marks all notifications as read for a user.
   */
  static async markAllNotificationsAsRead(userId: string): Promise<number> {
    const result = await NotificationModel.updateMany(
      {
        user_id: toObjectId(userId),
        read: false,
      },
      {
        $set: {
          read: true,
          read_at: new Date(),
        },
      },
    ).exec();

    return result.modifiedCount;
  }

  /**
   * Retrieves user notification preferences, constructing defaults if none exist.
   */
  static async getUserPreferences(
    userId: string,
    institutionId: string,
  ): Promise<UserPreferencesDto> {
    const existing = (await NotificationPreferenceModel.findOne({
      user_id: toObjectId(userId),
    }).exec()) as NotificationPreferenceDocument | null;

    if (existing) {
      const channelsObj: Record<string, NotificationChannel[]> = {};
      if (Array.isArray(existing.channels)) {
        for (const item of existing.channels) {
          if (item?.event_type) {
            channelsObj[item.event_type] = item.channels;
          }
        }
      }

      // Ensure all event types have fallback to defaults if not customized
      for (const eventType of NOTIFICATION_EVENT_TYPES) {
        if (!channelsObj[eventType]) {
          channelsObj[eventType] = [...DEFAULT_NOTIFICATION_MATRIX[eventType].channels];
        }
      }

      return {
        userId: String(existing.user_id),
        institutionId: String(existing.institution_id),
        channels: channelsObj,
        quietHours: existing.quiet_hours ?? {
          enabled: false,
          start: "22:00",
          end: "07:00",
          timezone: "UTC",
        },
        dailyDigest: existing.daily_digest ?? false,
      };
    }

    // Default configuration derived from matrix
    const defaultChannels: Record<string, NotificationChannel[]> = {};
    for (const eventType of NOTIFICATION_EVENT_TYPES) {
      defaultChannels[eventType] = [...DEFAULT_NOTIFICATION_MATRIX[eventType].channels];
    }

    return {
      userId,
      institutionId,
      channels: defaultChannels,
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "07:00",
        timezone: "UTC",
      },
      dailyDigest: false,
    };
  }

  /**
   * Updates or creates user notification preferences.
   */
  static async updateUserPreferences(
    userId: string,
    institutionId: string,
    updates: {
      channels?: Record<string, NotificationChannel[]> | undefined;
      quietHours?: Partial<QuietHoursConfig> | undefined;
      dailyDigest?: boolean | undefined;
    },
  ): Promise<UserPreferencesDto> {
    const current = await this.getUserPreferences(userId, institutionId);

    const mergedChannels = updates.channels ? { ...updates.channels } : current.channels;
    const mergedQuietHours = updates.quietHours
      ? { ...current.quietHours, ...updates.quietHours }
      : current.quietHours;
    const mergedDailyDigest =
      updates.dailyDigest !== undefined ? updates.dailyDigest : current.dailyDigest;

    // Convert mergedChannels object to array format
    const channelsArray = Object.entries(mergedChannels).map(([event_type, channels]) => ({
      event_type,
      channels,
    }));

    await NotificationPreferenceModel.findOneAndUpdate(
      { user_id: toObjectId(userId) },
      {
        $set: {
          institution_id: toObjectId(institutionId),
          channels: channelsArray,
          quiet_hours: mergedQuietHours,
          daily_digest: mergedDailyDigest,
        },
      },
      { upsert: true, new: true },
    ).exec();

    return {
      userId,
      institutionId,
      channels: mergedChannels,
      quietHours: mergedQuietHours,
      dailyDigest: mergedDailyDigest,
    };
  }

  /**
   * Registers or updates a Web Push subscription.
   */
  static async savePushSubscription(
    userId: string,
    subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      userAgent?: string | undefined;
    },
  ): Promise<PushSubscriptionDocument> {
    const doc = await PushSubscriptionModel.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        $set: {
          user_id: toObjectId(userId),
          keys: subscription.keys,
          user_agent: subscription.userAgent,
        },
      },
      { upsert: true, new: true },
    ).exec();

    return doc as PushSubscriptionDocument;
  }

  /**
   * Retrieves all active push subscriptions for a user.
   */
  static async getUserPushSubscriptions(userId: string): Promise<PushSubscriptionDocument[]> {
    return PushSubscriptionModel.find({
      user_id: toObjectId(userId),
    }).exec();
  }

  /**
   * Deletes an expired or revoked push subscription.
   */
  static async deletePushSubscription(endpoint: string): Promise<boolean> {
    const res = await PushSubscriptionModel.deleteOne({ endpoint }).exec();
    return (res.deletedCount ?? 0) > 0;
  }

  /**
   * Records a notification delivery attempt or updates its status (e.g. failed, delivered, dead_letter).
   */
  static async recordDeliveryAttempt(params: {
    eventId: string;
    eventType: NotificationEventType;
    userId?: string | undefined;
    institutionId: string;
    recipient: string;
    channel: NotificationChannel;
    status: DeliveryStatus;
    attemptCount?: number | undefined;
    lastError?: string | undefined;
    errorStack?: string | undefined;
    nextRetryAt?: Date | undefined;
    deliveredAt?: Date | undefined;
    payload?: Record<string, unknown> | undefined;
  }): Promise<NotificationDeliveryDocument> {
    const filter = {
      event_id: params.eventId,
      channel: params.channel,
      recipient: params.recipient,
    };

    const update: Record<string, unknown> = {
      event_type: params.eventType,
      institution_id: toObjectId(params.institutionId),
      status: params.status,
      attempt_count: params.attemptCount ?? 1,
      last_error: params.lastError,
      error_stack: params.errorStack,
      next_retry_at: params.nextRetryAt,
      delivered_at: params.deliveredAt,
      payload: params.payload ?? {},
    };

    if (params.userId) {
      update.user_id = toObjectId(params.userId);
    }

    const doc = await NotificationDeliveryModel.findOneAndUpdate(
      filter,
      { $set: update },
      { upsert: true, new: true },
    ).exec();

    return doc as NotificationDeliveryDocument;
  }

  /**
   * Retrieves paginated Dead-Letter Queue (DLQ) entries.
   */
  static async getDlqEntries(
    options: {
      page?: number | undefined;
      limit?: number | undefined;
      channel?: string | undefined;
      eventType?: string | undefined;
    } = {},
  ): Promise<{
    entries: NotificationDeliveryDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(50, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { status: "dead_letter" };
    if (options.channel && options.channel !== "all") {
      query.channel = options.channel;
    }
    if (options.eventType && options.eventType !== "all") {
      query.event_type = options.eventType;
    }

    const [entries, total] = await Promise.all([
      NotificationDeliveryModel.find(query).sort({ updated_at: -1 }).skip(skip).limit(limit).exec(),
      NotificationDeliveryModel.countDocuments(query).exec(),
    ]);

    return {
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retries a single DLQ entry by resetting status to 'pending' and clearing errors.
   */
  static async retryDlqEntry(deliveryId: string): Promise<NotificationDeliveryDocument | null> {
    return NotificationDeliveryModel.findOneAndUpdate(
      {
        _id: toObjectId(deliveryId),
        status: "dead_letter",
      },
      {
        $set: {
          status: "pending",
          attempt_count: 1,
          next_retry_at: new Date(),
        },
        $unset: {
          last_error: 1,
          error_stack: 1,
        },
      },
      { new: true },
    ).exec();
  }

  /**
   * Retries all dead-letter entries.
   */
  static async retryAllDlq(): Promise<number> {
    const res = await NotificationDeliveryModel.updateMany(
      { status: "dead_letter" },
      {
        $set: {
          status: "pending",
          attempt_count: 1,
          next_retry_at: new Date(),
        },
        $unset: {
          last_error: 1,
          error_stack: 1,
        },
      },
    ).exec();

    return res.modifiedCount;
  }
}
