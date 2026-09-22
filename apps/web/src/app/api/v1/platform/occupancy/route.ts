import { type NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/auth/api-key-auth.js";
import { getOccupancyMetrics } from "@/lib/inventory/occupancy.js";

export const dynamic = "force-dynamic";

/**
 * Public Platform API for External Systems (e.g. P04 Hostel Room Exchange).
 * Authenticated via "Authorization: Bearer <key>" with scope "occupancy:read".
 * Rate limited and audited on every invocation.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req, "occupancy:read");
  if (!auth.success) {
    return auth.response;
  }

  const { institutionId, apiKey } = auth.context;
  const metrics = await getOccupancyMetrics(institutionId, true);

  return NextResponse.json(
    {
      success: true,
      authenticated_as: {
        key_id: apiKey._id.toString(),
        key_name: apiKey.name,
        prefix: apiKey.key_prefix,
        scope: "occupancy:read",
      },
      occupancy: metrics,
    },
    {
      status: 200,
      headers: {
        "X-RateLimit-Limit": String(apiKey.rate_limit),
      },
    },
  );
}
