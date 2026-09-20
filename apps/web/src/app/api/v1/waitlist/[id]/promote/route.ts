import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApiProblemError } from "@/lib/api/errors.js";
import {
  connectDb,
  PromotionService,
  PromotionServiceError,
  type WorkflowActor,
} from "@hostelhub/db";
import { broadcastDraftEvent } from "@/lib/queue/draft-events.js";

const paramsSchema = z.object({
  id: z.string().min(1),
});

const bodySchema = z.object({
  draft_id: z.string().min(1),
  bed_id: z.string().min(1),
  reason: z.string().min(10, "Promotion reason must be at least 10 characters"),
});

export const POST = apiHandler(
  {
    permission: "allocation:override_own",
    params: paramsSchema,
    body: bodySchema,
    operationId: "manualPromoteWaitlistEntry",
    summary: "Manually promote a waitlisted student to a bed with a mandatory reason",
  },
  async ({ user, params, body }) => {
    await connectDb();

    if (!user) {
      throw new ApiProblemError({
        status: 401,
        title: "Unauthorized",
        detail: "User authentication required",
        code: "UNAUTHORIZED",
      });
    }

    const actor: WorkflowActor = {
      id: user.id,
      email: user.email,
      role: (user.roles?.[0] as WorkflowActor["role"]) ?? "warden",
      hostelId: user.hostelAssignments?.[0],
    };

    const promotionService = new PromotionService();

    try {
      const result = await promotionService.manualPromote(
        body.draft_id,
        params.id,
        body.bed_id,
        body.reason,
        actor,
      );

      // Broadcast update event to active reviewers
      await broadcastDraftEvent(body.draft_id, {
        type: "override",
        draftId: body.draft_id,
        data: {
          action: "manual_promotion",
          waitlistEntryId: params.id,
          bedId: body.bed_id,
          reason: body.reason,
          amendedDraftId: result.amendedDraft?._id.toString(),
        },
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        assignment_id: result.assignmentId,
        amended_draft_id: result.amendedDraft?._id.toString() ?? null,
      };
    } catch (err: unknown) {
      if (err instanceof PromotionServiceError) {
        throw new ApiProblemError({
          status: err.statusCode,
          title: "Promotion Failed",
          detail: err.message,
          code: err.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
        });
      }
      throw err;
    }
  },
);
