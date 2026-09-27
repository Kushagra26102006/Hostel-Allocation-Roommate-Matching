import type { Request, Response } from "express";
import { z } from "zod";
import { GroupsService } from "./groups.service.js";
import { sendSuccess, sendCreated } from "../../common/utils/response.js";

export const createGroupSchema = z.object({
  cycleId: z.string(),
  name: z.string().min(2),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
});

export class GroupsController {
  public static async listGroups(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const cycleId = req.query.cycleId as string | undefined;
    const groups = await GroupsService.listGroups(institutionId, cycleId);
    sendSuccess(res, groups);
  }

  public static async getMyGroup(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const studentId = req.user!.userId;
    const group = await GroupsService.getStudentGroup(institutionId, studentId);
    sendSuccess(res, group);
  }

  public static async createGroup(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const leaderId = req.user!.userId;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };

    const group = await GroupsService.createGroup(
      institutionId,
      req.body.cycleId,
      leaderId,
      req.body.name,
      actor,
    );
    sendCreated(res, group);
  }

  public static async inviteMember(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const leaderId = req.user!.userId;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };

    const group = await GroupsService.inviteMember(
      institutionId,
      req.params.id as string,
      leaderId,
      req.body.email,
      actor,
    );
    sendSuccess(res, group);
  }

  public static async acceptInvite(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const studentId = req.user!.userId;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };

    const group = await GroupsService.acceptInvite(
      institutionId,
      req.params.id as string,
      studentId,
      actor,
    );
    sendSuccess(res, group);
  }

  public static async leaveGroup(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const userId = req.user!.userId;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };

    const result = await GroupsService.leaveOrDissolveGroup(
      institutionId,
      req.params.id as string,
      userId,
      actor,
    );
    sendSuccess(res, result);
  }
}
