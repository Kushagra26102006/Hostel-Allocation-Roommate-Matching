import type { Request, Response } from "express";
import { z } from "zod";
import { CyclesService } from "./cycles.service.js";
import { sendSuccess, sendCreated } from "../../common/utils/response.js";

export const createCycleSchema = z.object({
  name: z.string().min(2),
  academicYear: z.string().min(4),
  term: z.string().min(1),
  timeline: z.object({
    applicationStartDate: z.string(),
    applicationEndDate: z.string(),
    allocationDate: z.string(),
    appealDeadline: z.string(),
  }),
  weights: z
    .object({
      wP: z.number().min(0).max(1),
      wC: z.number().min(0).max(1),
      wF: z.number().min(0).max(1),
      wD: z.number().min(0).max(1),
      wK: z.number().min(0).max(1),
    })
    .optional(),
});

export const updateCycleSchema = z.object({
  name: z.string().min(2).optional(),
  status: z
    .enum(["UPCOMING", "OPEN", "CLOSED", "ALLOCATING", "REVIEW", "PUBLISHED", "ARCHIVED"])
    .optional(),
  timeline: z
    .object({
      applicationStartDate: z.string().optional(),
      applicationEndDate: z.string().optional(),
      allocationDate: z.string().optional(),
      appealDeadline: z.string().optional(),
    })
    .optional(),
  version: z.number().optional(),
});

export class CyclesController {
  public static async listCycles(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const cycles = await CyclesService.listCycles(institutionId);
    sendSuccess(res, cycles);
  }

  public static async getCycleById(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const cycle = await CyclesService.getCycleById(institutionId, req.params.id as string);
    sendSuccess(res, cycle);
  }

  public static async createCycle(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const cycle = await CyclesService.createCycle(institutionId, req.body, actor);
    sendCreated(res, cycle);
  }

  public static async updateCycle(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const actor = { userId: req.user!.userId, email: req.user!.email, role: req.user!.role };
    const expectedVersion = req.expectedVersion;

    const cycle = await CyclesService.updateCycle(
      institutionId,
      req.params.id as string,
      { ...req.body, expectedVersion },
      actor,
    );
    sendSuccess(res, cycle);
  }
}
