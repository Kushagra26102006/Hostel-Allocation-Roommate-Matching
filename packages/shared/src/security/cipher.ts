import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

export interface EncryptedPayload {
  keyId: string;
  iv: string; // Hex string (24 chars)
  authTag: string; // Hex string (32 chars)
  ciphertext: string; // Base64 string
}

import { getWebEnv } from "../env.js";

function getMasterKey(): string {
  return getWebEnv().MASTER_ENCRYPTION_KEY;
}

function getKeyId(): string {
  return getWebEnv().ENCRYPTION_KEY_ID;
}

// In-memory key registry for key rotation support
const keyRegistry: Record<string, string> = {};

export function registerMasterKey(keyId: string, masterKey: string): void {
  keyRegistry[keyId] = masterKey;
}

export function getMasterKeyForId(keyId: string): string {
  if (keyRegistry[keyId]) {
    return keyRegistry[keyId];
  }
  return getMasterKey();
}

/**
 * Derives a 32-byte per-institution AES-256 key using HKDF.
 */
export function deriveInstitutionKey(
  institutionId: string,
  keyId?: string,
  masterKeyStr?: string,
): Buffer {
  const masterKey = masterKeyStr ?? (keyId ? getMasterKeyForId(keyId) : getMasterKey());
  const masterKeyBuffer = Buffer.from(masterKey, "utf8");
  const salt = Buffer.from(`institution-salt-${institutionId}`, "utf8");
  const info = Buffer.from("hostelhub-questionnaire-aes-256-gcm", "utf8");

  return Buffer.from(hkdfSync("sha256", masterKeyBuffer, salt, info, 32));
}

/**
 * Encrypts arbitrary plaintext object using AES-256-GCM.
 * Binds payload with Additional Authenticated Data (AAD).
 */
export function encryptPayload(
  data: unknown,
  institutionId: string,
  keyId?: string,
): EncryptedPayload {
  const actualKeyId = keyId ?? getKeyId();
  const key = deriveInstitutionKey(institutionId, actualKeyId);
  const iv = randomBytes(12); // 96-bit (12-byte) IV for GCM

  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  const aad = Buffer.from(`${institutionId}:${actualKeyId}`, "utf8");
  cipher.setAAD(aad);

  const plaintext = JSON.stringify(data);
  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");

  const authTag = cipher.getAuthTag().toString("hex");

  return {
    keyId: actualKeyId,
    iv: iv.toString("hex"),
    authTag,
    ciphertext,
  };
}

/**
 * Decrypts AES-256-GCM payload using per-institution HKDF key.
 * Validates IV length (12 bytes), Auth Tag length (16 bytes), and AAD.
 */
export function decryptPayload<T = unknown>(
  payload: EncryptedPayload,
  institutionId: string,
  overrideMasterKey?: string,
): T {
  if (!payload || !payload.ciphertext || !payload.iv || !payload.authTag) {
    throw new Error("Invalid encrypted payload structure");
  }

  const ivBuffer = Buffer.from(payload.iv, "hex");
  if (ivBuffer.length !== 12) {
    throw new Error("Invalid IV length: GCM IV must be 12 bytes");
  }

  const tagBuffer = Buffer.from(payload.authTag, "hex");
  if (tagBuffer.length !== 16) {
    throw new Error("Invalid Auth Tag length: GCM Auth Tag must be 16 bytes");
  }

  const keyId = payload.keyId || getKeyId();
  const key = deriveInstitutionKey(institutionId, keyId, overrideMasterKey);

  const decipher = createDecipheriv("aes-256-gcm", key, ivBuffer, { authTagLength: 16 });
  const aad = Buffer.from(`${institutionId}:${keyId}`, "utf8");
  decipher.setAAD(aad);
  decipher.setAuthTag(tagBuffer);

  let plaintext = decipher.update(payload.ciphertext, "base64", "utf8");
  plaintext += decipher.final("utf8");

  return JSON.parse(plaintext) as T;
}

export const encryptAnswers = encryptPayload;
export const decryptAnswers = decryptPayload;
