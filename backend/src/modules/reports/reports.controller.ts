import type { Request, Response } from "express";
import { ReportsService } from "./reports.service.js";
import { sendSuccess } from "../../common/utils/response.js";

export class ReportsController {
  public static async getOccupancy(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const cycleId = req.query.cycleId as string | undefined;
    const report = await ReportsService.getOccupancyReport(institutionId, cycleId);
    sendSuccess(res, report);
  }

  public static async getSatisfaction(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const cycleId = req.query.cycleId as string | undefined;
    const report = await ReportsService.getSatisfactionReport(institutionId, cycleId);
    sendSuccess(res, report);
  }

  public static async getOverrides(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const draftId = req.query.draftId as string | undefined;
    const report = await ReportsService.getOverridesReport(institutionId, draftId);
    sendSuccess(res, report);
  }

  public static async getWaitlist(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const cycleId = req.query.cycleId as string | undefined;
    const report = await ReportsService.getWaitlistMovementReport(institutionId, cycleId);
    sendSuccess(res, report);
  }

  public static async getFairness(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const cycleId = req.query.cycleId as string | undefined;
    const report = await ReportsService.getFairnessReport(institutionId, cycleId);
    sendSuccess(res, report);
  }

  public static async getCycleTime(req: Request, res: Response): Promise<void> {
    const institutionId = req.institutionId!;
    const report = await ReportsService.getCycleTimeReport(institutionId);
    sendSuccess(res, report);
  }
}
