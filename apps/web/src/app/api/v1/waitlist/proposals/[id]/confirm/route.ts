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
  comment: z.string().optional(),
});

export const POST = apiHandler(
  {
    permission: "allocation:override_own",
    params: paramsSchema,
    body: bodySchema,
    operationId: "confirmPromotionProposal",
    summary: "Confirm a pending promotion proposal by warden",
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
      const result = await promotionService.confirmProposal(params.id, actor, body.comment);

      const draftId = result.proposal.draft_id.toString();
      await broadcastDraftEvent(draftId, {
        type: "override",
        draftId,
        data: {
          action: "promotion_proposal_confirmed",
          proposalId: params.id,
          assignmentId: result.assignmentId,
          amendedDraftId: result.amendedDraft?._id.toString(),
        },
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        proposal_id: result.proposal._id.toString(),
        assignment_id: result.assignmentId,
        amended_draft_id: result.amendedDraft?._id.toString() ?? null,
      };
    } catch (err: unknown) {
      if (err instanceof PromotionServiceError) {
        throw new ApiProblemError({
          status: err.statusCode,
          title: "Confirmation Failed",
          detail: err.message,
          code: err.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
        });
      }
      throw err;
    }
  },
);
