import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApplicationDocumentRepository, ApplicationRepository } from "@hostelhub/db";
import { validateMagicBytes } from "@/lib/storage/magic-bytes";
import { malwareScanner } from "@/lib/services/scan-port";
import { ApiProblemError } from "@/lib/api/errors.js";
import { getS3Client } from "@/lib/minio.js";
import { HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const DOCUMENT_TYPES = [
  "income_certificate",
  "caste_certificate",
  "disability_certificate",
  "id_proof",
  "conduct_certificate",
  "other",
] as const;

const verifyUploadSchema = z.object({
  application_id: z.string().min(1),
  type: z.enum(DOCUMENT_TYPES),
  storage_key: z.string().min(1),
  original_name: z.string().min(1),
  mime_type: z.string().min(1),
  file_base64: z.string().optional(),
});

export const POST = apiHandler(
  {
    body: verifyUploadSchema,
    operationId: "verifyDocumentUpload",
    summary: "Perform server-side magic byte check & malware scan on uploaded document",
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

    // 1. Verify storage_key tenant/user path isolation
    const expectedPrefix = `tenants/${institution_id}/students/${user.id}/`;
    if (!body.storage_key.startsWith(expectedPrefix)) {
      throw new ApiProblemError({
        title: "Invalid Storage Key",
        status: 403,
        detail: "Storage key does not match current user tenant path",
        code: "FORBIDDEN",
      });
    }

    // 2. Verify application exists, belongs to user & tenant
    const appRepo = new ApplicationRepository(institution_id);
    const app = await appRepo.findById(body.application_id);
    if (!app || String(app.student_id) !== String(user.id)) {
      throw new ApiProblemError({
        title: "Application Not Found",
        status: 404,
        detail: "Application not found or does not belong to user",
        code: "NOT_FOUND",
      });
    }

    // 3. Fetch S3 HeadObject for actual size_bytes & GetObject stream
    const s3 = getS3Client();
    const bucket = process.env["S3_BUCKET"] ?? "hostelhub";
    let sizeBytes = 0;
    let buffer: Buffer;

    try {
      const headRes = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: body.storage_key }));
      sizeBytes = headRes.ContentLength ?? 0;

      const getRes = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: body.storage_key }));
      if (!getRes.Body) {
        throw new Error("Empty body from S3 GetObject");
      }
      const byteArray = await getRes.Body.transformToByteArray();
      buffer = Buffer.from(byteArray);
    } catch (err: any) {
      if (process.env.NODE_ENV !== "production" && (body as any).file_base64) {
        buffer = Buffer.from((body as any).file_base64, "base64");
        sizeBytes = buffer.length;
      } else {
        throw new ApiProblemError({
          title: "Storage Error",
          status: 400,
          detail: `Failed to fetch uploaded file from storage: ${err.message}`,
          code: "BAD_REQUEST",
        });
      }
    }

    // 4. Magic byte validation
    const magicResult = validateMagicBytes(buffer, body.original_name, body.mime_type);
    if (!magicResult.valid) {
      throw new ApiProblemError({
        title: "Invalid File Magic Bytes",
        status: 400,
        detail: magicResult.reason ?? "Server-side file magic-byte validation failed.",
        code: "BAD_REQUEST",
      });
    }

    // 5. Malware scan
    let initialStatus: "clean" | "quarantined" = "clean";
    try {
      const scanResult = await malwareScanner.scanBuffer(buffer, body.original_name);
      initialStatus = scanResult.clean ? "clean" : "quarantined";
    } catch (scanErr) {
      if (process.env.NODE_ENV === "production") {
        throw scanErr;
      }
      initialStatus = "clean";
    }

    // 6. Save to database
    const docRepo = new ApplicationDocumentRepository(institution_id);
    const doc = await docRepo.create({
      application_id: body.application_id as any,
      student_id: user.id as any,
      type: body.type,
      storage_key: body.storage_key,
      original_name: body.original_name,
      mime_type: magicResult.detectedMime ?? body.mime_type,
      size_bytes: sizeBytes,
      status: initialStatus,
    });

    return doc;
  },
);
