import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { PolicyRuleSetRepository, PolicyRuleSetModel, EntityNotFoundError } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors.js";

const paramsSchema = z.object({
  id: z.string(),
});

const updateRuleSetSchema = z.object({
  name: z.string().optional(),
  is_locked: z.boolean().optional(),
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
  ).optional(),
});

export const GET = apiHandler(
  {
    params: paramsSchema,
    operationId: "getPolicyRuleSet",
    summary: "Get Policy Rule Set details",
  },
  async ({ institution_id, params }) => {
    const repo = new PolicyRuleSetRepository(institution_id);
    const ruleSet = await repo.findById(params.id);
    if (!ruleSet) {
      throw new EntityNotFoundError(params.id, "PolicyRuleSet");
    }
    return ruleSet;
  },
);

export const PATCH = apiHandler(
  {
    permission: "policy:rules",
    params: paramsSchema,
    body: updateRuleSetSchema,
    operationId: "updatePolicyRuleSet",
    summary: "Update Policy Rule Set (Immutable if locked)",
  },
  async ({ institution_id, params, body }) => {
    const repo = new PolicyRuleSetRepository(institution_id);
    const existing = await repo.findById(params.id);
    if (!existing) {
      throw new EntityNotFoundError(params.id, "PolicyRuleSet");
    }

    if (existing.is_locked) {
      throw new ApiProblemError({
        title: "Rule Set Locked",
        status: 422,
        detail: "Policy rule set is locked and immutable once used in an allocation run.",
        code: "BAD_REQUEST" as any,
      });
    }

    const updated = await PolicyRuleSetModel.findOneAndUpdate(
      { _id: params.id, institution_id },
      { $set: body },
      { new: true, runValidators: true },
    );

    return updated;
  },
);
