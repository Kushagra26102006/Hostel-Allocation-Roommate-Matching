import type { Request, Response } from "express";
import { z } from "zod";
import { RoomChangeService } from "./room-change.service.js";
import { sendSuccess, sendCreated } from "../../common/utils/response.js";

export const createRoomChangeSchema = z.object({
  currentBedId: z.string(),
  reason: z.string().min(5),
  preferredHostelId: z.string().optional(),
  preferredRoomType: z.string().optional(),
});

export const decideRoomChangeSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  newBedId: z.string().optional(),
  notes: z.string().default("Decided by warden"),
});

export class RoomChangeController {
  public static async listRoomChanges(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const status = req.query.status as string | undefined;
    const studentId =
      req.user?.role === "student" ? req.user.userId : (req.query.studentId as string | undefined);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const cursor = req.query.cursor as string | undefined;

    const result = await RoomChangeService.listRoomChanges(institutionId, {
      status,
      studentId,
      limit,
      cursor,
    });
    sendSuccess(res, result.items, 200, {
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      total: result.total,
    });
  }

  public static async createRoomChange(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const studentId = req.user!.userId;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };

    const request = await RoomChangeService.createRoomChangeRequest(
      institutionId,
      studentId,
      req.body,
      actor,
    );
    sendCreated(res, request);
  }

  public static async decideRoomChange(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const requestId = req.params.id as string;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };

    const result = await RoomChangeService.decideRoomChange(
      institutionId,
      requestId,
      req.body,
      actor,
    );
    sendSuccess(res, result);
  }
}
