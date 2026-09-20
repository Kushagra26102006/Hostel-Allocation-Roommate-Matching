import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { lookupPincode } from "@/lib/services/pincode";

const paramsSchema = z.object({
  code: z.string().min(1),
});

export const GET = apiHandler(
  {
    params: paramsSchema,
    operationId: "lookupPincode",
    summary: "Lookup PIN code location details with Redis cache & fallback",
  },
  async ({ params }) => {
    const data = await lookupPincode(params.code);
    return data;
  },
);
