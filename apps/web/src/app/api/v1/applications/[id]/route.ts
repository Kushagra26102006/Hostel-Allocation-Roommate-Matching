import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApplicationRepository, EntityNotFoundError } from "@hostelhub/db";
import { ForbiddenError, canAccessApplication } from "@/lib/auth/policy";
import { ApiProblemError, PreconditionFailedError } from "@/lib/api/errors.js";
import { objectIdSchema } from "@/lib/api/validation.js";

const paramsSchema = z.object({
  id: objectIdSchema,
});

const updateApplicationSchema = z.object({
  version: z.number().optional(),
  priority_tier: z.enum(["general", "quota_sports", "quota_pwd", "quota_single_child", "merit"]).optional(),
  form_data: z.record(z.unknown()).optional(),
}).strict();

export const GET = apiHandler(
  {
    params: paramsSchema,
    operationId: "getApplication",
    summary: "Get single application by ID",
  },
  async ({ user, institution_id, params }) => {
    const repo = new ApplicationRepository(institution_id);
    const app = await repo.findById(params.id);
    if (!app) {
      throw new EntityNotFoundError(params.id, "Application");
    }

    if (user && !canAccessApplication(user, app as any)) {
      throw new ForbiddenError("You are not authorized to view another student's application.");
    }

    return app;
  },
);

export const PATCH = apiHandler(
  {
    params: paramsSchema,
    body: updateApplicationSchema,
    operationId: "autosaveApplication",
    summary: "Autosave application with optimistic concurrency check",
  },
  async ({ req, user, institution_id, params, body }) => {
    const repo = new ApplicationRepository(institution_id);
    const app = await repo.findById(params.id);
    if (!app) {
      throw new EntityNotFoundError(params.id, "Application");
    }

    if (user && !canAccessApplication(user, app as any)) {
      throw new ForbiddenError("You are not authorized to modify another student's application.");
    }

    if (app.status !== "draft") {
      throw new ApiProblemError({
        title: "Application Closed",
        status: 422,
        detail: "Application is already submitted and cannot be edited.",
        code: "BAD_REQUEST" as any,
      });
    }

    // Optimistic Concurrency Check: If-Match header or body.version
    const ifMatch = req.headers.get("if-match");
    let expectedVersion = body.version ?? (app as any).version ?? 1;

    if (ifMatch) {
      if (ifMatch.trim() === "*") {
        throw new PreconditionFailedError("If-Match wildcard '*' is not supported for application updates.");
      }
      // Support weak ETag W/"5" or "5"
      const cleanEtag = ifMatch.replace(/^W\//i, "").replace(/"/g, "").trim();
      const parsedEtag = parseInt(cleanEtag, 10);
      if (isNaN(parsedEtag) || parsedEtag < 1) {
        throw new PreconditionFailedError("If-Match header must contain a valid positive integer version number.");
      }
      expectedVersion = parsedEtag;
    }

    const updates: Record<string, unknown> = {};
    if (body.priority_tier) updates["priority_tier"] = body.priority_tier;
    if (body.form_data) {
      // Use $set on form_data.<key> paths so concurrent autosaves don't clobber each other
      for (const [key, val] of Object.entries(body.form_data)) {
        updates[`form_data.${key}`] = val;
      }
    }

    const updated = await repo.updateWithVersion(
      params.id,
      expectedVersion,
      { $set: updates },
    );

    return updated;
  },
);
