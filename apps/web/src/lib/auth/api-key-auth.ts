import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  connectDb,
  ApiKeyRepository,
  AuditService,
  type ApiKeyDocument,
  type ApiKeyScope,
} from "@hostelhub/db";
import { checkSlidingWindowRateLimit } from "./rate-limiter.js";

export interface AuthenticatedApiKeyContext {
  apiKey: ApiKeyDocument;
  institutionId: string;
}

export type ApiKeyAuthResult =
  | { success: true; context: AuthenticatedApiKeyContext }
  | { success: false; response: NextResponse };

/**
 * Authenticates an incoming HTTP request using "Authorization: Bearer <key>".
 * Enforces:
 * 1. Cryptographic token presence and SHA-256 hash lookup.
 * 2. Active, non-revoked key state.
 * 3. Scope authorization (e.g. occupancy:read, allocations:read).
 * 4. Per-key sliding window rate limits.
 * 5. Tamper-evident hash chain audit logging of every invocation.
 */
export async function authenticateApiKey(
  req: Request,
  requiredScope?: ApiKeyScope,
): Promise<ApiKeyAuthResult> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      response: new NextResponse(
        JSON.stringify({
          type: "https://hostelhub.campus.edu/probs/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Missing or malformed Authorization header. Expected format: 'Bearer <api_key>'.",
          code: "UNAUTHORIZED",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/problem+json" },
        },
      ),
    };
  }

  const rawToken = authHeader.slice(7).trim();
  if (!rawToken) {
    return {
      success: false,
      response: new NextResponse(
        JSON.stringify({
          type: "https://hostelhub.campus.edu/probs/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Bearer token cannot be empty.",
          code: "UNAUTHORIZED",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/problem+json" },
        },
      ),
    };
  }

  await connectDb();

  // SHA-256 hash token to look up secret
  const hashedSecret = crypto.createHash("sha256").update(rawToken).digest("hex");

  // Lookup without tenant filter initially to resolve tenant context from key
  const repo = new ApiKeyRepository(null);
  const key = await repo.findByHashedSecret(hashedSecret);

  if (!key) {
    return {
      success: false,
      response: new NextResponse(
        JSON.stringify({
          type: "https://hostelhub.campus.edu/probs/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Invalid API key.",
          code: "INVALID_API_KEY",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/problem+json" },
        },
      ),
    };
  }

  if (key.revoked) {
    return {
      success: false,
      response: new NextResponse(
        JSON.stringify({
          type: "https://hostelhub.campus.edu/probs/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "API key has been revoked and can no longer be used.",
          code: "REVOKED_API_KEY",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/problem+json" },
        },
      ),
    };
  }

  if (requiredScope && !key.scopes.includes(requiredScope)) {
    return {
      success: false,
      response: new NextResponse(
        JSON.stringify({
          type: "https://hostelhub.campus.edu/probs/forbidden",
          title: "Forbidden",
          status: 403,
          detail: `API key lacks required scope: "${requiredScope}". Granted scopes: [${key.scopes.join(", ")}].`,
          code: "FORBIDDEN_SCOPE",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/problem+json" },
        },
      ),
    };
  }

  // Enforce Per-Key Rate Limiting
  const rateLimitKey = `apikey:${key._id.toString()}`;
  const rateLimitResult = await checkSlidingWindowRateLimit(rateLimitKey, key.rate_limit, 60);

  if (!rateLimitResult.allowed) {
    return {
      success: false,
      response: new NextResponse(
        JSON.stringify({
          type: "https://hostelhub.campus.edu/probs/rate-limit-exceeded",
          title: "Rate Limit Exceeded",
          status: 429,
          detail: `API key rate limit of ${key.rate_limit} requests/minute exceeded. Try again in ${rateLimitResult.resetAfterSeconds} seconds.`,
          code: "RATE_LIMIT_EXCEEDED",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/problem+json",
            "Retry-After": String(rateLimitResult.resetAfterSeconds),
          },
        },
      ),
    };
  }

  // Update last used timestamp
  await repo.recordUsage(key._id);

  // Audit Every Use
  try {
    const pathname = new URL(req.url).pathname;
    await AuditService.append({
      institution_id: key.institution_id,
      actor: {
        id: key._id.toString(),
        roles: ["api_key"],
        email: `${key.name} (${key.key_prefix})`,
      },
      action: "platform:api_key:invoke",
      target: {
        key_id: key._id.toString(),
        key_prefix: key.key_prefix,
        path: pathname,
        method: req.method,
        scope: requiredScope ?? "general",
      },
    });
  } catch {
    // Non-blocking audit failure
  }

  return {
    success: true,
    context: {
      apiKey: key,
      institutionId: key.institution_id.toString(),
    },
  };
}
