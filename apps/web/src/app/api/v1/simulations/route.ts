import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { SimulatorService, SimulationBatchModel, connectDb } from "@hostelhub/db";
import type { ScenarioDefinition } from "@hostelhub/domain";
import { Types } from "mongoose";

const scenarioSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  weightsVersion: z.string().optional(),
  customWeights: z
    .object({
      wP: z.number().optional(),
      wC: z.number().optional(),
      wF: z.number().optional(),
      wD: z.number().optional(),
      wK: z.number().optional(),
    })
    .optional(),
  quotaOverrides: z.record(z.string(), z.number()).optional(),
  capacityOverrides: z
    .object({
      closedBlockIds: z.array(z.string()).optional(),
      closedHostelIds: z.array(z.string()).optional(),
      closedRoomIds: z.array(z.string()).optional(),
    })
    .optional(),
  accessibilityReservationDate: z.string().optional(),
});

const runSimulationSchema = z.object({
  cycleId: z.string().min(1),
  baseRunId: z.string().optional(),
  seed: z.number().optional(),
  scenarios: z.array(scenarioSchema).min(1).max(3),
});

export const POST = apiHandler(
  {
    permission: "allocation:run",
    body: runSimulationSchema,
    operationId: "runSimulationBatch",
    summary: "Execute up to 3 allocation scenarios in parallel for what-if analysis",
  },
  async ({ institution_id, user, body }) => {
    await connectDb();

    const simulatorService = new SimulatorService();

    const actor = {
      id: user?.id || new Types.ObjectId().toString(),
      email: user?.email || "admin@hostelhub.local",
      role: user?.roles?.[0] || "chief_warden",
    };

    const result = await simulatorService.runSimulationBatch(
      institution_id,
      {
        cycleId: body.cycleId,
        baseRunId: body.baseRunId,
        seed: body.seed,
        scenarios: body.scenarios as unknown as ScenarioDefinition[],
      },
      actor,
    );

    return {
      batchId: result.batchId,
      comparison: result.comparison,
      scenarios: result.scenarios,
    };
  },
);

export const GET = apiHandler(
  {
    permission: "allocation:run",
    query: z.object({
      cycleId: z.string().optional(),
      limit: z.coerce.number().optional().default(10),
    }),
    operationId: "listSimulationBatches",
    summary: "List recent simulation batches for the institution",
  },
  async ({ institution_id, query }) => {
    await connectDb();

    const filter: Record<string, unknown> = {
      institution_id: new Types.ObjectId(institution_id),
    };
    if (query.cycleId) {
      filter["base_cycle_id"] = new Types.ObjectId(query.cycleId);
    }

    const limit = query.limit ?? 10;
    const batches = await SimulationBatchModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    return {
      batches: batches.map((b) => ({
        id: b._id.toString(),
        cycleId: b.base_cycle_id.toString(),
        seed: b.seed,
        scenarioCount: b.scenarios?.length || 0,
        scenarios: b.scenarios?.map((s) => ({
          scenarioId: s.scenario_id,
          name: s.name,
          runId: s.run_id.toString(),
        })),
        createdAt:
          (b as unknown as { createdAt?: Date }).createdAt?.toISOString() ||
          new Date().toISOString(),
      })),
    };
  },
);
