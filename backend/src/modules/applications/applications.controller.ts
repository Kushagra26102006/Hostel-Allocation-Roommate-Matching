import type { Request, Response } from "express";
import { z } from "zod";
import { ApplicationsService } from "./applications.service.js";
import { sendSuccess, sendCreated } from "../../common/utils/response.js";
import { assertStudentOwner } from "../../common/middleware/rbac.middleware.js";

export const createApplicationSchema = z.object({
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  academicYear: z.coerce.number().int().min(1).max(10),
  gpa: z.coerce.number().min(0).max(4.0).optional(),
  homeDistanceKm: z.coerce.number().min(0).optional(),
  disability: z.boolean().optional(),
});

export const updateApplicationSchema = z.object({
  status: z
    .enum(["DRAFT", "SUBMITTED", "VERIFIED", "REJECTED", "ALLOCATED", "WAITLISTED", "CANCELLED"])
    .optional(),
  applicantSnapshot: z.record(z.unknown()).optional(),
});

export const uploadDocumentSchema = z.object({
  documentType: z.string().min(2),
  fileUrl: z.string().url(),
  fileName: z.string().min(1),
});

export const verifyDocumentSchema = z.object({
  documentId: z.string(),
  status: z.enum(["VERIFIED", "REJECTED"]),
  notes: z.string().default("Verified by warden"),
});

export const setPreferencesSchema = z.object({
  preferences: z.array(
    z.object({
      hostelId: z.string(),
      roomTypePreference: z.string().optional(),
    }),
  ),
});

export const questionnaireSchema = z.object({
  answers: z.record(z.unknown()),
});

export class ApplicationsController {
  public static async listCycleApplications(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const cycleId = req.params.id as string;
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const cursor = req.query.cursor as string | undefined;

    const result = await ApplicationsService.listApplications(institutionId, cycleId, {
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

  public static async getApplicationById(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const app = await ApplicationsService.getApplicationById(
      institutionId,
      req.params.id as string,
    );
    if (req.user?.role === "student") {
      assertStudentOwner(req, app.student_id.toString());
    }
    sendSuccess(res, app);
  }

  public static async getStudentActiveApplication(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const studentId = req.user!.userId;
    const app = await ApplicationsService.getStudentActiveApplication(institutionId, studentId);
    sendSuccess(res, app);
  }

  public static async createApplication(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const cycleId = req.params.id as string;
    const studentId = req.user!.userId;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };

    const app = await ApplicationsService.createApplication(
      institutionId,
      cycleId,
      studentId,
      req.body,
      actor,
    );
    sendCreated(res, app);
  }

  public static async updateApplication(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const app = await ApplicationsService.updateApplication(
      institutionId,
      req.params.id as string,
      req.body,
      actor,
    );
    sendSuccess(res, app);
  }

  public static async uploadDocument(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const applicationId = req.params.id as string;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const doc = await ApplicationsService.uploadDocument(
      institutionId,
      applicationId,
      req.body.documentType,
      req.body.fileUrl,
      req.body.fileName,
      actor,
    );
    sendCreated(res, doc);
  }

  public static async verifyDocument(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const applicationId = req.params.id as string;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const doc = await ApplicationsService.verifyDocument(
      institutionId,
      applicationId,
      req.body.documentId,
      req.body.status,
      req.body.notes,
      actor,
    );
    sendSuccess(res, doc);
  }

  public static async getEligibility(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const applicationId = req.params.id as string;
    const eligibility = await ApplicationsService.evaluateEligibility(institutionId, applicationId);
    sendSuccess(res, eligibility);
  }

  public static async setPreferences(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const applicationId = req.params.id as string;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const result = await ApplicationsService.setPreferences(
      institutionId,
      applicationId,
      req.body.preferences,
      actor,
    );
    sendSuccess(res, result);
  }

  // Questionnaire & Consents
  public static async saveQuestionnaire(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const userId = req.user!.userId;
    const result = await ApplicationsService.saveQuestionnaire(
      institutionId,
      userId,
      req.body.answers,
    );
    sendSuccess(res, result);
  }

  public static async getQuestionnaire(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const userId = req.user!.userId;
    const answers = await ApplicationsService.getQuestionnaire(institutionId, userId);
    sendSuccess(res, answers);
  }

  public static async deleteQuestionnaire(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const userId = req.user!.userId;
    const result = await ApplicationsService.deleteQuestionnaire(institutionId, userId);
    sendSuccess(res, result);
  }

  public static async grantConsent(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const userId = req.user!.userId;
    const purpose = req.params.purpose as string;
    const record = await ApplicationsService.recordConsent(institutionId, userId, purpose, true);
    sendSuccess(res, record);
  }

  public static async revokeConsent(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const userId = req.user!.userId;
    const purpose = req.params.purpose as string;
    const record = await ApplicationsService.withdrawConsent(institutionId, userId, purpose);
    sendSuccess(res, record);
  }
}
