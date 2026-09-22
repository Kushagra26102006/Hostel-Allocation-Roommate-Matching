import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { CheckInService } from "@hostelhub/db";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
const mockAuth = vi.mocked(auth);

// Import route handlers
import { POST as verifyCheckIn } from "../app/api/v1/check-in/verify/route";
import { POST as recordCheckIn } from "../app/api/v1/check-in/route";
import { POST as acknowledgeCheckIn } from "../app/api/v1/check-in/[id]/acknowledge/route";
import { POST as recordCheckOut } from "../app/api/v1/check-in/[id]/check-out/route";
import { POST as markNoShow } from "../app/api/v1/check-in/no-show/route";
import { POST as syncOffline } from "../app/api/v1/check-in/sync/route";

describe("Check-In API Route Handlers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const wardenSession = {
    user: {
      id: "warden-1",
      email: "warden@campus.edu",
      name: "Warden Dave",
      roles: ["warden"],
      institution_id: "inst-1",
      hostelAssignments: ["hostel-1"],
      mfaEnabled: true,
      mfaPending: false,
    },
  };

  const studentSession = {
    user: {
      id: "stu-1",
      email: "student@campus.edu",
      name: "Rohan Verma",
      roles: ["student"],
      institution_id: "inst-1",
      hostelAssignments: [],
      mfaEnabled: true,
      mfaPending: false,
    },
  };

  describe("POST /api/v1/check-in/verify", () => {
    it("returns 401 if unauthenticated", async () => {
      mockAuth.mockResolvedValueOnce(null as never);
      const req = new NextRequest("http://localhost:3000/api/v1/check-in/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_or_code: "sample-token" }),
      });
      const res = await verifyCheckIn(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 if user lacks checkin:manage permission", async () => {
      mockAuth.mockResolvedValueOnce(studentSession as never);
      const req = new NextRequest("http://localhost:3000/api/v1/check-in/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_or_code: "sample-token" }),
      });
      const res = await verifyCheckIn(req);
      expect(res.status).toBe(403);
    });

    it("returns 422 if token_or_code is missing or empty", async () => {
      mockAuth.mockResolvedValueOnce(wardenSession as never);
      const req = new NextRequest("http://localhost:3000/api/v1/check-in/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_or_code: "" }),
      });
      const res = await verifyCheckIn(req);
      expect(res.status).toBe(422);
    });

    it("verifies and prepares valid check-in letter", async () => {
      mockAuth.mockResolvedValueOnce(wardenSession as never);

      vi.spyOn(CheckInService.prototype, "verifyAndPrepareCheckIn").mockResolvedValueOnce({
        letter: {
          id: "let-1",
          letterNumber: "AL-2026-NIT-001",
          token: "valid-sig-token",
          studentId: "stu-1",
          studentName: "Rohan Verma",
          rollNumber: "22BCS001",
          studentEmail: "rohan@campus.edu",
          hostelId: "hostel-1",
          hostelName: "Aryabhata Hall",
          roomId: "room-1",
          roomNumber: "101",
          bedId: "bed-1",
          bedNo: "Bed A-1",
          moveInStartDate: "2026-09-25",
          moveInEndDate: "2026-09-26",
        },
        checklistTemplate: [
          {
            id: "bed_frame",
            label: "Bed Frame & Mattress",
            category: "furniture",
            required: true,
            defaultCondition: "good",
          },
        ],
      });

      const req = new NextRequest("http://localhost:3000/api/v1/check-in/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_or_code: "valid-sig-token" }),
      });
      const res = await verifyCheckIn(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.letter.studentName).toBe("Rohan Verma");
    });
  });

  describe("POST /api/v1/check-in", () => {
    it("records check-in and returns 200", async () => {
      mockAuth.mockResolvedValueOnce(wardenSession as never);

      const mockRecord = {
        _id: "cir-123",
        letter_id: "let-1",
        status: "checked_in",
        check_in: {
          warden_id: "warden-1",
          time: new Date(),
        },
      };

      vi.spyOn(CheckInService.prototype, "recordCheckIn").mockResolvedValueOnce(
        mockRecord as never,
      );

      const req = new NextRequest("http://localhost:3000/api/v1/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token_or_code: "valid-sig",
          checklist: [
            {
              itemId: "bed_frame",
              label: "Bed Frame & Mattress",
              category: "furniture",
              condition: "good",
            },
          ],
        }),
      });

      const res = await recordCheckIn(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.record._id).toBe("cir-123");
    });
  });

  describe("POST /api/v1/check-in/[id]/acknowledge", () => {
    it("allows student to acknowledge room inventory checklist", async () => {
      mockAuth.mockResolvedValueOnce(studentSession as never);

      vi.spyOn(CheckInService.prototype, "recordStudentAcknowledgement").mockResolvedValueOnce({
        _id: "cir-123",
        student_acknowledgement: {
          is_acknowledged: true,
          acknowledged_at: new Date(),
        },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/v1/check-in/cir-123/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_notes: "Checked and verified" }),
      });

      const res = await acknowledgeCheckIn(req, { params: Promise.resolve({ id: "cir-123" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.record.student_acknowledgement.is_acknowledged).toBe(true);
    });
  });

  describe("POST /api/v1/check-in/[id]/check-out", () => {
    it("records checkout with diff report", async () => {
      mockAuth.mockResolvedValueOnce(wardenSession as never);

      const diffReport = {
        has_damages: false,
        total_items: 1,
        unchanged_count: 1,
        worsened_count: 0,
        items: [],
      };

      vi.spyOn(CheckInService.prototype, "recordCheckOut").mockResolvedValueOnce({
        record: { _id: "cir-123", status: "checked_out" } as never,
        diffReport: diffReport as never,
      });

      const req = new NextRequest("http://localhost:3000/api/v1/check-in/cir-123/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklist: [
            {
              itemId: "bed_frame",
              label: "Bed Frame & Mattress",
              category: "furniture",
              condition: "good",
            },
          ],
        }),
      });

      const res = await recordCheckOut(req, { params: Promise.resolve({ id: "cir-123" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.diffReport.has_damages).toBe(false);
    });
  });

  describe("POST /api/v1/check-in/no-show", () => {
    it("marks student no-show and triggers waitlist promotion", async () => {
      mockAuth.mockResolvedValueOnce(wardenSession as never);

      vi.spyOn(CheckInService.prototype, "markNoShow").mockResolvedValueOnce({
        record: { _id: "cir-ns-1", status: "no_show" } as never,
        promotionResult: { promoted: true, candidateId: "cand-2" } as never,
      });

      const req = new NextRequest("http://localhost:3000/api/v1/check-in/no-show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letter_or_assignment_id: "507f1f77bcf86cd799439011",
          reason: "Did not report before deadline",
        }),
      });

      const res = await markNoShow(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.record.status).toBe("no_show");
      expect(json.promotionResult.promoted).toBe(true);
    });
  });

  describe("POST /api/v1/check-in/sync", () => {
    it("syncs batch of offline scans", async () => {
      mockAuth.mockResolvedValueOnce(wardenSession as never);

      vi.spyOn(CheckInService.prototype, "syncOfflineCheckIns").mockResolvedValueOnce({
        syncedCount: 2,
        failedCount: 0,
        errors: [],
      });

      const req = new NextRequest("http://localhost:3000/api/v1/check-in/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: [
            {
              clientSyncId: "off-1",
              tokenOrCode: "sig-1",
              clientScannedAt: new Date().toISOString(),
              checklist: [],
            },
          ],
        }),
      });

      const res = await syncOffline(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.syncedCount).toBe(2);
      expect(json.failedCount).toBe(0);
    });
  });
});
