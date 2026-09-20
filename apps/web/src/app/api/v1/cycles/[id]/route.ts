import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { AllocationCycleRepository, AllocationCycleModel, EntityNotFoundError } from "@hostelhub/db";

const paramsSchema = z.object({
  id: z.string(),
});

const updateCycleSchema = z.object({
  academic_year: z.string().optional(),
  name: z.string().optional(),
  window_open: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  window_close: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  quota_buckets: z.array(
    z.object({
      name: z.string().min(1),
      capacity: z.number().min(0),
    }),
  ).optional(),
  document_requirements: z.array(
    z.object({
      type: z.string().min(1),
      label: z.string().min(1),
      required: z.boolean().default(true),
    }),
  ).optional(),
  priority_tier_order: z.array(z.string()).optional(),
  status: z.enum(["draft", "scheduled", "open", "closed", "archived"]).optional(),
});

export const GET = apiHandler(
  {
    params: paramsSchema,
    operationId: "getCycle",
    summary: "Get Allocation Cycle details",
  },
  async ({ institution_id, params }) => {
    const repo = new AllocationCycleRepository(institution_id);
    const cycle = await repo.findById(params.id);
    if (!cycle) {
      throw new EntityNotFoundError(params.id, "AllocationCycle");
    }
    return cycle;
  },
);

export const PATCH = apiHandler(
  {
    permission: "cycles:manage",
    params: paramsSchema,
    body: updateCycleSchema,
    operationId: "updateCycle",
    summary: "Update Allocation Cycle",
  },
  async ({ institution_id, params, body }) => {
    const updated = await AllocationCycleModel.findOneAndUpdate(
      { _id: params.id, institution_id },
      { $set: body },
      { new: true, runValidators: true },
    );

    if (!updated) {
      throw new EntityNotFoundError(params.id, "AllocationCycle");
    }
    return updated;
  },
);
