import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ConsentRecordRepository, CompatibilityResponseRepository } from "@hostelhub/db";
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

    const consentRepo = new ConsentRecordRepository(institution_id);
    const records = await consentRepo.find({
      student_id: user.id,
    });

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

    const consentRepo = new ConsentRecordRepository(institution_id);

    if (body.action === "grant") {
      const record = await consentRepo.update(user.id, {
        $set: {
          granted_at: new Date(),
          text_version: body.text_version,
          purpose: body.purpose,
          student_id: user.id,
        },
        $unset: { withdrawn_at: "" },
      });
      return record;
    } else {
      // Action: withdraw consent => mark withdrawn AND hard-delete questionnaire data
      const record = await consentRepo.update(user.id, {
        $set: { withdrawn_at: new Date() },
      });

      if (body.purpose === "compatibility_questionnaire") {
        const compatRepo = new CompatibilityResponseRepository(institution_id);
        const existing = await compatRepo.findOne({ student_id: user.id });
        if (existing) {
          await compatRepo.update(existing._id, { $set: { ciphertext: "" } });
        }
      }

      return record;
    }
  },
);
