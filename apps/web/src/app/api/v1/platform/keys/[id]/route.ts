import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApiKeyService } from "@hostelhub/db";

const paramsSchema = z.object({
  id: z.string().min(1, "Key ID is required"),
});

export const dynamic = "force-dynamic";

export const DELETE = apiHandler(
  {
    permission: "api_keys:manage",
    params: paramsSchema,
    operationId: "revokeApiKey",
    summary: "Revoke an API key immediately",
  },
  async ({ institution_id, params }) => {
    const service = new ApiKeyService(institution_id);
    const updated = await service.revokeApiKey(params.id);

    if (!updated) {
      return {
        success: false,
        error: "API key not found",
      };
    }

    return {
      success: true,
      revokedKeyId: params.id,
      revoked_at: updated.revoked_at,
    };
  },
);
