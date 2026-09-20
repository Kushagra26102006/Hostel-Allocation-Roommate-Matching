import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApplicationDocumentRepository, EntityNotFoundError } from "@hostelhub/db";
import { getPresignedGetUrl } from "@/lib/storage/presigner";
import { ForbiddenError } from "@/lib/auth/policy";

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

    // Object-level isolation: student can only download their own document; staff can download any
    const isStaff = user?.roles.some((r) => ["hostel_admin", "warden", "sys_admin"].includes(r));
    if (!isStaff && String(doc.student_id) !== String(user?.id)) {
      throw new ForbiddenError("You are not authorized to access this document.");
    }

    const presignedUrl = await getPresignedGetUrl(doc.storage_key, 900);

    return {
      document_id: doc._id,
      original_name: doc.original_name,
      mime_type: doc.mime_type,
      presigned_url: presignedUrl,
      expires_in: 900,
    };
  },
);
