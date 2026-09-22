import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApiKeyService, type ApiKeyScope } from "@hostelhub/db";

const createKeySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  scopes: z
    .array(z.enum(["occupancy:read", "allocations:read", "inventory:read", "reports:read"]))
    .min(1, "Select at least one scope"),
  rate_limit: z.coerce.number().int().min(10).max(1000).default(60),
});

export const dynamic = "force-dynamic";

export const GET = apiHandler(
  {
    permission: "api_keys:manage",
    operationId: "listApiKeys",
    summary: "List all API keys for tenant",
  },
  async ({ institution_id }) => {
    const service = new ApiKeyService(institution_id);
    const keys = await service.listApiKeys();

    return {
      keys: keys.map((k) => ({
        id: k._id.toString(),
        name: k.name,
        key_prefix: k.key_prefix,
        scopes: k.scopes,
        rate_limit: k.rate_limit,
        last_used_at: k.last_used_at,
        revoked: k.revoked,
        revoked_at: k.revoked_at,
        createdAt: k.createdAt,
      })),
    };
  },
);

export const POST = apiHandler(
  {
    permission: "api_keys:manage",
    body: createKeySchema,
    operationId: "createApiKey",
    summary: "Generate a new API key with hashed storage",
  },
  async ({ institution_id, body }) => {
    const service = new ApiKeyService(institution_id);
    const result = await service.createApiKey({
      name: body.name,
      scopes: body.scopes as ApiKeyScope[],
      rate_limit: body.rate_limit,
    });

    return {
      success: true,
      plaintextToken: result.plaintextToken,
      key: {
        id: result.apiKey._id.toString(),
        name: result.apiKey.name,
        key_prefix: result.apiKey.key_prefix,
        scopes: result.apiKey.scopes,
        rate_limit: result.apiKey.rate_limit,
        revoked: result.apiKey.revoked,
        createdAt: result.apiKey.createdAt,
      },
      warning: "Store this secret key securely now. It will NEVER be shown again.",
    };
  },
);
