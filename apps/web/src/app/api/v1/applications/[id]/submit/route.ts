import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApplicationRepository, AllocationCycleRepository, ApplicationModel, EntityNotFoundError } from "@hostelhub/db";
import { ForbiddenError } from "@/lib/auth/policy";
import { ApiProblemError } from "@/lib/api/errors.js";

const paramsSchema = z.object({
  id: z.string(),
});

export const POST = apiHandler(
  {
    params: paramsSchema,
    operationId: "submitApplication",
    summary: "Submit hostel application for cycle",
  },
  async ({ user, institution_id, params }) => {
    const repo = new ApplicationRepository(institution_id);
    const app = await repo.findById(params.id);
    if (!app) {
      throw new EntityNotFoundError(params.id, "Application");
    }

    // Object-level isolation check
    const isStaff = user?.roles.some((r) => ["hostel_admin", "warden", "sys_admin"].includes(r));
    if (!isStaff && String(app.student_id) !== String(user?.id)) {
      throw new ForbiddenError("You are not authorized to submit another student's application.");
    }

    if (app.status === "submitted") {
      return {
        message: "Application already submitted",
        reference_number: app.reference_number,
        submitted_at: app.submitted_at,
        status: app.status,
      };
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

    // Mark as submitted
    const updated = await ApplicationModel.findOneAndUpdate(
      { _id: params.id, institution_id },
      {
        $set: {
          status: "submitted",
          submitted_at: now,
        },
      },
      { new: true },
    );

    return {
      message: "Application submitted successfully",
      reference_number: updated?.reference_number,
      submitted_at: updated?.submitted_at,
      status: updated?.status,
    };
  },
);
