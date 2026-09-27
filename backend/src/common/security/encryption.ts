import crypto from "crypto";
import { env } from "../../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  return Buffer.from(env.ENCRYPTION_KEY, "hex");
}

export interface EncryptedPayload {
  iv: string; // hex
  authTag: string; // hex
  encryptedData: string; // hex
  version: number;
}

export function encryptPayload<T>(data: T): EncryptedPayload {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const json = JSON.stringify(data);
  let encrypted = cipher.update(json, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    encryptedData: encrypted,
    version: 1,
  };
}

export function decryptPayload<T>(payload: EncryptedPayload): T {
  const iv = Buffer.from(payload.iv, "hex");
  const authTag = Buffer.from(payload.authTag, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);

  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(payload.encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return JSON.parse(decrypted) as T;
}
