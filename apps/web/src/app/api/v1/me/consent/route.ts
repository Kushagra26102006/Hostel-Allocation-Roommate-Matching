import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ConsentRecordModel, CompatibilityResponseModel } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors.js";

const postConsentSchema = z.object({
  purpose: z.string().default("compatibility_questionnaire"),
  action: z.enum(["grant", "withdraw"]).default("grant"),
  text_version: z.string().default("1.0"),
});

export const GET = apiHandler(
  {
    operationId: "getMyConsents",
    summary: "Retrieve student active consent records",
  },
  async ({ user, institution_id }) => {
    if (!user) {
      throw new ApiProblemError({
        title: "Unauthorized",
        status: 401,
        detail: "Authentication required",
        code: "UNAUTHORIZED",
      });
    }

    const records = await ConsentRecordModel.find({
      institution_id,
      student_id: user.id,
    }).sort({ createdAt: -1 });

    return records;
  },
);

export const POST = apiHandler(
  {
    body: postConsentSchema,
    operationId: "updateConsent",
    summary: "Grant or withdraw consent for data processing purpose",
  },
  async ({ user, institution_id, body }) => {
    if (!user) {
      throw new ApiProblemError({
        title: "Unauthorized",
        status: 401,
        detail: "Authentication required",
        code: "UNAUTHORIZED",
      });
    }

    if (body.action === "grant") {
      const record = await ConsentRecordModel.findOneAndUpdate(
        { institution_id, student_id: user.id, purpose: body.purpose },
        {
          $set: {
            granted_at: new Date(),
            text_version: body.text_version,
          },
          $unset: { withdrawn_at: "" },
        },
        { upsert: true, new: true },
      );
      return record;
    } else {
      // Action: withdraw consent => mark withdrawn AND hard-delete questionnaire data
      const record = await ConsentRecordModel.findOneAndUpdate(
        { institution_id, student_id: user.id, purpose: body.purpose },
        { $set: { withdrawn_at: new Date() } },
        { new: true },
      );

      if (body.purpose === "compatibility_questionnaire") {
        await CompatibilityResponseModel.deleteOne({
          institution_id,
          student_id: user.id,
        });
      }

      return record;
    }
  },
);
