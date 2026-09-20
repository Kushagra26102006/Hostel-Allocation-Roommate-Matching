import { type NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { randomUUID } from "node:crypto";
import { logger, type Capability, hasPermission } from "@hostelhub/shared";
import type { SessionUser } from "@/lib/auth/policy";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/policy";
import {
  checkIdempotency,
  saveIdempotentResponse,
} from "./idempotency.js";
import { checkSlidingWindowRateLimit } from "@/lib/auth/rate-limiter";
import {
  ApiProblemError,
  MissingIdempotencyKeyError,
  RateLimitExceededError,
  toProblemResponse,
} from "./errors.js";

export interface ApiHandlerConfig<
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
> {
  permission?: Capability | Capability[] | null;
  public?: boolean;
  params?: z.ZodType<TParams>;
  query?: z.ZodType<TQuery>;
  body?: z.ZodType<TBody>;
  idempotent?: boolean;
  rateLimit?: {
    limit: number;
    windowSeconds: number;
  };
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
}

export interface ApiHandlerContext<
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
> {
  req: Request;
  user: SessionUser | null;
  institution_id: string;
  requestId: string;
  params: TParams;
  query: TQuery;
  body: TBody;
  setHeader: (name: string, value: string) => void;
}

export interface ApiRouteHandler {
  (): Promise<NextResponse>;
  (
    rawReq: Request | NextRequest,
    routeContext?: { params?: Promise<Record<string, string>> | Record<string, string> },
  ): Promise<NextResponse>;
  (
    rawReq: Request | NextRequest,
    routeContext: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse>;
}

export function apiHandler<TParams = unknown, TQuery = unknown, TBody = unknown, TRes = unknown>(
  config: ApiHandlerConfig<TParams, TQuery, TBody>,
  handler: (ctx: ApiHandlerContext<TParams, TQuery, TBody>) => Promise<TRes | NextResponse>,
): ApiRouteHandler {
  const routeFn: ApiRouteHandler = (async (
    rawReq?: Request | NextRequest,
    routeContext?: { params?: Promise<Record<string, string>> | Record<string, string> },
  ): Promise<NextResponse> => {
    const startTime = performance.now();

    // Support caller invoking without arguments (e.g. unit tests for GET /api/v1/health)
    const req =
      rawReq ??
      new Request("http://localhost:3000/api/endpoint", {
        method: "GET",
      });

    const requestId = req.headers.get("x-request-id") ?? `req_${randomUUID()}`;
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;

    let userId: string | undefined;
    let institutionId = "";
    let statusCode = 200;

    const extraHeaders: Record<string, string> = {
      "X-Request-Id": requestId,
    };

    const setHeader = (name: string, value: string) => {
      extraHeaders[name] = value;
    };

    try {
      // 1. Authenticate unless explicitly marked public
      let user: SessionUser | null = null;

      if (!config.public) {
        const { auth } = await import("@/auth");
        const session = await auth();
        if (!session?.user?.id) {
          throw new UnauthorizedError("Authentication required to access this endpoint.");
        }

        user = {
          id: session.user.id,
          email: session.user.email ?? "",
          name: session.user.name ?? "",
          institution_id: session.user.institution_id ?? "",
          roles: session.user.roles ?? ["student"],
          hostelAssignments: session.user.hostelAssignments ?? [],
          mfaPending: session.user.mfaPending,
        };

        userId = user.id;
        institutionId = user.institution_id;

        // Defense-in-depth: Enforce mfaPending inside apiHandler for non-MFA/auth routes
        if (
          user.mfaPending &&
          !pathname.startsWith("/api/mfa") &&
          !pathname.startsWith("/api/auth") &&
          !pathname.startsWith("/mfa")
        ) {
          throw new ForbiddenError(
            "MFA verification is required before accessing this endpoint.",
          );
        }

        // Check required permission
        if (config.permission) {
          const perms = Array.isArray(config.permission)
            ? config.permission
            : [config.permission];

          const hasAccess = perms.some((p) => hasPermission(user!.roles, p));
          if (!hasAccess) {
            throw new ForbiddenError(
              `User lacks required permission for this operation: [${perms.join(", ")}].`,
              perms[0],
            );
          }
        }
      } else {
        // For public endpoints, extract institution_id from header if present
        institutionId = req.headers.get("x-institution-id") ?? "";
      }

      // 2. Per-Route Rate Limiting
      if (config.rateLimit) {
        const rateKey = `route:${pathname}:${userId ?? req.headers.get("x-forwarded-for") ?? "anon"}`;
        const rl = await checkSlidingWindowRateLimit(
          rateKey,
          config.rateLimit.limit,
          config.rateLimit.windowSeconds,
        );

        if (!rl.allowed) {
          throw new RateLimitExceededError(
            `Rate limit exceeded for route "${pathname}". Try again in ${rl.resetAfterSeconds}s.`,
            rl.resetAfterSeconds,
          );
        }
      }

      // 3. Idempotency Check (for POST, PUT, PATCH, DELETE when enabled)
      let idempotencyKey: string | null = null;
      let rawBodyText = "";

      if (config.idempotent) {
        idempotencyKey = req.headers.get("idempotency-key");
        if (!idempotencyKey) {
          throw new MissingIdempotencyKeyError(
            "Idempotency-Key header is required for this operation.",
          );
        }

        try {
          rawBodyText = await req.clone().text();
        } catch {
          rawBodyText = "";
        }

        if (rawBodyText.length > 1 * 1024 * 1024) {
          throw new ApiProblemError({
            title: "Payload Too Large",
            status: 413,
            detail: "Request body size exceeds maximum allowed limit (1MB).",
            code: "BAD_REQUEST",
          });
        }

        const idempResult = await checkIdempotency(
          idempotencyKey,
          institutionId,
          rawBodyText,
          userId ?? "anon",
          method,
          pathname,
        );

        if (idempResult.isReplay && idempResult.response) {
          statusCode = idempResult.response.status;
          logRequest(method, pathname, statusCode, performance.now() - startTime, userId, institutionId);
          return idempResult.response;
        }
      }

      // 4. Validate Params
      let parsedParams: TParams = {} as TParams;
      if (config.params) {
        const rawParams = routeContext?.params
          ? routeContext.params instanceof Promise
            ? await routeContext.params
            : routeContext.params
          : {};
        parsedParams = config.params.parse(rawParams);
      }

      // 5. Validate Query
      let parsedQuery: TQuery = {} as TQuery;
      if (config.query) {
        const queryObj = Object.fromEntries(url.searchParams.entries());
        parsedQuery = config.query.parse(queryObj);
      }

      // 6. Validate Body
      let parsedBody: TBody = {} as TBody;
      if (config.body) {
        let json: unknown;
        try {
          const bodyText = rawBodyText || (await req.text());
          if (bodyText.length > 1 * 1024 * 1024) {
            throw new ApiProblemError({
              title: "Payload Too Large",
              status: 413,
              detail: "Request body size exceeds maximum allowed limit (1MB).",
              code: "BAD_REQUEST",
            });
          }
          json = JSON.parse(bodyText);
        } catch (jsonErr) {
          if (jsonErr instanceof ApiProblemError) throw jsonErr;
          throw new ApiProblemError({
            title: "Malformed JSON",
            status: 400,
            detail: "The request body contains invalid JSON syntax.",
            code: "BAD_REQUEST",
          });
        }
        parsedBody = config.body.parse(json);
      }

      // 7. Invoke handler
      const result = await handler({
        req,
        user,
        institution_id: institutionId,
        requestId,
        params: parsedParams,
        query: parsedQuery,
        body: parsedBody,
        setHeader,
      });

      let finalResponse: NextResponse;

      if (result instanceof NextResponse) {
        finalResponse = result;
        // Merge headers
        for (const [k, v] of Object.entries(extraHeaders)) {
          finalResponse.headers.set(k, v);
        }
      } else {
        finalResponse = NextResponse.json(result, {
          status: 200,
          headers: extraHeaders,
        });
      }

      statusCode = finalResponse.status;

      // 8. Save Idempotent Response on successful 2xx status
      if (config.idempotent && idempotencyKey && statusCode >= 200 && statusCode < 300) {
        try {
          const bodyClone = await finalResponse.clone().text();
          const headerMap: Record<string, string> = {};
          finalResponse.headers.forEach((v, k) => {
            headerMap[k] = v;
          });
          await saveIdempotentResponse(
            idempotencyKey,
            institutionId,
            rawBodyText,
            statusCode,
            headerMap,
            bodyClone,
            userId ?? "anon",
            method,
            pathname,
          );
        } catch (err) {
          logger.warn(`Failed to cache idempotent response: ${(err as Error).message}`);
        }
      }

      logRequest(method, pathname, statusCode, performance.now() - startTime, userId, institutionId);
      return finalResponse;
    } catch (err) {
      logger.error({
        type: "api_error",
        pathname,
        method,
        requestId,
        error: (err as Error).message,
        stack: (err as Error).stack,
      });
      const problemRes = toProblemResponse(err, pathname, requestId);
      statusCode = problemRes.status;
      logRequest(method, pathname, statusCode, performance.now() - startTime, userId, institutionId);
      return problemRes;
    }
  }) as ApiRouteHandler;
  return routeFn;
}

function logRequest(
  method: string,
  pathname: string,
  status: number,
  durationMs: number,
  userId?: string,
  institutionId?: string,
): void {
  try {
    logger.info({
      type: "http_request",
      method,
      route: pathname,
      status,
      durationMs: Math.round(durationMs * 100) / 100,
      ...(userId ? { userId } : {}),
      ...(institutionId ? { institutionId } : {}),
    });
  } catch {
    // Safe fallback if logger transport thread exited in dev
  }
}
