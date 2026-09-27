import crypto from "crypto";

export function signHmacPayload(payload: string | object, secret: string): string {
  const content = typeof payload === "string" ? payload : JSON.stringify(payload);
  return crypto.createHmac("sha256", secret).update(content).digest("hex");
}

export function verifyHmacSignature(
  payload: string | object,
  secret: string,
  expectedSignature: string,
): boolean {
  const calculated = signHmacPayload(payload, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculated, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );
  } catch {
    return false;
  }
}
