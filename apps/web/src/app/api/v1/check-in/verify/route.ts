import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { connectDb, CheckInService } from "@hostelhub/db";

const verifySchema = z.object({
  token_or_code: z.string().min(1, "Token or pass code is required"),
});

export const POST = apiHandler(
  {
    permission: "checkin:manage",
    body: verifySchema,
    operationId: "verifyCheckInPass",
    summary: "Verify student allocation letter QR token or manual letter code",
  },
  async ({ user: _user, institution_id, body }) => {
    await connectDb();

    const service = new CheckInService(institution_id);
    const result = await service.verifyAndPrepareCheckIn(body.token_or_code);

    return {
      success: true,
      ...result,
    };
  },
);
