import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApiProblemError } from "@/lib/api/errors.js";
import {
  connectDb,
  DraftWorkflowService,
  WorkflowError,
  VersionConflictError,
  type WorkflowActor,
} from "@hostelhub/db";
import { broadcastDraftEvent } from "@/lib/queue/draft-events.js";

const paramsSchema = z.object({
  id: z.string().min(1),
});

const bodySchema = z.object({
  assignmentId: z.string().min(1),
  toBedId: z.string().min(1),
  reason: z.string().min(10, "Override reason must be at least 10 characters"),
  expectedVersion: z.number().int().positive().optional(),
});

export const POST = apiHandler(
  {
    permission: "allocation:override_own",
    params: paramsSchema,
    body: bodySchema,
    operationId: "applyDraftOverride",
    summary: "Move student bed within a draft with hard constraint revalidation and If-Match check",
  },
  async ({ req, user, params, body }) => {
    await connectDb();

    if (!user) {
      throw new ApiProblemError({
        status: 401,
        title: "Unauthorized",
        detail: "User authentication required",
        code: "UNAUTHORIZED",
      });
    }

    // Parse If-Match header if present, or fallback to body expectedVersion
    const ifMatchHeader = req.headers.get("if-match");
    let version = body.expectedVersion;
    if (ifMatchHeader) {
      const parsed = parseInt(ifMatchHeader.replace(/["w/]/gi, "").trim(), 10);
      if (!isNaN(parsed)) {
        version = parsed;
      }
    }

    if (version === undefined) {
      throw new ApiProblemError({
        status: 428,
        title: "Precondition Required",
        detail: "If-Match header or expectedVersion in body is required for optimistic concurrency",
        code: "PRECONDITION_FAILED",
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
      const result = await workflowService.applyOverride(
        params.id,
        {
          assignmentId: body.assignmentId,
          toBedId: body.toBedId,
          reason: body.reason,
          expectedVersion: version,
        },
        workflowActor,
      );

      await broadcastDraftEvent(params.id, {
        type: "override",
        draftId: params.id,
        data: {
          actorEmail: user.email,
          assignmentId: body.assignmentId,
          toBedId: body.toBedId,
          reason: body.reason,
          version: result.draft.version_number,
        },
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        version: result.draft.version_number,
        overrideId: result.override._id.toString(),
        escalated: result.override.escalated,
        escalationReasons: result.override.escalation_reasons,
      };
    } catch (err: unknown) {
      if (err instanceof VersionConflictError) {
        throw new ApiProblemError({
          status: 409,
          title: "Version Conflict",
          detail: err.message,
          code: "VERSION_CONFLICT",
        });
      }
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
          title: "Workflow Error",
          detail: err.message,
          code: problemCode,
        });
      }
      throw err;
    }
  },
);
