import { showProblemToast } from "./error-toast.js";
import { type ProblemDetails, ApiProblemError } from "../api/errors.js";
import type { paths, components } from "./schema.js";

export type SchemaComponents = components["schemas"];
export type ApiPaths = paths;

export interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  idempotencyKey?: string;
  ifMatch?: number | string;
  suppressToast?: boolean;
}

/**
 * Robust typed HTTP client that unwraps JSON responses, sends required headers,
 * and intercepts RFC 9457 Problem Details errors with automatic toast notifications.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    params,
    body,
    idempotencyKey,
    ifMatch,
    suppressToast = false,
    headers: customHeaders = {},
    ...customConfig
  } = options;

  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const queryStr = searchParams.toString();
    if (queryStr) {
      url += (url.includes("?") ? "&" : "?") + queryStr;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  if (ifMatch !== undefined) {
    headers["If-Match"] =
      typeof ifMatch === "number" ? `W/"${ifMatch}"` : ifMatch;
  }

  const config: RequestInit = {
    ...customConfig,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/problem+json")) {
      const problem = (await response.json()) as ProblemDetails;
      if (!suppressToast) {
        showProblemToast(problem);
      }
      throw new ApiProblemError(problem);
    }

    const text = await response.text();
    throw new Error(`HTTP error ${response.status}: ${text || response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return (await response.json()) as T;
}

/**
 * Typed client function for GET /api/v1/me
 */
export async function getMe(options?: RequestOptions): Promise<components["schemas"]["MeResponse"]> {
  return apiClient<components["schemas"]["MeResponse"]>("/api/v1/me", {
    method: "GET",
    ...options,
  });
}

/**
 * Typed client function for GET /api/v1/health
 */
export async function getHealth(options?: RequestOptions): Promise<components["schemas"]["HealthResponse"]> {
  return apiClient<components["schemas"]["HealthResponse"]>("/api/v1/health", {
    method: "GET",
    ...options,
  });
}

/**
 * Typed client function for GET /api/v1/ready
 */
export async function getReady(options?: RequestOptions): Promise<components["schemas"]["ReadyResponse"]> {
  return apiClient<components["schemas"]["ReadyResponse"]>("/api/v1/ready", {
    method: "GET",
    ...options,
  });
}
