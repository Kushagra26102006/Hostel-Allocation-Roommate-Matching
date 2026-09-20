import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import type { UserRole } from "@hostelhub/shared";

/**
 * Roles for which multi-factor authentication (MFA) is strictly mandatory.
 */
export const MANDATORY_MFA_ROLES: readonly UserRole[] = [
  "hostel_admin",
  "chief_warden",
  "sys_admin",
] as const;

/**
 * Checks whether any of the granted roles requires mandatory MFA.
 */
export function isMfaMandatoryForRoles(roles: readonly UserRole[]): boolean {
  return roles.some((r) => (MANDATORY_MFA_ROLES as readonly string[]).includes(r));
}

/**
 * Generates a new cryptographic base32 secret for TOTP.
 */
export function generateTotpSecret(): string {
  return generateSecret();
}

/**
 * Creates the otpauth:// URI for authenticator applications.
 */
export function getTotpKeyUri(email: string, secret: string, issuer = "HostelHub"): string {
  return generateURI({ secret, label: email, issuer });
}

/**
 * Generates a data URL containing the QR code image for enrollment.
 */
export async function generateQrCode(otpAuthUri: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 240,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}

/**
 * Verifies a 6-digit TOTP token against the user's secret.
 */
export function verifyTotpToken(token: string, secret: string): boolean {
  const sanitized = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(sanitized)) {
    return false;
  }

  try {
    const result = verifySync({ token: sanitized, secret });
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Hashes a backup code with HMAC-SHA256 using master encryption key.
 */
export function hashBackupCode(code: string): string {
  const masterKey =
    process.env["MASTER_ENCRYPTION_KEY"] ?? "hostelhub_master_secret_encryption_key_32_bytes_long!";
  return createHmac("sha256", masterKey).update(code.trim().toUpperCase()).digest("hex");
}

/**
 * Generates single-use backup codes with >= 64 bits of entropy (8 bytes per part).
 * Returns plain codes (to show to user once) and hashed codes (to persist in DB).
 */
export function generateBackupCodes(count = 10): {
  plainCodes: string[];
  hashedCodes: string[];
} {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    // 8 bytes (64 bits of entropy) per code
    const part1 = randomBytes(4).toString("hex").toUpperCase();
    const part2 = randomBytes(4).toString("hex").toUpperCase();
    const code = `${part1}-${part2}`;

    plainCodes.push(code);
    hashedCodes.push(hashBackupCode(code));
  }

  return { plainCodes, hashedCodes };
}

/**
 * Verifies a candidate backup code against stored hashed codes using constant-time comparison.
 */
export function verifyAndConsumeBackupCode(
  candidateCode: string,
  storedHashedCodes: string[],
): {
  valid: boolean;
  remainingHashedCodes: string[];
} {
  const candidateHash = hashBackupCode(candidateCode);
  const candidateBuffer = Buffer.from(candidateHash, "hex");

  let matchIndex = -1;

  for (let i = 0; i < storedHashedCodes.length; i++) {
    const storedHash = storedHashedCodes[i];
    if (!storedHash) continue;

    const storedBuffer = Buffer.from(storedHash, "hex");
    if (
      storedBuffer.length === candidateBuffer.length &&
      timingSafeEqual(storedBuffer, candidateBuffer)
    ) {
      matchIndex = i;
      break;
    }
  }

  if (matchIndex !== -1) {
    const remaining = [...storedHashedCodes];
    remaining.splice(matchIndex, 1);
    return { valid: true, remainingHashedCodes: remaining };
  }

  return { valid: false, remainingHashedCodes: storedHashedCodes };
}
