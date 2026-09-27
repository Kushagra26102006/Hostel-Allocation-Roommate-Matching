import fs from "fs";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

export interface StoragePort {
  uploadFile(key: string, data: Buffer | Uint8Array | string, contentType: string): Promise<string>;
  downloadFile(key: string): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
  getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds?: number,
  ): Promise<string>;
  getPresignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export class LocalStorageAdapter implements StoragePort {
  private baseDir: string;

  constructor(baseDir = "./uploads") {
    this.baseDir = path.resolve(baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getFilePath(key: string): string {
    const safeKey = key.replace(/[^a-zA-Z0-9._-]/g, "_");
    return path.join(this.baseDir, safeKey);
  }

  async uploadFile(
    key: string,
    data: Buffer | Uint8Array | string,
    _contentType: string,
  ): Promise<string> {
    const filePath = this.getFilePath(key);
    await fs.promises.writeFile(filePath, data);
    return `/api/v1/storage/local/${encodeURIComponent(key)}`;
  }

  async downloadFile(key: string): Promise<Buffer> {
    const filePath = this.getFilePath(key);
    return fs.promises.readFile(filePath);
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  async getPresignedUploadUrl(key: string, _contentType: string): Promise<string> {
    return `/api/v1/storage/local/${encodeURIComponent(key)}`;
  }

  async getPresignedDownloadUrl(key: string): Promise<string> {
    return `/api/v1/storage/local/${encodeURIComponent(key)}`;
  }
}

export class S3StorageAdapter implements StoragePort {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = env.STORAGE_BUCKET;
    const config: S3ClientConfig = {
      region: env.STORAGE_REGION,
      forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    };
    if (env.STORAGE_ENDPOINT) {
      config.endpoint = env.STORAGE_ENDPOINT;
    }
    if (env.STORAGE_ACCESS_KEY && env.STORAGE_SECRET_KEY) {
      config.credentials = {
        accessKeyId: env.STORAGE_ACCESS_KEY,
        secretAccessKey: env.STORAGE_SECRET_KEY,
      };
    }
    this.client = new S3Client(config);
  }

  async uploadFile(
    key: string,
    data: Buffer | Uint8Array | string,
    contentType: string,
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: Buffer.from(data),
        ContentType: contentType,
      }),
    );
    return `s3://${this.bucket}/${key}`;
  }

  async downloadFile(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    const stream = response.Body;
    if (!stream) {
      throw new Error(`File not found: ${key}`);
    }
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getPresignedUploadUrl(key: string, contentType: string, expiresIn = 900): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }
}

export function getStorageAdapter(): StoragePort {
  if (
    (env.STORAGE_PROVIDER === "s3" || env.STORAGE_PROVIDER === "minio") &&
    env.STORAGE_ACCESS_KEY
  ) {
    try {
      return new S3StorageAdapter();
    } catch (e) {
      logger.warn({ err: e }, "Falling back to local storage adapter");
      return new LocalStorageAdapter();
    }
  }
  return new LocalStorageAdapter();
}
