import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { PolicyRuleSetRepository } from "@hostelhub/db";
import { paginationQuerySchema } from "@/lib/api/pagination.js";

const ruleSetQuerySchema = paginationQuerySchema.extend({
  name: z.string().optional(),
});

const createRuleSetSchema = z.object({
  name: z.string().min(1, "Rule set name is required"),
  rules: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      expression: z.record(z.unknown()),
      reasonTemplate: z.string().min(1),
      policyRef: z.string().min(1),
      owner: z.string().default("hostel_admin"),
      effectiveFrom: z.string().or(z.date()).optional(),
      effectiveTo: z.string().or(z.date()).optional(),
      version: z.number().default(1),
    }),
  ).default([]),
});

export const GET = apiHandler(
  {
    operationId: "listPolicyRuleSets",
    summary: "List Policy Rule Sets",
    query: ruleSetQuerySchema,
  },
  async ({ institution_id, query }) => {
    const repo = new PolicyRuleSetRepository(institution_id);
    const filter: Record<string, unknown> = {};
    if (query.name) filter.name = query.name;

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
    permission: "policy:rules",
    body: createRuleSetSchema,
    operationId: "createPolicyRuleSet",
    summary: "Create a new Policy Rule Set",
  },
  async ({ institution_id, body }) => {
    const repo = new PolicyRuleSetRepository(institution_id);
    const ruleSet = await repo.create({
      name: body.name,
      version: 1,
      is_locked: false,
      rules: body.rules as any,
    });
    return ruleSet;
  },
);
