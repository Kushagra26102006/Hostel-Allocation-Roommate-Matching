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

const bodySchema = z.object({
  draft_id: z.string().min(1),
  bed_id: z.string().min(1),
  trigger: z.enum([
    "withdrawal",
    "no_show",
    "override_freed",
    "appeal_granted",
    "room_change_approved",
    "manual",
  ]),
  reason: z.string().optional(),
  policy_override: z.enum(["auto_confirm", "proposal_required"]).optional(),
});

export const POST = apiHandler(
  {
    permission: "allocation:override_own",
    body: bodySchema,
    operationId: "vacateBedAndPromoteWaitlist",
    summary: "Mark a bed vacated (by withdrawal, no-show, override, appeal) and evaluate promotion",
  },
  async ({ user, body }) => {
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
      const outcome = await promotionService.handleVacatedBed(
        body.draft_id,
        body.bed_id,
        body.trigger,
        actor,
        {
          ...(body.reason ? { reason: body.reason } : {}),
          ...(body.policy_override ? { policyOverride: body.policy_override } : {}),
        },
      );

      await broadcastDraftEvent(body.draft_id, {
        type: "override",
        draftId: body.draft_id,
        data: {
          action: "bed_vacated",
          bedId: body.bed_id,
          trigger: body.trigger,
          promotionOutcome: outcome.promotionResult,
        },
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        vacated_bed_id: outcome.vacatedBedId,
        previous_student_id: outcome.previousStudentId ?? null,
        promotion_result: outcome.promotionResult,
      };
    } catch (err: unknown) {
      if (err instanceof PromotionServiceError) {
        throw new ApiProblemError({
          status: err.statusCode,
          title: "Vacate/Promotion Error",
          detail: err.message,
          code: err.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
        });
      }
      throw err;
    }
  },
);
