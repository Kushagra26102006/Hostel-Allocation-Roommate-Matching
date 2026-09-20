import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import {
  AllocationCycleRepository,
  ApplicationRepository,
  ApplicationDocumentRepository,
} from "@hostelhub/db";
import { validateMagicBytes } from "../lib/storage/magic-bytes";
import { POST as createApplicationRoute } from "../app/api/v1/applications/route";
import { GET as getApplicationRoute, PATCH as patchApplicationRoute } from "../app/api/v1/applications/[id]/route";
import { POST as submitApplicationRoute } from "../app/api/v1/applications/[id]/submit/route";
import { POST as verifyUploadRoute } from "../app/api/v1/documents/verify-upload/route";
import { GET as downloadDocumentRoute } from "../app/api/v1/documents/[id]/download/route";

// Mock NextAuth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
const mockAuth = vi.mocked(auth);

describe("Module M2: Application and Cycle Management", () => {
  const tenantA = new Types.ObjectId().toString();
  const studentAId = new Types.ObjectId().toString();
  const studentBId = new Types.ObjectId().toString();
  const cycleId = new Types.ObjectId().toString();
  const appId = new Types.ObjectId().toString();
  const docId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("1. Window Enforcement", () => {
    it("rejects application submission if cycle window has closed", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: studentAId,
          email: "studentA@campus.edu",
          roles: ["student"],
          institution_id: tenantA,
        },
      } as never);

      // Mock Application (draft status)
      vi.spyOn(ApplicationRepository.prototype, "findById").mockResolvedValue({
        _id: new Types.ObjectId(appId),
        cycle_id: new Types.ObjectId(cycleId),
        student_id: new Types.ObjectId(studentAId),
        reference_number: "APP-2026-1001",
        status: "draft",
      } as never);

      // Mock Closed Allocation Cycle (window_close in the past)
      vi.spyOn(AllocationCycleRepository.prototype, "findById").mockResolvedValue({
        _id: new Types.ObjectId(cycleId),
        name: "Expired Cycle",
        academic_year: "2026-2027",
        status: "closed",
        window_open: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        window_close: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Closed yesterday
      } as never);

      const req = new Request(`http://localhost:3000/api/v1/applications/${appId}/submit`, {
        method: "POST",
      });

      const res = await submitApplicationRoute(req, {
        params: Promise.resolve({ id: appId }),
      });
      const problem = await res.json();

      expect(res.status).toBe(422);
      expect(problem.detail).toContain("Application window has closed");
    });
  });

  describe("2. One-Application Rule", () => {
    it("returns existing application when student attempts to create duplicate application in same cycle", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: studentAId,
          email: "studentA@campus.edu",
          roles: ["student"],
          institution_id: tenantA,
        },
      } as never);

      vi.spyOn(AllocationCycleRepository.prototype, "findById").mockResolvedValue({
        _id: new Types.ObjectId(cycleId),
        name: "Active Cycle",
        academic_year: "2026-2027",
        status: "open",
        window_open: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        window_close: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      } as never);

      // Existing application found for (studentAId, cycleId)
      const existingApp = {
        _id: new Types.ObjectId(appId),
        cycle_id: new Types.ObjectId(cycleId),
        student_id: new Types.ObjectId(studentAId),
        reference_number: "APP-2026-EXISTS",
        status: "draft",
      };
      vi.spyOn(ApplicationRepository.prototype, "findByStudentAndCycle").mockResolvedValue(existingApp as never);

      const req = new Request("http://localhost:3000/api/v1/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle_id: cycleId }),
      });

      const res = await createApplicationRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.reference_number).toBe("APP-2026-EXISTS");
    });
  });

  describe("3. Autosave Conflict (Optimistic Concurrency)", () => {
    it("returns 412 VERSION_CONFLICT when autosave version mismatch occurs", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: studentAId,
          email: "studentA@campus.edu",
          roles: ["student"],
          institution_id: tenantA,
        },
      } as never);

      vi.spyOn(ApplicationRepository.prototype, "findById").mockResolvedValue({
        _id: new Types.ObjectId(appId),
        student_id: new Types.ObjectId(studentAId),
        status: "draft",
        version: 5, // Server document is at version 5
      } as never);

      // Client sends If-Match: "3" (stale version 3)
      const req = new Request(`http://localhost:3000/api/v1/applications/${appId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": '"3"',
        },
        body: JSON.stringify({
          version: 3,
          form_data: { profile: { fullName: "Outdated Name" } },
        }),
      });

      const res = await patchApplicationRoute(req, {
        params: Promise.resolve({ id: appId }),
      });
      const problem = await res.json();

      expect(res.status).toBe(412);
      expect(problem.code).toBe("VERSION_CONFLICT");
      expect(problem.detail).toContain("Optimistic concurrency conflict");
    });
  });

  describe("4. Upload Validation (Magic Bytes Check)", () => {
    it("rejects fake file with invalid magic bytes (text disguised as PDF)", () => {
      const fakeBuffer = Buffer.from("Hello world plain text masquerading as pdf");
      const validation = validateMagicBytes(fakeBuffer, "fake_id.pdf", "application/pdf");

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain("magic-byte check failed");
    });

    it("accepts genuine PDF file header (%PDF)", () => {
      const genuinePdfBuffer = Buffer.from("%PDF-1.5 header content...");
      const validation = validateMagicBytes(genuinePdfBuffer, "real_id.pdf", "application/pdf");

      expect(validation.valid).toBe(true);
      expect(validation.detectedMime).toBe("application/pdf");
    });

    it("returns 400 when upload verification endpoint receives invalid magic bytes", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: studentAId,
          email: "studentA@campus.edu",
          roles: ["student"],
          institution_id: tenantA,
        },
      } as never);

      const fakeBase64 = Buffer.from("Not a real png file").toString("base64");

      const req = new Request("http://localhost:3000/api/v1/documents/verify-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: appId,
          type: "id_proof",
          storage_key: "docs/fake.png",
          original_name: "fake.png",
          mime_type: "image/png",
          size_bytes: 500,
          file_base64: fakeBase64,
        }),
      });

      const res = await verifyUploadRoute(req);
      const problem = await res.json();

      expect(res.status).toBe(400);
      expect(problem.detail).toContain("magic-byte");
    });
  });

  describe("5. Object-Level Access Isolation", () => {
    it("prevents Student B from viewing Student A's application (403 FORBIDDEN)", async () => {
      // Authenticated as Student B
      mockAuth.mockResolvedValue({
        user: {
          id: studentBId,
          email: "studentB@campus.edu",
          roles: ["student"],
          institution_id: tenantA,
        },
      } as never);

      // Application belongs to Student A
      vi.spyOn(ApplicationRepository.prototype, "findById").mockResolvedValue({
        _id: new Types.ObjectId(appId),
        student_id: new Types.ObjectId(studentAId),
        status: "draft",
      } as never);

      const req = new Request(`http://localhost:3000/api/v1/applications/${appId}`, {
        method: "GET",
      });

      const res = await getApplicationRoute(req, {
        params: Promise.resolve({ id: appId }),
      });
      const problem = await res.json();

      expect(res.status).toBe(403);
      expect(problem.code).toBe("FORBIDDEN");
      expect(problem.detail).toContain("not authorized to view another student's application");
    });

    it("prevents Student B from downloading Student A's document (403 FORBIDDEN)", async () => {
      // Authenticated as Student B
      mockAuth.mockResolvedValue({
        user: {
          id: studentBId,
          email: "studentB@campus.edu",
          roles: ["student"],
          institution_id: tenantA,
        },
      } as never);

      // Document belongs to Student A
      vi.spyOn(ApplicationDocumentRepository.prototype, "findById").mockResolvedValue({
        _id: new Types.ObjectId(docId),
        student_id: new Types.ObjectId(studentAId),
        storage_key: "docs/studentA/file.pdf",
        original_name: "file.pdf",
        mime_type: "application/pdf",
      } as never);

      const req = new Request(`http://localhost:3000/api/v1/documents/${docId}/download`, {
        method: "GET",
      });

      const res = await downloadDocumentRoute(req, {
        params: Promise.resolve({ id: docId }),
      });
      const problem = await res.json();

      expect(res.status).toBe(403);
      expect(problem.code).toBe("FORBIDDEN");
      expect(problem.detail).toContain("not authorized to access this document");
    });
  });
});
