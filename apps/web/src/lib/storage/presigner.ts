import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client } from "@/lib/minio.js";

export interface PresignedPutResult {
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
}

/**
  Generates a presigned PUT URL for direct client file uploads to MinIO/S3.
 */
export async function getPresignedPutUrl(
  fileName: string,
  mimeType: string,
  institutionId: string,
  studentId: string,
  sizeBytes?: number,
): Promise<PresignedPutResult> {
  const client = getS3Client();
  const bucket = process.env["S3_BUCKET"] ?? "hostelhub";
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const timestamp = Date.now();
  const storageKey = `tenants/${institutionId}/students/${studentId}/${timestamp}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    ContentType: mimeType,
    ...(sizeBytes ? { ContentLength: sizeBytes } : {}),
  });

  const expiresInSeconds = 900; // 15 minutes
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });

  return {
    uploadUrl,
    storageKey,
    expiresInSeconds,
  };
}

/**
  Generates a short-lived presigned GET URL for viewing or downloading clean files.
 */
export async function getPresignedGetUrl(
  storageKey: string,
  expiresInSeconds = 900,
): Promise<string> {
  const client = getS3Client();
  const bucket = process.env["S3_BUCKET"] ?? "hostelhub";

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: storageKey,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
