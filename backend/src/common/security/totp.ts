import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

export function generateTotpSecret(): string {
  return generateSecret();
}

export function generateTotpKeyUri(
  userEmail: string,
  serviceName = "HostelHub",
  secret: string,
): string {
  return generateURI({ secret, label: userEmail, issuer: serviceName });
}

export async function generateTotpQrCodeDataUrl(keyUri: string): Promise<string> {
  return QRCode.toDataURL(keyUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 240,
  });
}

export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    const sanitized = token.replace(/\s+/g, "");
    const result = verifySync({ token: sanitized, secret });
    return result.valid;
  } catch {
    return false;
  }
}
