import type { Request, Response } from "express";
import { z } from "zod";
import { NotificationsService } from "./notifications.service.js";
import { sendSuccess } from "../../common/utils/response.js";

export const updatePrefsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
});

export class NotificationsController {
  public static async listNotifications(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const userId = req.user!.userId;
    const unreadOnly = req.query.unreadOnly === "true";
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const cursor = req.query.cursor as string | undefined;

    const result = await NotificationsService.listNotifications(institutionId, userId, {
      unreadOnly,
      limit,
      cursor,
    });
    sendSuccess(res, result.items, 200, {
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      total: result.total,
    });
  }

  public static async markAsRead(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const userId = req.user!.userId;
    const notificationId = req.params.id as string;

    const notif = await NotificationsService.markAsRead(institutionId, notificationId, userId);
    sendSuccess(res, notif);
  }

  public static async getPreferences(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const userId = req.user!.userId;
    const prefs = await NotificationsService.getPreferences(institutionId, userId);
    sendSuccess(res, prefs);
  }

  public static async updatePreferences(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const userId = req.user!.userId;
    const prefs = await NotificationsService.updatePreferences(institutionId, userId, req.body);
    sendSuccess(res, prefs);
  }
}
