import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { SimulatorService, connectDb } from "@hostelhub/db";

const querySchema = z.object({
  cycleId: z.string().optional(),
});

export const GET = apiHandler(
  {
    permission: "allocation:run",
    query: querySchema,
    operationId: "getScenarioOptions",
    summary:
      "Fetch available cycle options, hostels, blocks, quotas, and weights for scenario builder",
  },
  async ({ institution_id, query }) => {
    await connectDb();

    const simulatorService = new SimulatorService();
    const options = await simulatorService.getScenarioOptions(institution_id, query.cycleId);

    return options;
  },
);
