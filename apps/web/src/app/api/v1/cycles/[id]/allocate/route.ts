import { z } from "zod";
import { randomInt } from "node:crypto";
import { Types } from "mongoose";
import { apiHandler } from "@/lib/api/handler.js";
import { AllocationCycleRepository, AllocationRunModel, connectDb } from "@hostelhub/db";
import { getAllocationQueue } from "@/lib/queue/allocation-queue.js";
import { ApiProblemError } from "@/lib/api/errors.js";

const allocateParamsSchema = z.object({
  id: z.string().min(1),
});

const allocateBodySchema = z.object({
  seed: z.number().int().optional(),
  weightsVersion: z.string().optional(),
  dryRun: z.boolean().optional().default(false),
});

export const POST = apiHandler(
  {
    permission: "allocation:run",
    idempotent: true,
    params: allocateParamsSchema,
    body: allocateBodySchema,
    operationId: "triggerAllocationRun",
    summary: "Trigger allocation engine run for cycle",
  },
  async ({ institution_id, user, params, body, setHeader }) => {
    await connectDb();

    const cycleId = new Types.ObjectId(params.id);
    const instId = new Types.ObjectId(institution_id);

    const cycleRepo = new AllocationCycleRepository(instId);
    const cycle = await cycleRepo.findById(cycleId);

    if (!cycle) {
      throw new ApiProblemError({
        status: 404,
        title: "Not Found",
        detail: "Cycle not found",
        code: "NOT_FOUND",
      });
    }

    // Check if there is already an active run for this cycle
    const activeRun = await AllocationRunModel.findOne({
      institution_id: instId,
      cycle_id: cycleId,
      status: { $in: ["queued", "running"] },
    }).exec();

    if (activeRun) {
      throw new ApiProblemError({
        status: 409,
        title: "Conflict",
        detail: `An allocation run (${activeRun._id.toString()}) is already in progress for this cycle.`,
        code: "BAD_REQUEST",
      });
    }

    // Generate deterministic seed if not provided
    const seed = body.seed !== undefined ? body.seed : randomInt(1, 2147483647);
    const dryRun = Boolean(body.dryRun);
    const weightsVersion = body.weightsVersion ?? "default";

    // Create the AllocationRun record
    const runDoc = await AllocationRunModel.create({
      institution_id: instId,
      cycle_id: cycleId,
      created_by: user?.id ? new Types.ObjectId(user.id) : new Types.ObjectId(),
      seed,
      weights_version: weightsVersion,
      rules_version: "1.0",
      engine_version: "1.0.0",
      status: "queued",
      progress: {
        stage: "freeze",
        percent: 0,
        message: "Run queued for worker processing...",
      },
      dry_run: dryRun,
    });

    const runId = runDoc._id.toString();

    // Enqueue job to BullMQ
    try {
      const queue = getAllocationQueue();
      await queue.add(
        "run",
        {
          runId,
          cycleId: params.id,
          institutionId: institution_id,
          seed,
          weightsVersion: body.weightsVersion,
          dryRun,
        },
        {
          jobId: runId,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (queueErr) {
      // If queue is down or fails, mark run as failed
      await AllocationRunModel.updateOne(
        { _id: runDoc._id },
        {
          $set: {
            status: "failed",
            error: (queueErr as Error).message,
          },
        },
      );
      throw new ApiProblemError({
        status: 500,
        title: "Queue Error",
        detail: `Failed to enqueue allocation job: ${(queueErr as Error).message}`,
        code: "INTERNAL_SERVER_ERROR",
      });
    }

    setHeader("Location", `/api/v1/runs/${runId}`);

    return {
      run: {
        id: runId,
        cycleId: params.id,
        seed,
        weightsVersion,
        status: "queued",
        dryRun,
        createdAt: runDoc.createdAt,
      },
    };
  },
);
