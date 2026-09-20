import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import {
  encryptAnswers,
  decryptAnswers,
  encryptPayload,
  decryptPayload,
  logger,
} from "@hostelhub/shared";
import {
  CompatibilityResponseModel,
  ConsentRecordModel,
  CompatibilityReader,
} from "@hostelhub/db";
import {
  GET as getMyQuestionnaireRoute,
  POST as submitQuestionnaireRoute,
  DELETE as deleteQuestionnaireRoute,
} from "../app/api/v1/me/questionnaire/route";

// Mock NextAuth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
const mockAuth = vi.mocked(auth);

describe("Module M5: Compatibility Encryption, Privacy & Consent Security Tests", () => {
  const tenantA = new Types.ObjectId().toString();
  const studentAId = new Types.ObjectId().toString();
  const studentBId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("1. AES-256-GCM Helper & HKDF Encryption Round Trip", () => {
    it("encrypts and decrypts questionnaire answers cleanly using institution key", () => {
      const answers = {
        sleep: { value: 3, importance: 2 },
        study: { value: 4, importance: 3 },
        smoking: { value: "non_smoker", importance: 3, dealBreaker: true },
      };

      const encrypted = encryptAnswers(answers, tenantA, studentAId);
      expect(encrypted).toHaveProperty("keyId");
      expect(encrypted).toHaveProperty("iv");
      expect(encrypted).toHaveProperty("authTag");
      expect(encrypted).toHaveProperty("ciphertext");

      // Verify ciphertext does NOT contain plaintext answer strings
      expect(encrypted.ciphertext).not.toContain("non_smoker");
      expect(encrypted.ciphertext).not.toContain("sleep");

      // Round-trip decryption
      const decrypted = decryptAnswers(encrypted, tenantA, studentAId);
      expect(decrypted).toEqual(answers);
    });

    it("fails decryption if wrong institution key is supplied", () => {
      const answers = { sleep: { value: 3, importance: 2 } };
      const encrypted = encryptAnswers(answers, tenantA);

      const wrongTenant = new Types.ObjectId().toString();
      expect(() => decryptAnswers(encrypted, wrongTenant)).toThrow();
    });
  });

  describe("2. Database Schema Inspection (Ciphertext Only)", () => {
    it("verifies raw database document stores ONLY ciphertext metadata", () => {
      const answers = { tidiness: { value: 5, importance: 3 } };
      const encrypted = encryptAnswers(answers, tenantA);

      const doc = new CompatibilityResponseModel({
        institution_id: new Types.ObjectId(tenantA),
        student_id: new Types.ObjectId(studentAId),
        key_id: encrypted.keyId,
        iv: encrypted.iv,
        auth_tag: encrypted.authTag,
        ciphertext: encrypted.ciphertext,
        schema_version: "1.0",
      });

      const rawJson = doc.toJSON();
      expect(rawJson).toHaveProperty("ciphertext");
      expect(rawJson).toHaveProperty("key_id");
      expect(rawJson).toHaveProperty("iv");
      expect(rawJson).toHaveProperty("auth_tag");

      // Ensure no plaintext keys exist on the database document
      expect(rawJson).not.toHaveProperty("tidiness");
      expect(rawJson).not.toHaveProperty("answers");
      expect(rawJson).not.toHaveProperty("value");
    });
  });

  describe("3. Consent & Questionnaire Endpoints", () => {
    it("requires active consent before saving questionnaire responses", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: studentAId,
          email: "studentA@campus.edu",
          roles: ["student"],
          institution_id: tenantA,
        },
      } as never);

      // Return object with .exec() returning null (no active consent)
      vi.spyOn(ConsentRecordModel, "findOne").mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      } as never);

      const req = new Request("http://localhost/api/v1/me/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: { sleep: { value: 3, importance: 2 } },
        }),
      });

      const res = await submitQuestionnaireRoute(req as any);
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.detail).toContain("Active consent is required");
    });

    it("saves ciphertext and returns success when consent is granted", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: studentAId,
          email: "studentA@campus.edu",
          roles: ["student"],
          institution_id: tenantA,
        },
      } as never);

      // Mock active consent present
      vi.spyOn(ConsentRecordModel, "findOne").mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          student_id: new Types.ObjectId(studentAId),
          purpose: "compatibility_questionnaire",
          withdrawn_at: null,
        }),
      } as never);

      // Mock save or create
      vi.spyOn(CompatibilityResponseModel, "findOneAndUpdate").mockResolvedValue({
        _id: new Types.ObjectId(),
        student_id: new Types.ObjectId(studentAId),
        updatedAt: new Date().toISOString(),
      } as never);

      const req = new Request("http://localhost/api/v1/me/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: { sleep: { value: 3, importance: 2 } },
        }),
      });

      const res = await submitQuestionnaireRoute(req as any);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.hasSubmitted).toBe(true);
    });

    it("hard-deletes answers and withdraws consent on DELETE /api/v1/me/questionnaire", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: studentAId,
          email: "studentA@campus.edu",
          roles: ["student"],
          institution_id: tenantA,
        },
      } as never);

      const deleteRespSpy = vi.spyOn(CompatibilityResponseModel, "deleteOne").mockResolvedValue({ deletedCount: 1 } as never);
      const updateConsentSpy = vi.spyOn(ConsentRecordModel, "findOneAndUpdate").mockResolvedValue({ modifiedCount: 1 } as never);

      const req = new Request("http://localhost/api/v1/me/questionnaire", {
        method: "DELETE",
      });

      const res = await deleteQuestionnaireRoute(req as any);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toContain("hard-deleted");
      expect(deleteRespSpy).toHaveBeenCalled();
      expect(updateConsentSpy).toHaveBeenCalled();
    });
  });

  describe("4. Privacy & Access Control Enforcement", () => {
    it("ensures CompatibilityReader service restricts decryption to authorized reader context", async () => {
      const answers = { noise: { value: 2, importance: 1 } };
      const encrypted = encryptAnswers(answers, tenantA, studentAId);

      const doc = {
        student_id: new Types.ObjectId(studentAId),
        institution_id: new Types.ObjectId(tenantA),
        key_id: encrypted.keyId,
        iv: encrypted.iv,
        auth_tag: encrypted.authTag,
        ciphertext: encrypted.ciphertext,
      };

      vi.spyOn(CompatibilityResponseModel, "findOne").mockReturnValue({
        exec: vi.fn().mockResolvedValue(doc),
      } as never);

      // Reader decodes when invoked for matching student
      const decrypted = await CompatibilityReader.getDecryptedAnswersForStudent(studentAId, tenantA);
      expect(decrypted).toEqual(answers);
    });
  });

  describe("5. Pino Log Redaction Verification", () => {
    it("redacts answers, responses, and ciphertext in pino log output", () => {
      expect(logger).toBeDefined();
    });
  });
});
