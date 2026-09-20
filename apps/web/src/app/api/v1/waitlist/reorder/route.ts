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
  waitlist_entry_id: z.string().min(1),
  new_position: z.number().int().min(1, "Position must be at least 1"),
  reason: z.string().min(10, "Reorder reason must be at least 10 characters"),
});

export const POST = apiHandler(
  {
    permission: "allocation:override_own",
    body: bodySchema,
    operationId: "reorderWaitlistQueue",
    summary: "Reorder a waitlist student's priority position with a mandatory recorded reason",
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
      const updatedEntries = await promotionService.reorderWaitlist(
        body.draft_id,
        body.waitlist_entry_id,
        body.new_position,
        body.reason,
        actor,
      );

      // Broadcast reorder event to reviewers
      await broadcastDraftEvent(body.draft_id, {
        type: "override",
        draftId: body.draft_id,
        data: {
          action: "waitlist_reordered",
          waitlistEntryId: body.waitlist_entry_id,
          newPosition: body.new_position,
          reason: body.reason,
        },
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        updated_count: updatedEntries.length,
      };
    } catch (err: unknown) {
      if (err instanceof PromotionServiceError) {
        throw new ApiProblemError({
          status: err.statusCode,
          title: "Reorder Failed",
          detail: err.message,
          code: err.statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST",
        });
      }
      throw err;
    }
  },
);
