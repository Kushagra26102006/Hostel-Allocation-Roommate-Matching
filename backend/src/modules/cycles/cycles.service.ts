import { Types } from "mongoose";
import {
  AllocationCycleModel,
  type AllocationCycleStatus,
  type IAllocationCycle,
  type AllocationCycleDocument,
} from "@hostelhub/db";
import { NotFoundError } from "../../common/errors/app-error.js";
import { AuditService } from "../audit/audit.service.js";
import { checkVersionConflict } from "../../common/middleware/concurrency.middleware.js";

export class CyclesService {
  public static async listCycles(institutionId: string): Promise<IAllocationCycle[]> {
    return AllocationCycleModel.find({ institution_id: new Types.ObjectId(institutionId) })
      .sort({ createdAt: -1 })
      .lean<IAllocationCycle[]>();
  }

  public static async getCycleById(
    institutionId: string,
    cycleId: string,
  ): Promise<AllocationCycleDocument> {
    const cycle = await AllocationCycleModel.findOne({
      _id: new Types.ObjectId(cycleId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!cycle) {
      throw new NotFoundError("Allocation cycle not found", "CYCLE_NOT_FOUND");
    }
    return cycle;
  }

  public static async createCycle(
    institutionId: string,
    data: {
      name: string;
      academicYear: string;
      term?: string;
      timeline: {
        applicationStartDate: string | Date;
        applicationEndDate: string | Date;
        allocationDate?: string | Date;
        appealDeadline?: string | Date;
      };
      quotaBuckets?: Array<{ name: string; capacity: number }>;
    },
    actor: { userId: string; email: string; role: string },
  ): Promise<AllocationCycleDocument> {
    const cycle = await AllocationCycleModel.create({
      institution_id: new Types.ObjectId(institutionId),
      name: data.name,
      academic_year: data.academicYear,
      status: "open",
      window_open: new Date(data.timeline.applicationStartDate),
      window_close: new Date(data.timeline.applicationEndDate),
      quota_buckets: data.quotaBuckets || [
        { name: "General", capacity: 500 },
        { name: "Reserved", capacity: 100 },
      ],
      document_requirements: [],
      priority_tier_order: ["tier_1_pwd", "tier_2_distance", "tier_3_regular"],
      version: 1,
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "cycles.create",
      target: { resourceType: "AllocationCycle", resourceId: cycle._id.toString() },
      after: { name: cycle.name, academicYear: cycle.academic_year },
    });

    return cycle;
  }

  public static async updateCycle(
    institutionId: string,
    cycleId: string,
    data: {
      name?: string;
      status?: string;
      timeline?: {
        applicationStartDate?: string | Date;
        applicationEndDate?: string | Date;
      };
      expectedVersion?: number;
    },
    actor: { userId: string; email: string; role: string },
  ): Promise<AllocationCycleDocument> {
    const cycle = await AllocationCycleModel.findOne({
      _id: new Types.ObjectId(cycleId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!cycle) {
      throw new NotFoundError("Allocation cycle not found", "CYCLE_NOT_FOUND");
    }

    checkVersionConflict(cycle.version ?? 1, data.expectedVersion);

    const before = { name: cycle.name, status: cycle.status };

    if (data.name) cycle.name = data.name;
    if (data.status) cycle.status = data.status.toLowerCase() as AllocationCycleStatus;
    if (data.timeline) {
      if (data.timeline.applicationStartDate)
        cycle.window_open = new Date(data.timeline.applicationStartDate);
      if (data.timeline.applicationEndDate)
        cycle.window_close = new Date(data.timeline.applicationEndDate);
    }

    cycle.version = (cycle.version ?? 1) + 1;
    await cycle.save();

    await AuditService.record({
      institutionId,
      actor,
      action: "cycles.update",
      target: { resourceType: "AllocationCycle", resourceId: cycle._id.toString() },
      before,
      after: { name: cycle.name, status: cycle.status, version: cycle.version },
    });

    return cycle;
  }
}
