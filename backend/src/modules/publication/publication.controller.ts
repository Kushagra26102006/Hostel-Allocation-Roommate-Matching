import type { Request, Response } from "express";
import { PublicationService } from "./publication.service.js";
import { sendSuccess } from "../../common/utils/response.js";

export class PublicationController {
  public static async publish(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const draftId = req.params.id as string;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };

    const result = await PublicationService.publishDraft(institutionId, draftId, actor);
    sendSuccess(res, result);
  }
}
