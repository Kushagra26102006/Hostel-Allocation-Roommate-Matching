import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import {
  AllocationCycleRepository,
  ApplicationRepository,
  HostelRepository,
  PreferenceRepository,
  GroupRepository,
} from "@hostelhub/db";
import { PUT as updatePreferencesRoute } from "../app/api/v1/applications/[id]/preferences/route";
import { POST as createGroupRoute } from "../app/api/v1/groups/route";
import { POST as joinInviteGroupRoute } from "../app/api/v1/groups/[id]/invite/route";
import { POST as acceptGroupRoute } from "../app/api/v1/groups/[id]/accept/route";
import { DELETE as leaveGroupRoute } from "../app/api/v1/groups/[id]/leave/route";

// Mock NextAuth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
const mockAuth = vi.mocked(auth);

describe("Module M4: Preference Management and Group Applications", () => {
  const tenantA = new Types.ObjectId().toString();
  const studentAId = new Types.ObjectId().toString();
  const studentBId = new Types.ObjectId().toString();
  const cycleId = new Types.ObjectId().toString();
  const appId = new Types.ObjectId().toString();
  const hostel1Id = new Types.ObjectId().toString();
  const hostel2Id = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("1. Preference Validation Rules (Ranks & Min/Max Length)", () => {
    it("rejects non-gap-free preference ranks with 422 VALIDATION_FAILED", async () => {
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
        cycle_id: new Types.ObjectId(cycleId),
        status: "draft",
      } as never);

      vi.spyOn(AllocationCycleRepository.prototype, "findById").mockResolvedValue({
        _id: new Types.ObjectId(cycleId),
        status: "open",
        window_open: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        window_close: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      } as never);

      // Gapped ranks: [1, 3] (missing rank 2)
      const req = new Request(`http://localhost:3000/api/v1/applications/${appId}/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: [
            { rank: 1, hostel_id: hostel1Id, room_type: "double" },
            { rank: 3, hostel_id: hostel2Id, room_type: "single" }, // Gap!
          ],
        }),
      });

      const res = await updatePreferencesRoute(req, {
        params: Promise.resolve({ id: appId }),
      });
      const problem = await res.json();

      expect(res.status).toBe(422);
      expect(problem.code).toBe("VALIDATION_FAILED");
      expect(problem.detail).toContain("unique and gap-free");
    });

    it("accepts compliant gap-free ranks [1, 2]", async () => {
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
        cycle_id: new Types.ObjectId(cycleId),
        status: "draft",
      } as never);

      vi.spyOn(AllocationCycleRepository.prototype, "findById").mockResolvedValue({
        _id: new Types.ObjectId(cycleId),
        status: "open",
        window_open: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        window_close: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      } as never);

      vi.spyOn(HostelRepository.prototype, "findById").mockResolvedValue({
        _id: new Types.ObjectId(hostel1Id),
        name: "Mock Hostel",
      } as never);

      vi.spyOn(PreferenceRepository.prototype, "replacePreferences").mockResolvedValue([
        { rank: 1, hostel_id: new Types.ObjectId(hostel1Id), room_type: "double" },
        { rank: 2, hostel_id: new Types.ObjectId(hostel2Id), room_type: "single" },
      ] as never);

      const req = new Request(`http://localhost:3000/api/v1/applications/${appId}/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: [
            { rank: 1, hostel_id: hostel1Id, room_type: "double" },
            { rank: 2, hostel_id: hostel2Id, room_type: "single" },
          ],
        }),
      });

      const res = await updatePreferencesRoute(req, {
        params: Promise.resolve({ id: appId }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveLength(2);
    });
  });

  describe("2. Window Lock Enforcement", () => {
    it("locks preference updates after cycle window closes (422 BAD_REQUEST)", async () => {
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
        cycle_id: new Types.ObjectId(cycleId),
        status: "draft",
      } as never);

      // Expired cycle window
      vi.spyOn(AllocationCycleRepository.prototype, "findById").mockResolvedValue({
        _id: new Types.ObjectId(cycleId),
        status: "closed",
        window_open: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        window_close: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      } as never);

      const req = new Request(`http://localhost:3000/api/v1/applications/${appId}/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: [{ rank: 1, hostel_id: hostel1Id, room_type: "double" }],
        }),
      });

      const res = await updatePreferencesRoute(req, {
        params: Promise.resolve({ id: appId }),
      });
      const problem = await res.json();

      expect(res.status).toBe(422);
      expect(problem.detail).toContain("Preference updates are locked");
    });
  });

  describe("3. Mutual-Request Logic & Group Confirmation", () => {
    it("keeps group in draft status until all members accept invitation", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: studentBId,
          email: "studentB@campus.edu",
          roles: ["student"],
          institution_id: tenantA,
        },
      } as never);

      const groupId = new Types.ObjectId().toString();

      vi.spyOn(AllocationCycleRepository.prototype, "findById").mockResolvedValue({
        _id: new Types.ObjectId(cycleId),
        status: "open",
        window_open: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        window_close: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      } as never);

      const mockGroupSave = vi.fn().mockResolvedValue(undefined);
      const mockGroupDoc = {
        _id: new Types.ObjectId(groupId),
        cycle_id: new Types.ObjectId(cycleId),
        leader_id: new Types.ObjectId(studentAId),
        invite_code: "XYZ123",
        status: "draft",
        members: [
          { student_id: new Types.ObjectId(studentAId), email: "a@campus.edu", status: "accepted", joined_at: new Date() },
          { student_id: new Types.ObjectId(studentBId), email: "b@campus.edu", status: "pending", joined_at: new Date() },
        ],
        save: mockGroupSave,
      };

      vi.spyOn(GroupRepository.prototype, "findById").mockResolvedValue(mockGroupDoc as never);

      const req = new Request(`http://localhost:3000/api/v1/groups/${groupId}/accept`, {
        method: "POST",
      });

      const res = await acceptGroupRoute(req, {
        params: Promise.resolve({ id: groupId }),
      });
      const updatedGroup = await res.json();

      expect(res.status).toBe(200);
      expect(mockGroupDoc.status).toBe("confirmed"); // Both A and B accepted => status confirmed
    });
  });
});
