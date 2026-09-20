import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { AllocationCycleRepository } from "@hostelhub/db";
import { paginationQuerySchema } from "@/lib/api/pagination.js";

const cycleQuerySchema = paginationQuerySchema.extend({
  academic_year: z.string().optional(),
  status: z.enum(["draft", "scheduled", "open", "closed", "archived"]).optional(),
});

const createCycleSchema = z.object({
  academic_year: z.string().min(1, "Academic year is required"),
  name: z.string().min(1, "Name is required"),
  window_open: z.string().or(z.date()).transform((val) => new Date(val)),
  window_close: z.string().or(z.date()).transform((val) => new Date(val)),
  quota_buckets: z.array(
    z.object({
      name: z.string().min(1),
      capacity: z.number().min(0),
    }),
  ).default([]),
  document_requirements: z.array(
    z.object({
      type: z.string().min(1),
      label: z.string().min(1),
      required: z.boolean().default(true),
    }),
  ).default([]),
  priority_tier_order: z.array(z.string()).default(["pwd", "single_parent", "merit", "general"]),
  status: z.enum(["draft", "scheduled", "open", "closed", "archived"]).default("draft"),
});

export const GET = apiHandler(
  {
    operationId: "listCycles",
    summary: "List Allocation Cycles",
    query: cycleQuerySchema,
  },
  async ({ institution_id, query }) => {
    const repo = new AllocationCycleRepository(institution_id);
    const filter: Record<string, unknown> = {};
    if (query.academic_year) filter.academic_year = query.academic_year;
    if (query.status) filter.status = query.status;

    const result = await repo.paginate(
      filter,
      {
        ...(query.limit ? { limit: query.limit } : {}),
        ...(query.cursor ? { cursor: query.cursor } : {}),
        sortField: (query.sortField as "_id") ?? "_id",
        sortOrder: query.sortOrder ?? "desc",
      },
    );

    return result;
  },
);

export const POST = apiHandler(
  {
    permission: "cycles:manage",
    body: createCycleSchema,
    operationId: "createCycle",
    summary: "Create Allocation Cycle",
  },
  async ({ institution_id, body }) => {
    const repo = new AllocationCycleRepository(institution_id);
    const cycle = await repo.create({
      academic_year: body.academic_year,
      name: body.name,
      window_open: new Date(body.window_open),
      window_close: new Date(body.window_close),
      quota_buckets: body.quota_buckets ?? [],
      document_requirements: (body.document_requirements ?? []).map((d) => ({
        type: d.type,
        label: d.label,
        required: d.required ?? true,
      })),
      priority_tier_order: body.priority_tier_order ?? ["pwd", "single_parent", "merit", "general"],
      status: body.status ?? "draft",
    });
    return cycle;
  },
);
