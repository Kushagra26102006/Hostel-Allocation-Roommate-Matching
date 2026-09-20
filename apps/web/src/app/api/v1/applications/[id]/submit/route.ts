import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApplicationRepository, AllocationCycleRepository, EntityNotFoundError, AuditService } from "@hostelhub/db";
import { ForbiddenError, canAccessApplication } from "@/lib/auth/policy";
import { ApiProblemError } from "@/lib/api/errors.js";
import { objectIdSchema } from "@/lib/api/validation.js";

const paramsSchema = z.object({
  id: objectIdSchema,
});

export const POST = apiHandler(
  {
    params: paramsSchema,
    operationId: "submitApplication",
    summary: "Submit hostel application for cycle",
  },
  async ({ user, institution_id, params, requestId }) => {
    const repo = new ApplicationRepository(institution_id);
    const app = await repo.findById(params.id);
    if (!app) {
      throw new EntityNotFoundError(params.id, "Application");
    }

    if (user && !canAccessApplication(user, app as any)) {
      throw new ForbiddenError("You are not authorized to submit another student's application.");
    }

    if (app.status !== "draft") {
      throw new ApiProblemError({
        title: "Invalid Status Transition",
        status: 409,
        detail: `Application status is currently "${app.status}". Only draft applications can be submitted.`,
        code: "VERSION_CONFLICT",
      });
    }

    // Load cycle to enforce window open/close times
    const cycleRepo = new AllocationCycleRepository(institution_id);
    const cycle = await cycleRepo.findById(app.cycle_id);
    if (!cycle) {
      throw new EntityNotFoundError(String(app.cycle_id), "AllocationCycle");
    }

    const now = new Date();
    if (cycle.status !== "open" || now < cycle.window_open || now > cycle.window_close) {
      throw new ApiProblemError({
        title: "Window Closed",
        status: 422,
        detail: "Submission rejected: Application window has closed for this cycle.",
        code: "BAD_REQUEST" as any,
      });
    }

    const currentVersion = (app as any).version ?? 1;

    // Mark as submitted using updateWithVersion
    const updated = await repo.updateWithVersion(
      params.id,
      currentVersion,
      {
        $set: {
          status: "submitted",
          submitted_at: now,
        },
      },
    );

    // Record audit log entry
    if (user) {
      const auditService = AuditService.withTenant(institution_id);
      await auditService.append({
        action: "application.submit",
        actor: {
          user_id: user.id,
          email: user.email,
          roles: user.roles,
        },
        target: {
          type: "application",
          id: params.id,
        },
        before: { status: "draft" },
        after: { status: "submitted", submitted_at: now },
      }).catch((err: unknown) => console.error("Audit log error:", err));
    }

    return {
      message: "Application submitted successfully",
      reference_number: updated.reference_number,
      submitted_at: updated.submitted_at,
      status: updated.status,
    };
  },
);
