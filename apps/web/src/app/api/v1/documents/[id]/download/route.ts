import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import {
  ApplicationDocumentRepository,
  ApplicationRepository,
  AuditService,
  EntityNotFoundError,
} from "@hostelhub/db";
import { getPresignedGetUrl } from "@/lib/storage/presigner";
import { ForbiddenError, canAccessApplication } from "@/lib/auth/policy";
import { ApiProblemError } from "@/lib/api/errors.js";

const paramsSchema = z.object({
  id: z.string(),
});

export const GET = apiHandler(
  {
    params: paramsSchema,
    operationId: "getDownloadUrl",
    summary: "Get short-lived presigned GET URL for application document",
  },
  async ({ user, institution_id, params }) => {
    const repo = new ApplicationDocumentRepository(institution_id);
    const doc = await repo.findById(params.id);
    if (!doc) {
      throw new EntityNotFoundError(params.id, "ApplicationDocument");
    }

    // Refuse quarantined or pending_scan documents
    if (doc.status === "quarantined" || doc.status === "pending_scan") {
      throw new ApiProblemError({
        title: "Document Access Denied",
        status: 403,
        detail: `Cannot download document with status '${doc.status}'. Document must be clean or verified.`,
        code: "FORBIDDEN",
      });
    }

    // Auth check: student can download their own document; staff can download if authorized via policy
    const isOwner = user && String(doc.student_id) === String(user.id);
    let isAuthorized = isOwner;

    if (!isAuthorized && user) {
      const appRepo = new ApplicationRepository(institution_id);
      const app = await appRepo.findById(String(doc.application_id));
      if (
        app &&
        canAccessApplication(user, app as unknown as Parameters<typeof canAccessApplication>[1])
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new ForbiddenError("You are not authorized to access this document.");
    }

    const presignedUrl = await getPresignedGetUrl(doc.storage_key, 900);

    // Audit record for access
    await AuditService.append({
      institution_id,
      actor: {
        userId: user?.id ?? "anonymous",
        email: user?.email ?? "unknown@campus.edu",
        role: user?.roles[0] ?? "student",
      },
      action: "document:download",
      target: {
        type: "ApplicationDocument",
        id: params.id,
      },
      before: {},
      after: {
        document_id: doc._id,
        storage_key: doc.storage_key,
      },
    });

    return {
      document_id: doc._id,
      original_name: doc.original_name,
      mime_type: doc.mime_type,
      presigned_url: presignedUrl,
      expires_in: 900,
    };
  },
);
