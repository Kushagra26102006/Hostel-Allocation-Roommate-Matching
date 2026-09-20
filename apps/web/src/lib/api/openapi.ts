import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Register Bearer / Cookie Auth
registry.registerComponent("securitySchemes", "SessionAuth", {
  type: "apiKey",
  in: "cookie",
  name: "hostelhub.session-token",
  description: "NextAuth JWT session token stored in httpOnly secure cookie.",
});

// RFC 9457 Problem Details Schema
export const ProblemDetailsSchema = registry.register(
  "ProblemDetails",
  z.object({
    type: z
      .string()
      .url()
      .openapi({ example: "https://hostelhub.campus.edu/probs/validation-failed" }),
    title: z.string().openapi({ example: "Validation Failed" }),
    status: z.number().int().openapi({ example: 422 }),
    detail: z.string().openapi({ example: "One or more input fields failed schema validation." }),
    instance: z.string().openapi({ example: "/api/v1/applications" }),
    code: z.string().openapi({ example: "VALIDATION_FAILED" }),
    requestId: z.string().openapi({ example: "req_9f8d7c6b5a" }),
    invalidParams: z
      .array(
        z.object({
          name: z.string(),
          reason: z.string(),
        }),
      )
      .optional(),
  }),
);

// Health Endpoint Schema
export const HealthResponseSchema = registry.register(
  "HealthResponse",
  z.object({
    status: z.literal("ok"),
    ts: z.string().datetime(),
  }),
);

registry.registerPath({
  method: "get",
  path: "/api/v1/health",
  summary: "Liveness Probe",
  description: "Always returns 200 if the web process is running.",
  responses: {
    200: {
      description: "Service is healthy and responding.",
      content: { "application/json": { schema: HealthResponseSchema } },
    },
  },
});

// Ready Endpoint Schema
export const ReadyResponseSchema = registry.register(
  "ReadyResponse",
  z.object({
    status: z.enum(["ok", "degraded"]),
    deps: z.object({
      mongo: z.string(),
      redis: z.string(),
      minio: z.string(),
    }),
  }),
);

registry.registerPath({
  method: "get",
  path: "/api/v1/ready",
  summary: "Readiness Probe",
  description: "Checks MongoDB, Redis, and MinIO connectivity.",
  responses: {
    200: {
      description: "All downstream dependencies are ready.",
      content: { "application/json": { schema: ReadyResponseSchema } },
    },
    503: {
      description: "One or more downstream dependencies are degraded.",
      content: { "application/json": { schema: ReadyResponseSchema } },
    },
  },
});

// User Context /me Endpoint Schema
export const MeResponseSchema = registry.register(
  "MeResponse",
  z.object({
    user: z.object({
      id: z.string(),
      email: z.string().email(),
      name: z.string(),
      institution_id: z.string(),
      roles: z.array(z.string()),
      hostelAssignments: z.array(z.string()),
      mfaEnabled: z.boolean(),
    }),
    capabilities: z.array(z.string()),
    activeRole: z.string(),
  }),
);

registry.registerPath({
  method: "get",
  path: "/api/v1/me",
  summary: "Current Authenticated User Profile",
  description:
    "Returns the authenticated user context, granted roles, capabilities, and institution ID.",
  security: [{ SessionAuth: [] }],
  responses: {
    200: {
      description: "Current user context retrieved successfully.",
      content: { "application/json": { schema: MeResponseSchema } },
    },
    401: {
      description: "User is not authenticated.",
      content: { "application/problem+json": { schema: ProblemDetailsSchema } },
    },
  },
});

/**
 * Builds and returns the complete OpenAPI 3.1 Specification document.
 */
export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "HostelHub Campus Allocation API",
      version: "1.0.0",
      description:
        "University residential allocation, Gale-Shapley matching, explainability, and cryptographic audit ledger.",
      contact: {
        name: "HostelHub Core Team",
        email: "support@hostelhub.campus.edu",
      },
    },
    servers: [
      {
        url: process.env["APP_URL"] ?? "http://localhost:3000",
        description: "Current environment",
      },
    ],
  });
}
