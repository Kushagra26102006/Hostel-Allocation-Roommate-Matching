import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApiProblemError } from "@/lib/api/errors.js";
import { connectDb, DraftWorkflowService, WorkflowError, type WorkflowActor } from "@hostelhub/db";

const paramsSchema = z.object({
  id: z.string().min(1),
});

const bodySchema = z.object({
  comment: z.string().min(10, "Comment is mandatory and must be at least 10 characters"),
});

export const POST = apiHandler(
  {
    permission: "allocation:override_own",
    params: paramsSchema,
    body: bodySchema,
    operationId: "requestDraftChanges",
    summary: "Request changes on a draft with a mandatory comment",
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

    const workflowActor: WorkflowActor = {
      id: user.id,
      email: user.email,
      role: (user.roles[0] as WorkflowActor["role"]) ?? "warden",
      hostelId: user.hostelAssignments?.[0],
    };

    const workflowService = new DraftWorkflowService();

    try {
      const updatedDraft = await workflowService.requestChanges(
        params.id,
        body.comment,
        workflowActor,
      );

      return {
        success: true,
        status: updatedDraft.status,
        version: updatedDraft.version_number,
      };
    } catch (err: unknown) {
      if (err instanceof WorkflowError) {
        const problemCode =
          err.statusCode === 403
            ? "FORBIDDEN"
            : err.statusCode === 404
              ? "NOT_FOUND"
              : "BAD_REQUEST";
        throw new ApiProblemError({
          status: err.statusCode,
          title: "Workflow Error",
          detail: err.message,
          code: problemCode,
        });
      }
      throw err;
    }
  },
);
