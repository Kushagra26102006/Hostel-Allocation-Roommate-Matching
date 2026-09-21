import { apiHandler } from "@/lib/api/handler.js";
import { precomputeWalkingDistances } from "@/lib/routing/distance-precomputer.js";

export const POST = apiHandler(
  {
    permission: "inventory:manage",
    operationId: "precomputeDistances",
    summary: "Trigger walking distance pre-computation for all hostel-block pairs",
  },
  async ({ institution_id }) => {
    const result = await precomputeWalkingDistances(institution_id);

    return {
      success: true,
      ...result,
    };
  },
);
