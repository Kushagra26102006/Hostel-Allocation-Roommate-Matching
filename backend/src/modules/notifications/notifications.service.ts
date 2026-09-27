import { Types } from "mongoose";
import {
  NotificationModel,
  NotificationPreferenceModel,
  type NotificationDocument,
  type NotificationPreferenceDocument,
} from "@hostelhub/db";
import { NotFoundError } from "../../common/errors/app-error.js";
import { paginateArray, type PaginatedResult } from "../../common/pagination/index.js";

export class NotificationsService {
  public static async listNotifications(
    institutionId: string,
    userId: string,
    query: {
      unreadOnly?: boolean | undefined;
      limit?: number | undefined;
      cursor?: string | undefined;
    },
  ): Promise<PaginatedResult<NotificationDocument>> {
    const filter: Record<string, unknown> = {
      institution_id: new Types.ObjectId(institutionId),
      user_id: new Types.ObjectId(userId),
    };
    if (query.unreadOnly) filter.read = false;

    const notifications = await NotificationModel.find(filter)
      .sort({ created_at: -1 })
      .lean<NotificationDocument[]>();
    return paginateArray<NotificationDocument>(notifications, query.limit ?? 20, query.cursor);
  }

  public static async markAsRead(
    institutionId: string,
    notificationId: string,
    userId: string,
  ): Promise<NotificationDocument> {
    const notif = await NotificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        user_id: new Types.ObjectId(userId),
        institution_id: new Types.ObjectId(institutionId),
      },
      { read: true, read_at: new Date() },
      { new: true },
    );
    if (!notif) throw new NotFoundError("Notification not found", "NOTIFICATION_NOT_FOUND");
    return notif;
  }

  public static async getPreferences(
    institutionId: string,
    userId: string,
  ): Promise<NotificationPreferenceDocument> {
    const instId = new Types.ObjectId(institutionId);
    const userObjectId = new Types.ObjectId(userId);

    let prefs = await NotificationPreferenceModel.findOne({
      institution_id: instId,
      user_id: userObjectId,
    });
    if (!prefs) {
      prefs = await NotificationPreferenceModel.create({
        institution_id: instId,
        user_id: userObjectId,
        channels: [
          { event_type: "application_submitted", channels: ["email", "in_app"] },
          { event_type: "allocation_published", channels: ["email", "in_app"] },
        ],
        daily_digest: false,
      });
    }
    return prefs;
  }

  public static async updatePreferences(
    institutionId: string,
    userId: string,
    data: {
      emailEnabled?: boolean;
      smsEnabled?: boolean;
      inAppEnabled?: boolean;
      pushEnabled?: boolean;
    },
  ): Promise<NotificationPreferenceDocument | null> {
    const instId = new Types.ObjectId(institutionId);
    const userObjectId = new Types.ObjectId(userId);

    return NotificationPreferenceModel.findOneAndUpdate(
      { institution_id: instId, user_id: userObjectId },
      {
        institution_id: instId,
        user_id: userObjectId,
        channels: [
          {
            event_type: "all",
            channels: [
              ...(data.emailEnabled !== false ? ["email"] : []),
              ...(data.inAppEnabled !== false ? ["in_app"] : []),
              ...(data.smsEnabled ? ["sms"] : []),
              ...(data.pushEnabled ? ["push"] : []),
            ],
          },
        ],
      },
      { upsert: true, new: true },
    );
  }
}
