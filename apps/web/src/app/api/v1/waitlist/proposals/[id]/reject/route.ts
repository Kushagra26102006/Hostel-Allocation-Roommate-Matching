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
  reason: z.string().min(5, "Rejection reason must be at least 5 characters"),
});

export const POST = apiHandler(
  {
    permission: "allocation:override_own",
    params: paramsSchema,
    body: bodySchema,
    operationId: "rejectPromotionProposal",
    summary: "Reject a pending promotion proposal with a reason",
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
      const proposal = await promotionService.rejectProposal(params.id, actor, body.reason);

      const draftId = proposal.draft_id.toString();
      await broadcastDraftEvent(draftId, {
        type: "override",
        draftId,
        data: {
          action: "promotion_proposal_rejected",
          proposalId: params.id,
          reason: body.reason,
        },
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        proposal_id: proposal._id.toString(),
        status: "rejected",
      };
    } catch (err: unknown) {
      if (err instanceof PromotionServiceError) {
        throw new ApiProblemError({
          status: err.statusCode,
          title: "Rejection Failed",
          detail: err.message,
          code: err.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
        });
      }
      throw err;
    }
  },
);
