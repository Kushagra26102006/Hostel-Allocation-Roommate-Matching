import type { Request, Response } from "express";
import { z } from "zod";
import { UsersService } from "./users.service.js";
import { sendSuccess, sendCreated } from "../../common/utils/response.js";

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(["student", "warden", "chief_warden", "hostel_admin", "dean", "sys_admin"]),
  password: z.string().min(6).optional(),
  assignedHostelId: z.string().optional().nullable(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z
    .enum(["student", "warden", "chief_warden", "hostel_admin", "dean", "sys_admin"])
    .optional(),
  isActive: z.boolean().optional(),
  assignedHostelId: z.string().optional().nullable(),
});

export class UsersController {
  public static async listUsers(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const cursor = req.query.cursor as string | undefined;
    const role = req.query.role as string | undefined;

    const result = await UsersService.listUsers(institutionId, { role, limit, cursor });
    sendSuccess(res, result.items, 200, {
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      total: result.total,
    });
  }

  public static async getUserById(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const user = await UsersService.getUserById(institutionId, req.params.id as string);
    sendSuccess(res, user);
  }

  public static async createUser(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const actor = {
      userId: req.user!.userId,
      email: req.user!.email,
      role: req.user!.role,
    };
    const user = await UsersService.createUser(institutionId, req.body, actor);
    sendCreated(res, user);
  }

  public static async updateUser(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const actor = {
      userId: req.user!.userId,
      email: req.user!.email,
      role: req.user!.role,
    };
    const user = await UsersService.updateUser(
      institutionId,
      req.params.id as string,
      req.body,
      actor,
    );
    sendSuccess(res, user);
  }
}
