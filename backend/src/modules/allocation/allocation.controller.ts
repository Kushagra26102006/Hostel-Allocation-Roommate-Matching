import type { Request, Response } from "express";
import { z } from "zod";
import { AllocationService } from "./allocation.service.js";
import { sendSuccess, sendCreated } from "../../common/utils/response.js";
import { getRedisClient } from "../../config/redis.js";
import { getAllocationEventChannel } from "@hostelhub/shared";
import { logger } from "../../config/logger.js";

export const allocateSchema = z.object({
  dryRun: z.boolean().optional(),
  weightsVersionId: z.string().optional(),
});

export class AllocationController {
  public static async allocate(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const cycleId = req.params.id as string;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };

    const run = await AllocationService.triggerAllocation(institutionId, cycleId, req.body, actor);
    sendCreated(res, run);
  }

  public static async getRun(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const run = await AllocationService.getRunById(institutionId, req.params.id as string);
    sendSuccess(res, run);
  }

  public static async cancelRun(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const result = await AllocationService.cancelRun(institutionId, req.params.id as string, actor);
    sendSuccess(res, result);
  }

  // SSE Live Event Stream (Section 22)
  public static async streamEvents(req: Request, res: Response): Promise<void> {
    const runId = req.params.id as string;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const channel = getAllocationEventChannel(runId);
    const subRedis = getRedisClient().duplicate();
    await subRedis.connect().catch(() => {});

    // Send initial connection event
    res.write(
      `event: connected\ndata: ${JSON.stringify({ runId, connectedAt: new Date().toISOString() })}\n\n`,
    );

    const messageHandler = (ch: string, message: string) => {
      if (ch === channel) {
        res.write(`event: progress\ndata: ${message}\n\n`);
      }
    };

    subRedis.on("message", messageHandler);
    await subRedis.subscribe(channel);

    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 15000);

    req.on("close", async () => {
      clearInterval(heartbeat);
      subRedis.removeListener("message", messageHandler);
      await subRedis.unsubscribe(channel).catch(() => {});
      await subRedis.quit().catch(() => {});
      logger.info({ runId }, "SSE connection closed by client");
    });
  }
}
