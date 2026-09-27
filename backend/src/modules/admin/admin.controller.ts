import type { Request, Response } from "express";
import { z } from "zod";
import { AdminService } from "./admin.service.js";
import { WebhooksService } from "../webhooks/webhooks.service.js";
import { sendSuccess, sendCreated } from "../../common/utils/response.js";

export const createApiKeySchema = z.object({
  name: z.string().min(2),
  scopes: z.array(z.string()).default(["read", "write"]),
  expiresAt: z.string().optional(),
});

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().optional(),
});

export class AdminController {
  // API Keys
  public static async listApiKeys(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const keys = await AdminService.listApiKeys(institutionId);
    sendSuccess(res, keys);
  }

  public static async createApiKey(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const result = await AdminService.createApiKey(institutionId, req.body, actor);
    sendCreated(res, result);
  }

  public static async deleteApiKey(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const result = await AdminService.deleteApiKey(institutionId, req.params.id as string, actor);
    sendSuccess(res, result);
  }

  // Webhooks
  public static async listWebhooks(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const webhooks = await WebhooksService.listWebhooks(institutionId);
    sendSuccess(res, webhooks);
  }

  public static async createWebhook(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const webhook = await WebhooksService.registerWebhook(institutionId, req.body, actor);
    sendCreated(res, webhook);
  }

  public static async deleteWebhook(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const result = await WebhooksService.deleteWebhook(
      institutionId,
      req.params.id as string,
      actor,
    );
    sendSuccess(res, result);
  }
}
