import type { Request, Response } from "express";
import { z } from "zod";
import { ReviewService } from "./review.service.js";
import { sendSuccess } from "../../common/utils/response.js";

export const overrideSchema = z.object({
  assignmentId: z.string(),
  newBedId: z.string(),
  reason: z.string().min(5),
  version: z.number().optional(),
});

export const approvalActionSchema = z.object({
  notes: z.string().default("Approved by Chief Warden"),
});

export class ReviewController {
  public static async getDraft(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const draft = await ReviewService.getDraftById(institutionId, req.params.id as string);
    sendSuccess(res, draft);
  }

  public static async listAssignments(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const draftId = req.params.id as string;
    const hostelId = req.query.hostelId as string | undefined;
    const studentId = req.query.studentId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const cursor = req.query.cursor as string | undefined;

    const result = await ReviewService.listDraftAssignments(institutionId, draftId, {
      hostelId,
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

  public static async getExplanation(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const assignmentId = req.params.id as string;
    const userRole = req.user!.role;

    const explanation = await ReviewService.getAssignmentExplanation(
      institutionId,
      assignmentId,
      userRole,
    );
    sendSuccess(res, explanation);
  }

  public static async overrideAssignment(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const draftId = req.params.id as string;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const expectedVersion = req.expectedVersion;

    const result = await ReviewService.applyOverride(
      institutionId,
      draftId,
      { ...req.body, expectedVersion },
      actor,
    );
    sendSuccess(res, result);
  }

  public static async submitReview(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const draftId = req.params.id as string;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };

    const result = await ReviewService.submitForReview(institutionId, draftId, actor);
    sendSuccess(res, result);
  }

  public static async approveDraft(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const draftId = req.params.id as string;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };

    const result = await ReviewService.approveDraft(institutionId, draftId, req.body.notes, actor);
    sendSuccess(res, result);
  }

  public static async requestChanges(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const draftId = req.params.id as string;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };

    const result = await ReviewService.requestChanges(
      institutionId,
      draftId,
      req.body.notes,
      actor,
    );
    sendSuccess(res, result);
  }
}
