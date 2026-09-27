import type { Request, Response } from "express";
import { AuditService } from "./audit.service.js";
import { sendSuccess } from "../../common/utils/response.js";

export class AuditController {
  public static async getAuditLogs(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const cursor = req.query.cursor as string | undefined;
    const action = req.query.action as string | undefined;
    const resourceType = req.query.resourceType as string | undefined;

    const result = await AuditService.listEntries(institutionId, {
      limit,
      cursor,
      action,
      resourceType,
    });

    sendSuccess(res, result.items, 200, {
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      total: result.total,
    });
  }
}
