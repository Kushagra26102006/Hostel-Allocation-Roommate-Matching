import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import {
  CompatibilityResponseModel,
  ConsentRecordModel,
} from "@hostelhub/db";
import { encryptPayload, decryptPayload } from "@hostelhub/shared";
import { ApiProblemError } from "@/lib/api/errors.js";

const submitQuestionnaireSchema = z.object({
  answers: z.record(
    z.object({
      value: z.union([z.number(), z.string()]),
      importance: z.number().min(1).max(3).default(2),
      dealBreaker: z.boolean().optional(),
    }),
  ),
});

export const GET = apiHandler(
  {
    operationId: "getMyQuestionnaire",
    summary: "Retrieve student's own decrypted compatibility questionnaire answers",
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

    const record = await CompatibilityResponseModel.findOne({
      institution_id,
      student_id: user.id,
    }).exec();

    if (!record) {
      return { answers: null, hasSubmitted: false };
    }

    // Decrypt only for the owner student
    const decryptedAnswers = decryptPayload(
      {
        keyId: record.key_id,
        iv: record.iv,
        authTag: record.auth_tag,
        ciphertext: record.ciphertext,
      },
      institution_id,
    );

    return {
      answers: decryptedAnswers,
      hasSubmitted: true,
      updatedAt: record.updatedAt,
    };
  },
);

export const POST = apiHandler(
  {
    body: submitQuestionnaireSchema,
    operationId: "submitQuestionnaire",
    summary: "Encrypt and save student compatibility questionnaire answers",
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

    // Check active consent
    const consent = await ConsentRecordModel.findOne({
      institution_id,
      student_id: user.id,
      purpose: "compatibility_questionnaire",
      withdrawn_at: { $exists: false },
    }).exec();

    if (!consent) {
      throw new ApiProblemError({
        title: "Consent Required",
        status: 422,
        detail: "Active consent is required to process and store compatibility responses.",
        code: "VALIDATION_FAILED",
      });
    }

    // Encrypt answers (AES-256-GCM with HKDF data key)
    const encrypted = encryptPayload(body.answers, institution_id);

    // Save ONLY ciphertext to DB
    const responseDoc = await CompatibilityResponseModel.findOneAndUpdate(
      { institution_id, student_id: user.id },
      {
        $set: {
          key_id: encrypted.keyId,
          iv: encrypted.iv,
          auth_tag: encrypted.authTag,
          ciphertext: encrypted.ciphertext,
        },
      },
      { upsert: true, new: true },
    );

    return {
      message: "Compatibility questionnaire encrypted and saved successfully",
      hasSubmitted: true,
      updatedAt: responseDoc.updatedAt,
    };
  },
);

export const DELETE = apiHandler(
  {
    operationId: "deleteQuestionnaire",
    summary: "Hard-delete student compatibility questionnaire answers and withdraw consent",
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

    // 1. Hard-delete encrypted compatibility response
    await CompatibilityResponseModel.deleteOne({
      institution_id,
      student_id: user.id,
    });

    // 2. Mark consent as withdrawn
    await ConsentRecordModel.findOneAndUpdate(
      { institution_id, student_id: user.id, purpose: "compatibility_questionnaire" },
      { $set: { withdrawn_at: new Date() } },
    );

    return {
      message: "Compatibility questionnaire answers hard-deleted and consent withdrawn successfully",
      deletedAt: new Date().toISOString(),
    };
  },
);
