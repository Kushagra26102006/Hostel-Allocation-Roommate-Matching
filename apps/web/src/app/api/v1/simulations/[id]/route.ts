import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { SimulatorService, connectDb } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors.js";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export const GET = apiHandler(
  {
    permission: "allocation:run",
    params: paramsSchema,
    operationId: "getSimulationBatch",
    summary: "Retrieve full what-if simulation batch details and scenario comparisons",
  },
  async ({ institution_id, params }) => {
    await connectDb();

    const simulatorService = new SimulatorService();
    const batch = await simulatorService.getSimulationBatch(params.id, institution_id);

    if (!batch) {
      throw new ApiProblemError({
        status: 404,
        title: "Not Found",
        detail: "Simulation batch not found",
        code: "NOT_FOUND",
      });
    }

    return batch;
  },
);
