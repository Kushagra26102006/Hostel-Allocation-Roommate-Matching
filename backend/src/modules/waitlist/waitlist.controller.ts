import type { Request, Response } from "express";
import { z } from "zod";
import { WaitlistService } from "./waitlist.service.js";
import { sendSuccess } from "../../common/utils/response.js";

export const promoteWaitlistSchema = z.object({
  targetBedId: z.string(),
});

export class WaitlistController {
  public static async listWaitlist(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const cycleId = req.query.cycleId as string | undefined;
    const quota = req.query.quota as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const cursor = req.query.cursor as string | undefined;

    const result = await WaitlistService.listWaitlist(institutionId, {
      cycleId,
      quota,
      status,
      limit,
      cursor,
    });
    sendSuccess(res, result.items, 200, {
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      total: result.total,
    });
  }

  public static async promote(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const waitlistId = req.params.id as string;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };

    const result = await WaitlistService.promoteWaitlistEntry(
      institutionId,
      waitlistId,
      req.body.targetBedId,
      actor,
    );
    sendSuccess(res, result);
  }
}
