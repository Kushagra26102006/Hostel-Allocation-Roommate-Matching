import { z } from "zod";
import { Types } from "mongoose";
import { apiHandler } from "@/lib/api/handler.js";
import { CompatibilityResponseRepository, ConsentRecordRepository } from "@hostelhub/db";
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

    const repo = new CompatibilityResponseRepository(institution_id);
    const record = await repo.findOne({
      student_id: user.id,
    });

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
      user.id,
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
    const consentRepo = new ConsentRecordRepository(institution_id);
    const consent = await consentRepo.findOne({
      student_id: user.id,
      purpose: "compatibility_questionnaire",
      withdrawn_at: { $exists: false },
    });

    if (!consent) {
      throw new ApiProblemError({
        title: "Consent Required",
        status: 422,
        detail: "Active consent is required to process and store compatibility responses.",
        code: "VALIDATION_FAILED",
      });
    }

    // Encrypt answers (AES-256-GCM with HKDF data key)
    const encrypted = encryptPayload(body.answers, institution_id, user.id);

    // Save ONLY ciphertext to DB
    const compatRepo = new CompatibilityResponseRepository(institution_id);
    const existing = await compatRepo.findOne({ student_id: user.id });
    let responseDoc;
    if (existing) {
      responseDoc = await compatRepo.update(existing._id, {
        $set: {
          key_id: encrypted.keyId,
          iv: encrypted.iv,
          auth_tag: encrypted.authTag,
          ciphertext: encrypted.ciphertext,
        },
      });
    } else {
      responseDoc = await compatRepo.create({
        student_id: new Types.ObjectId(user.id),
        key_id: encrypted.keyId,
        iv: encrypted.iv,
        auth_tag: encrypted.authTag,
        ciphertext: encrypted.ciphertext,
      });
    }

    return {
      message: "Compatibility questionnaire encrypted and saved successfully",
      hasSubmitted: true,
      updatedAt: responseDoc?.updatedAt,
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

    // 1. Hard-delete encrypted compatibility response (blank out ciphertext)
    const compatRepo = new CompatibilityResponseRepository(institution_id);
    const existing = await compatRepo.findOne({ student_id: user.id });
    if (existing) {
      await compatRepo.update(existing._id, { $set: { ciphertext: "" } });
    }

    // 2. Mark consent as withdrawn
    const consentRepo = new ConsentRecordRepository(institution_id);
    const consent = await consentRepo.findOne({
      student_id: user.id,
      purpose: "compatibility_questionnaire",
    });
    if (consent) {
      await consentRepo.update(consent._id, { $set: { withdrawn_at: new Date() } });
    }

    return {
      message:
        "Compatibility questionnaire answers hard-deleted and consent withdrawn successfully",
      deletedAt: new Date().toISOString(),
    };
  },
);
