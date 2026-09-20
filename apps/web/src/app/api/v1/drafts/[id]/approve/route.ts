import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApiProblemError } from "@/lib/api/errors.js";
import {
  connectDb,
  DraftWorkflowService,
  WorkflowError,
  UserRepository,
  type WorkflowActor,
} from "@hostelhub/db";

const paramsSchema = z.object({
  id: z.string().min(1),
});

const bodySchema = z.object({
  comment: z.string().min(1, "Comment is required").default("Draft approved"),
  secondApproverId: z.string().optional(),
});

export const POST = apiHandler(
  {
    permission: "allocation:approve_own",
    params: paramsSchema,
    body: bodySchema,
    operationId: "approveDraft",
    summary: "Approve a draft with maker-checker validation and mandatory reason checks",
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

    let secondApproverActor: WorkflowActor | undefined;
    if (body.secondApproverId) {
      const userRepo = new UserRepository();
      const secondUser = await userRepo.findById(body.secondApproverId);
      if (secondUser) {
        secondApproverActor = {
          id: secondUser._id.toString(),
          email: secondUser.email,
          role: (secondUser.roles?.[0] as WorkflowActor["role"]) ?? "chief_warden",
        };
      }
    }

    const workflowService = new DraftWorkflowService();

    try {
      const result = await workflowService.approveDraft(
        params.id,
        workflowActor,
        secondApproverActor,
        body.comment,
      );

      return {
        success: true,
        status: result.draft.status,
        approvalId: result.approvalRecord._id.toString(),
        approvedAt: result.approvalRecord.approved_at,
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
          title: "Approval Error",
          detail: err.message,
          code: problemCode,
        });
      }
      throw err;
    }
  },
);
