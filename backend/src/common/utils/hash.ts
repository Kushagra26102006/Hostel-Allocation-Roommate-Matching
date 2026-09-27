import crypto from "crypto";
import stringify from "fast-json-stable-stringify";

export function createDeterministicHash(data: unknown): string {
  const json = typeof data === "string" ? data : stringify(data);
  return crypto.createHash("sha256").update(json).digest("hex");
}

export function computeAuditHash(params: {
  prevHash: string;
  institutionId: string;
  actor: { userId: string; email: string; role: string };
  action: string;
  target: { resourceType: string; resourceId: string };
  before?: unknown;
  after?: unknown;
  timestamp: Date | string;
}): string {
  const payload = {
    prevHash: params.prevHash,
    institutionId: params.institutionId,
    actor: params.actor,
    action: params.action,
    target: params.target,
    before: params.before,
    after: params.after,
    timestamp:
      typeof params.timestamp === "string" ? params.timestamp : params.timestamp.toISOString(),
  };
  return createDeterministicHash(payload);
}
