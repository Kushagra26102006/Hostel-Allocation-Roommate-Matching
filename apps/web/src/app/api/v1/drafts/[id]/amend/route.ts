import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApiProblemError } from "@/lib/api/errors.js";
import { connectDb, DraftWorkflowService, WorkflowError, type WorkflowActor } from "@hostelhub/db";

const paramsSchema = z.object({
  id: z.string().min(1),
});

const bodySchema = z.object({
  reason: z.string().min(10, "Amendment reason is mandatory and must be at least 10 characters"),
});

export const POST = apiHandler(
  {
    permission: "allocation:publish_own",
    params: paramsSchema,
    body: bodySchema,
    operationId: "amendDraft",
    summary: "Amend a published draft creating a new draft version and archiving the old one",
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
      const result = await workflowService.amendDraft(params.id, workflowActor, body.reason);

      return {
        success: true,
        oldDraftId: result.oldDraft._id.toString(),
        oldDraftStatus: result.oldDraft.status,
        newDraftId: result.newDraft._id.toString(),
        newDraftStatus: result.newDraft.status,
        newVersionNumber: result.newDraft.version_number,
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
          title: "Amendment Error",
          detail: err.message,
          code: problemCode,
        });
      }
      throw err;
    }
  },
);
