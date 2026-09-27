import type { Request, Response } from "express";
import { z } from "zod";
import { AppealsService } from "./appeals.service.js";
import { sendSuccess, sendCreated } from "../../common/utils/response.js";

export const createAppealSchema = z.object({
  cycleId: z.string(),
  reason: z.string().min(10),
  category: z.string().optional(),
  evidenceUrl: z.string().url().optional(),
});

export const decideAppealSchema = z.object({
  status: z.enum(["UPHELD", "DISMISSED"]),
  notes: z.string().min(3),
  newBedId: z.string().optional(),
});

export class AppealsController {
  public static async listAppeals(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const status = req.query.status as string | undefined;
    const studentId =
      req.user?.role === "student" ? req.user.userId : (req.query.studentId as string | undefined);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const cursor = req.query.cursor as string | undefined;

    const result = await AppealsService.listAppeals(institutionId, {
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

  public static async createAppeal(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const studentId = req.user!.userId;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };

    const appeal = await AppealsService.createAppeal(institutionId, studentId, req.body, actor);
    sendCreated(res, appeal);
  }

  public static async decideAppeal(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const appealId = req.params.id as string;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };

    const result = await AppealsService.decideAppeal(institutionId, appealId, req.body, actor);
    sendSuccess(res, result);
  }
}
