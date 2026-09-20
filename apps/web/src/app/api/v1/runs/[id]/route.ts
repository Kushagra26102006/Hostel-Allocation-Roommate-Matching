import { z } from "zod";
import { Types } from "mongoose";
import { apiHandler } from "@/lib/api/handler.js";
import { AllocationRunModel, AllocationDraftModel, connectDb } from "@hostelhub/db";
import {
  getAllocationCancelKey,
  getAllocationEventChannel,
  type AllocationProgressEvent,
} from "@hostelhub/shared";
import { ApiProblemError } from "@/lib/api/errors.js";
import { getRedis } from "@/lib/redis.js";

const runParamsSchema = z.object({
  id: z.string().min(1),
});

export const GET = apiHandler(
  {
    permission: "allocation:run",
    params: runParamsSchema,
    operationId: "getAllocationRun",
    summary: "Get Allocation Run details, status, metrics, and progress",
  },
  async ({ institution_id, params }) => {
    await connectDb();

    const runId = new Types.ObjectId(params.id);
    const instId = new Types.ObjectId(institution_id);

    const run = await AllocationRunModel.findOne({
      _id: runId,
      institution_id: instId,
    })
      .lean()
      .exec();

    if (!run) {
      throw new ApiProblemError({
        status: 404,
        title: "Not Found",
        detail: "Allocation run not found",
        code: "NOT_FOUND",
      });
    }

    let draft = null;
    if (run.draft_id) {
      draft = await AllocationDraftModel.findOne({
        _id: run.draft_id,
        institution_id: instId,
      })
        .lean()
        .exec();
    }

    return {
      run: {
        id: run._id.toString(),
        cycleId: run.cycle_id.toString(),
        status: run.status,
        progress: run.progress,
        metrics: run.metrics,
        seed: run.seed,
        weightsVersion: run.weights_version,
        rulesVersion: run.rules_version,
        engineVersion: run.engine_version,
        inputHash: run.input_hash,
        dryRun: run.dry_run,
        draftId: run.draft_id?.toString() ?? null,
        draft: draft
          ? {
              id: draft._id.toString(),
              status: draft.status,
              versionNumber: draft.version_number,
              publishedAt: draft.published_at,
            }
          : null,
        error: run.error ?? null,
        startedAt: run.started_at ?? null,
        completedAt: run.completed_at ?? null,
        cancelledAt: run.cancelled_at ?? null,
        createdAt: run.createdAt,
      },
    };
  },
);

export const DELETE = apiHandler(
  {
    permission: "allocation:run",
    params: runParamsSchema,
    operationId: "cancelAllocationRun",
    summary: "Cancel an active allocation run",
  },
  async ({ institution_id, params }) => {
    await connectDb();

    const runId = new Types.ObjectId(params.id);
    const instId = new Types.ObjectId(institution_id);

    const run = await AllocationRunModel.findOne({
      _id: runId,
      institution_id: instId,
    }).exec();

    if (!run) {
      throw new ApiProblemError({
        status: 404,
        title: "Not Found",
        detail: "Allocation run not found",
        code: "NOT_FOUND",
      });
    }

    if (run.status === "completed" || run.status === "failed") {
      throw new ApiProblemError({
        status: 400,
        title: "Invalid Status",
        detail: `Cannot cancel run with terminal status '${run.status}'.`,
        code: "BAD_REQUEST",
      });
    }

    // Set cancellation key in Redis with 1 hour TTL
    const redis = getRedis();
    if (redis) {
      const cancelKey = getAllocationCancelKey(params.id);
      await redis.set(cancelKey, "1", "EX", 3600);

      // Publish cancelled event to notify connected SSE clients
      const channel = getAllocationEventChannel(params.id);
      const event: AllocationProgressEvent = {
        runId: params.id,
        stageCode: "persist",
        stageLabel: "Cancelled",
        percent: 0,
        message: "Run cancellation requested by user.",
        cancelled: true,
        timestamp: new Date().toISOString(),
      };
      await redis.publish(channel, JSON.stringify(event));
    }

    run.status = "cancelled";
    run.cancelled_at = new Date();
    run.progress = {
      stage: "persist",
      percent: 0,
      message: "Run was cancelled by user.",
    };
    await run.save();

    return {
      success: true,
      message: "Allocation run cancelled successfully.",
      runId: params.id,
    };
  },
);
