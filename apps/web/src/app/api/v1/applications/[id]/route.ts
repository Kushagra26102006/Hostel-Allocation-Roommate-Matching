import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApplicationRepository, ApplicationModel, EntityNotFoundError, VersionConflictError } from "@hostelhub/db";
import { ForbiddenError } from "@/lib/auth/policy";
import { ApiProblemError } from "@/lib/api/errors.js";

const paramsSchema = z.object({
  id: z.string(),
});

const updateApplicationSchema = z.object({
  version: z.number().optional(),
  priority_tier: z.string().optional(),
  form_data: z.record(z.unknown()).optional(),
  status: z.enum(["draft", "submitted", "under_review", "approved", "rejected", "waitlisted"]).optional(),
});

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

    // Object-level access: Student can only view their own application
    const isStaff = user?.roles.some((r) => ["hostel_admin", "warden", "sys_admin"].includes(r));
    if (!isStaff && String(app.student_id) !== String(user?.id)) {
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

    // Object-level access: Student can only edit their own application
    const isStaff = user?.roles.some((r) => ["hostel_admin", "warden", "sys_admin"].includes(r));
    if (!isStaff && String(app.student_id) !== String(user?.id)) {
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

    // Optimistic Concurrency Check:
    // If-Match header or body.version
    const ifMatch = req.headers.get("if-match");
    const expectedVersion = ifMatch ? parseInt(ifMatch.replace(/"/g, ""), 10) : body.version;
    const currentVersion = (app as any).version ?? 1;

    if (typeof expectedVersion === "number" && !isNaN(expectedVersion)) {
      if (currentVersion !== expectedVersion) {
        throw new ApiProblemError({
          title: "Version Conflict",
          status: 412,
          detail: `Optimistic concurrency conflict. Current version is ${currentVersion}, but payload specified ${expectedVersion}.`,
          code: "VERSION_CONFLICT",
        });
      }
    }

    const updates: Record<string, unknown> = {};
    if (body.priority_tier) updates.priority_tier = body.priority_tier;
    if (body.form_data) {
      updates.form_data = {
        ...((app.form_data as Record<string, unknown>) || {}),
        ...body.form_data,
      };
    }
    if (body.status) updates.status = body.status;

    const updated = await ApplicationModel.findOneAndUpdate(
      { _id: params.id, institution_id },
      {
        $set: updates,
        $inc: { version: 1 },
      },
      { new: true, runValidators: true },
    );

    if (!updated) {
      throw new EntityNotFoundError(params.id, "Application");
    }

    return updated;
  },
);
