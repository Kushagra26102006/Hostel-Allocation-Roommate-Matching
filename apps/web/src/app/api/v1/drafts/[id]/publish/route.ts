import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApiProblemError } from "@/lib/api/errors.js";
import { connectDb, DraftWorkflowService, WorkflowError, type WorkflowActor } from "@hostelhub/db";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export const POST = apiHandler(
  {
    permission: "allocation:publish_own",
    params: paramsSchema,
    operationId: "publishDraft",
    summary: "Publish an approved draft with four layers of protection and atomic lock",
  },
  async ({ user, params }) => {
    await connectDb();

    if (!user) {
      throw new ApiProblemError({
        status: 401,
        title: "Unauthorized",
        detail: "User authentication required",
        code: "UNAUTHORIZED",
      });
    }

    const workflowActor: WorkflowActor = {
      id: user.id,
      email: user.email,
      role: (user.roles[0] as WorkflowActor["role"]) ?? "warden",
      hostelId: user.hostelAssignments?.[0],
    };

    const workflowService = new DraftWorkflowService();

    try {
      const publishedDraft = await workflowService.publishDraft(params.id, workflowActor);

      return {
        success: true,
        status: publishedDraft.status,
        publishedAt: publishedDraft.published_at,
        approvalId: publishedDraft.approval_id,
      };
    } catch (err: unknown) {
      if (err instanceof WorkflowError) {
        const problemCode =
          err.statusCode === 403
            ? "FORBIDDEN"
            : err.statusCode === 404
              ? "NOT_FOUND"
              : err.statusCode === 409
                ? "VERSION_CONFLICT"
                : "BAD_REQUEST";
        throw new ApiProblemError({
          status: err.statusCode,
          title: "Publish Gate Error",
          detail: err.message,
          code: problemCode,
        });
      }
      throw err;
    }
  },
);
