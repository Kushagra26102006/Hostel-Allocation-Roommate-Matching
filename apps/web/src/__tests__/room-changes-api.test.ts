import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { RoomChangeService } from "@hostelhub/db";

// Mock @/auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
const mockAuth = vi.mocked(auth);

import { POST as createRoomChange, GET as listRoomChanges } from "../app/api/v1/room-changes/route";
import { POST as decideRoomChange } from "../app/api/v1/room-changes/[id]/decide/route";

describe("Room Change API Routes (/api/v1/room-changes)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("POST /api/v1/room-changes", () => {
    it("returns 401 if user is unauthenticated", async () => {
      mockAuth.mockResolvedValueOnce(null as never);

      const req = new NextRequest("http://localhost:3000/api/v1/room-changes", {
        method: "POST",
        body: JSON.stringify({ assignment_id: "asgn-1", reason: "Medical reasons" }),
      });

      const res = await createRoomChange(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 400 if assignment_id or reason is missing", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "student-1", role: "student", institution_id: "inst-1" },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/v1/room-changes", {
        method: "POST",
        body: JSON.stringify({ assignment_id: "asgn-1" }), // missing reason
      });

      const res = await createRoomChange(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("required");
    });

    it("creates room change request successfully and returns 201", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "student-1", role: "student", institution_id: "inst-1" },
      } as never);

      const mockRequest = {
        _id: "rc-123",
        student_id: "student-1",
        assignment_id: "asgn-1",
        reason: "Need quiet study environment for final year thesis.",
        status: "pending",
      };

      vi.spyOn(RoomChangeService.prototype, "createRequest").mockResolvedValueOnce(
        mockRequest as never,
      );

      const req = new NextRequest("http://localhost:3000/api/v1/room-changes", {
        method: "POST",
        body: JSON.stringify({
          assignment_id: "asgn-1",
          reason: "Need quiet study environment for final year thesis.",
          evidence_keys: ["evidence/thesis.pdf"],
        }),
      });

      const res = await createRoomChange(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json._id).toBe("rc-123");
      expect(json.status).toBe("pending");
    });
  });

  describe("GET /api/v1/room-changes", () => {
    it("returns 401 if unauthenticated", async () => {
      mockAuth.mockResolvedValueOnce(null as never);

      const req = new NextRequest("http://localhost:3000/api/v1/room-changes");
      const res = await listRoomChanges(req);
      expect(res.status).toBe(401);
    });

    it("enforces student isolation: passes session user id as filter for student role", async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: "student-99",
          roles: ["student"],
          activeRole: "student",
          institution_id: "inst-1",
        },
      } as never);

      const listSpy = vi.spyOn(RoomChangeService.prototype, "listRequests").mockResolvedValueOnce({
        requests: [],
        total: 0,
        page: 1,
        limit: 20,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/v1/room-changes");
      const res = await listRoomChanges(req);
      expect(res.status).toBe(200);

      // Verify listRequests was called with studentId restricted to "student-99"
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: "student-99" }),
        "student",
      );
    });
  });

  describe("POST /api/v1/room-changes/[id]/decide", () => {
    it("returns 403 Forbidden if student attempts to decide on a request", async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: "student-1",
          roles: ["student"],
          activeRole: "student",
          institution_id: "inst-1",
        },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/v1/room-changes/rc-1/decide", {
        method: "POST",
        body: JSON.stringify({ decision: "approved", reason: "Approved by myself" }),
      });

      const params = Promise.resolve({ id: "rc-1" });
      const res = await decideRoomChange(req, { params });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Only staff");
    });

    it("returns 400 if decision or reason is missing", async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: "warden-1",
          roles: ["warden"],
          activeRole: "warden",
          email: "warden@apex.edu",
          institution_id: "inst-1",
        },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/v1/room-changes/rc-1/decide", {
        method: "POST",
        body: JSON.stringify({ decision: "approved" }), // missing reason
      });

      const params = Promise.resolve({ id: "rc-1" });
      const res = await decideRoomChange(req, { params });
      expect(res.status).toBe(400);
    });

    it("allows warden to decide with written reason", async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: "warden-1",
          roles: ["warden"],
          activeRole: "warden",
          email: "warden@apex.edu",
          institution_id: "inst-1",
        },
      } as never);

      vi.spyOn(RoomChangeService.prototype, "decideRequest").mockResolvedValueOnce({
        _id: "rc-1",
        status: "approved",
        decision_reason: "Single room available and all hard constraints satisfied.",
      } as never);

      const req = new NextRequest("http://localhost:3000/api/v1/room-changes/rc-1/decide", {
        method: "POST",
        body: JSON.stringify({
          decision: "approved",
          reason: "Single room available and all hard constraints satisfied.",
          target_bed_id: "bed-99",
        }),
      });

      const params = Promise.resolve({ id: "rc-1" });
      const res = await decideRoomChange(req, { params });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("approved");
    });
  });
});
