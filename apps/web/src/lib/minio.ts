/**
 * apps/web — lib/minio.ts
 *
 * Lazy singleton AWS S3Client pointed at MinIO.
 * MinIO is fully S3-compatible so no MinIO-specific SDK is needed.
 */

import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

declare global {
  var __s3Client: S3Client | undefined;
}

/**
 * Returns the cached S3Client, creating it on first call.
 */
export function getS3Client(): S3Client {
  if (!globalThis.__s3Client) {
    const endpoint = process.env["S3_ENDPOINT"];
    const accessKeyId = process.env["S3_ACCESS_KEY"];
    const secretAccessKey = process.env["S3_SECRET_KEY"];

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error("S3_ENDPOINT, S3_ACCESS_KEY, and S3_SECRET_KEY must be set");
    }

    globalThis.__s3Client = new S3Client({
      endpoint,
      region: "us-east-1", // required by SDK even for MinIO
      forcePathStyle: true, // MinIO requires path-style access
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return globalThis.__s3Client;
}

/**
 * Checks whether the configured bucket exists and is reachable.
 * Throws if MinIO is down or the bucket doesn't exist.
 */
export async function pingMinio(): Promise<void> {
  const client = getS3Client();
  const bucket = process.env["S3_BUCKET"];
  if (!bucket) throw new Error("S3_BUCKET environment variable is not set");

  await client.send(new HeadBucketCommand({ Bucket: bucket }));
}
