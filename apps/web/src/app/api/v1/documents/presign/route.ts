import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { getPresignedPutUrl } from "@/lib/storage/presigner";
import { ApiProblemError } from "@/lib/api/errors.js";

const ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;

const presignSchema = z.object({
  filename: z.string().min(1),
  mime_type: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({ message: "Only PDF, PNG, and JPEG formats are allowed." }),
  }),
  size_bytes: z
    .number()
    .int("File size must be an integer")
    .min(1, "File size must be at least 1 byte")
    .max(5 * 1024 * 1024, "File size exceeds 5MB limit"),
});

export const POST = apiHandler(
  {
    body: presignSchema,
    operationId: "presignDocumentUpload",
    summary: "Get presigned PUT URL for document upload",
  },
  async ({ user, institution_id, body }) => {
    if (!user) {
      throw new ApiProblemError({
        title: "Unauthorized",
        status: 401,
        detail: "User context missing",
        code: "UNAUTHORIZED",
      });
    }

    const res = await getPresignedPutUrl(
      body.filename,
      body.mime_type,
      institution_id,
      user.id,
      body.size_bytes,
    );

    return {
      storage_key: res.storageKey,
      presigned_url: res.uploadUrl,
      expires_in: res.expiresInSeconds,
    };
  },
);
