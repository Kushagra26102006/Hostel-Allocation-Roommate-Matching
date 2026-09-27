import { Types } from "mongoose";
import {
  AllocationRunModel,
  AllocationCycleModel,
  type IAllocationRun,
  type AllocationRunDocument,
} from "@hostelhub/db";
import { NotFoundError, BadRequestError, ConflictError } from "../../common/errors/app-error.js";
import { createAllocationQueue } from "../../workers/allocation.worker.js";
import { getAllocationCancelKey } from "@hostelhub/shared";
import { getRedisClient } from "../../config/redis.js";
import { AuditService } from "../audit/audit.service.js";

export class AllocationService {
  public static async triggerAllocation(
    institutionId: string,
    cycleId: string,
    options: {
      dryRun?: boolean | undefined;
      weightsVersionId?: string | undefined;
      seed?: number | undefined;
    } = {},
    actor: { userId: string; email: string; role: string },
  ): Promise<AllocationRunDocument> {
    const instId = new Types.ObjectId(institutionId);
    const cycleObjectId = new Types.ObjectId(cycleId);

    const cycle = await AllocationCycleModel.findOne({
      _id: cycleObjectId,
      institution_id: instId,
    });
    if (!cycle) {
      throw new NotFoundError("Cycle not found", "CYCLE_NOT_FOUND");
    }

    // Check if active run in progress
    const activeRun = await AllocationRunModel.findOne({
      institution_id: instId,
      cycle_id: cycleObjectId,
      status: { $in: ["queued", "running"] },
    });
    if (activeRun) {
      throw new ConflictError(
        "An allocation run is already in progress for this cycle",
        "RUN_IN_PROGRESS",
      );
    }

    const runId = new Types.ObjectId().toString();
    const seedNumber = options.seed ?? Math.floor(Math.random() * 1000000);
    const weightsVersionStr = options.weightsVersionId ?? "v1.0.0";

    const run = await AllocationRunModel.create({
      _id: new Types.ObjectId(runId),
      institution_id: instId,
      cycle_id: cycleObjectId,
      seed: seedNumber,
      weights_version: weightsVersionStr,
      rules_version: "v1.0.0",
      engine_version: "v1.0.0",
      input_hash: "initial-pending-hash",
      status: "queued",
      progress: {
        stage: "freeze",
        percent: 0,
        message: "Queued in BullMQ",
      },
      dry_run: options.dryRun ?? false,
      started_at: new Date(),
    });

    const queue = createAllocationQueue();
    await queue.add(
      `alloc-${runId}`,
      {
        runId,
        cycleId,
        institutionId,
        seed: seedNumber,
        weightsVersion: weightsVersionStr,
        dryRun: options.dryRun ?? false,
      },
      { jobId: runId },
    );

    await AuditService.record({
      institutionId,
      actor,
      action: "allocation.trigger",
      target: { resourceType: "AllocationRun", resourceId: runId },
      after: { dryRun: options.dryRun ?? false },
    });

    return run;
  }

  public static async getRunById(institutionId: string, runId: string): Promise<IAllocationRun> {
    const run = await AllocationRunModel.findOne({
      _id: new Types.ObjectId(runId),
      institution_id: new Types.ObjectId(institutionId),
    }).lean();
    if (!run) {
      throw new NotFoundError("Allocation run not found", "RUN_NOT_FOUND");
    }
    return run;
  }

  public static async cancelRun(
    institutionId: string,
    runId: string,
    actor: { userId: string; email: string; role: string },
  ): Promise<{ success: boolean }> {
    const run = await AllocationRunModel.findOne({
      _id: new Types.ObjectId(runId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!run) {
      throw new NotFoundError("Allocation run not found", "RUN_NOT_FOUND");
    }

    if (run.status !== "queued" && run.status !== "running") {
      throw new BadRequestError(`Cannot cancel run with status '${run.status}'`, "CANNOT_CANCEL");
    }

    const redis = getRedisClient();
    await redis.set(getAllocationCancelKey(runId), "1", "EX", 3600);

    run.status = "cancelled";
    run.cancelled_at = new Date();
    await run.save();

    await AuditService.record({
      institutionId,
      actor,
      action: "allocation.cancel",
      target: { resourceType: "AllocationRun", resourceId: runId },
      after: { status: "cancelled" },
    });

    return { success: true };
  }
}
