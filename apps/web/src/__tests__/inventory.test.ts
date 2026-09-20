import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import { HostelModel, BedModel, HostelRepository, BedRepository } from "@hostelhub/db";
import { inventoryRowSchema, executeInventoryImport } from "../lib/inventory/import-engine.js";
import { getOccupancyMetrics } from "../lib/inventory/occupancy.js";
import { POST as createHostelRoute } from "../app/api/v1/inventory/hostels/route.js";
import { PATCH as patchBedRoute } from "../app/api/v1/inventory/beds/[id]/route.js";

// Mock NextAuth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
const mockAuth = vi.mocked(auth);

describe("Module M1: Hostel and Room Inventory", () => {
  const tenantA = new Types.ObjectId().toString();
  const tenantB = new Types.ObjectId().toString();

  beforeEach(async () => {
    vi.resetAllMocks();
  });

  describe("1. Validation Rules", () => {
    it("validates a compliant inventory row successfully", () => {
      const validRaw = {
        hostelName: "Tagore Hall",
        genderPolicy: "male",
        address: "South Campus",
        blockName: "Block T1",
        floorNo: 1,
        wing: "East",
        liftAccess: true,
        roomNumber: "101",
        roomType: "double",
        capacity: 2,
        accessible: true,
        ac: false,
        bedNo: "A",
        bedStatus: "available",
        window: true,
        distanceToBlocks: 15,
      };

      const parsed = inventoryRowSchema.safeParse(validRaw);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.hostelName).toBe("Tagore Hall");
        expect(parsed.data.capacity).toBe(2);
        expect(parsed.data.liftAccess).toBe(true);
      }
    });

    it("rejects invalid gender policy and non-positive capacity", () => {
      const invalidRaw = {
        hostelName: "Tagore Hall",
        genderPolicy: "invalid_gender",
        blockName: "Block T1",
        floorNo: 1,
        wing: "East",
        roomNumber: "101",
        capacity: 0,
        bedNo: "A",
      };

      const parsed = inventoryRowSchema.safeParse(invalidRaw);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const issues = parsed.error.issues;
        expect(issues.some((i) => i.path.includes("genderPolicy"))).toBe(true);
        expect(issues.some((i) => i.path.includes("capacity"))).toBe(true);
      }
    });

    it("rejects duplicate beds within the same import file", async () => {
      const rowsWithDuplicate = [
        {
          hostelName: "Tagore Hall",
          genderPolicy: "male",
          blockName: "Block T1",
          floorNo: 1,
          wing: "East",
          roomNumber: "101",
          bedNo: "A",
        },
        {
          hostelName: "Tagore Hall",
          genderPolicy: "male",
          blockName: "Block T1",
          floorNo: 1,
          wing: "East",
          roomNumber: "101",
          bedNo: "A", // Duplicate bed
        },
      ];

      const report = await executeInventoryImport(tenantA, rowsWithDuplicate, true);
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.message.includes("Duplicate bed"))).toBe(true);
    });
  });

  describe("2. Tenant Isolation", () => {
    it("prevents Tenant B from viewing or accessing Tenant A's inventory", async () => {
      // Mock models for offline test execution
      const mockFindOne = vi.spyOn(HostelModel, "findOne");
      mockFindOne.mockReturnValue({
        session: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null),
      } as never);

      const repoB = new HostelRepository(tenantB);
      const result = await repoB.findByName("Tagore Hall");

      expect(result).toBeNull();
      // Ensure the query filter strictly enforced Tenant B's institution_id
      expect(mockFindOne).toHaveBeenCalledWith(
        expect.objectContaining({
          institution_id: new Types.ObjectId(tenantB),
          name: "Tagore Hall",
        }),
        undefined,
        undefined,
      );

      mockFindOne.mockRestore();
    });
  });

  describe("3. Dry-Run vs Commit", () => {
    it("dry-run validates rows and computes counts without persisting data", async () => {
      const mockQuery = {
        session: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      };
      vi.spyOn(BedModel, "find").mockReturnValue(mockQuery as never);

      const rows = [
        {
          hostelName: "CV Raman Hall",
          genderPolicy: "male",
          blockName: "Block R1",
          floorNo: 1,
          wing: "West",
          roomNumber: "101",
          bedNo: "A",
        },
        {
          hostelName: "CV Raman Hall",
          genderPolicy: "male",
          blockName: "Block R1",
          floorNo: 1,
          wing: "West",
          roomNumber: "101",
          bedNo: "B",
        },
      ];

      // Execute dry-run
      const report = await executeInventoryImport(tenantA, rows, true);

      expect(report.dryRun).toBe(true);
      expect(report.valid).toBe(true);
      expect(report.totalRows).toBe(2);
      expect(report.creates).toBe(2);
      expect(report.errors).toHaveLength(0);
    });
  });

  describe("4. Rollback on One Bad Row", () => {
    it("aborts entire transaction with 0 creates if any row in batch fails validation", async () => {
      const mixedBatch = [
        {
          hostelName: "Kalam Hall",
          genderPolicy: "male",
          blockName: "Block K1",
          floorNo: 1,
          wing: "North",
          roomNumber: "201",
          bedNo: "A",
        },
        {
          hostelName: "Kalam Hall",
          genderPolicy: "invalid_gender_policy", // Invalid row
          blockName: "Block K1",
          floorNo: 1,
          wing: "North",
          roomNumber: "201",
          bedNo: "B",
        },
      ];

      const report = await executeInventoryImport(tenantA, mixedBatch, false);

      expect(report.valid).toBe(false);
      expect(report.success).toBe(false);
      expect(report.creates).toBe(0);
      expect(report.errors.length).toBeGreaterThan(0);
      expect(report.errors[0]?.row).toBe(2);
    });
  });

  describe("5. Permission Checks (Student cannot write)", () => {
    it("rejects student with 403 FORBIDDEN when attempting to create a hostel", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "usr_student",
          email: "student@campus.edu",
          roles: ["student"],
          institution_id: tenantA,
          hostelAssignments: [],
          mfaEnabled: false,
          mfaPending: false,
        },
      } as never);

      const req = new Request("http://localhost:3000/api/v1/inventory/hostels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Unauthorized Hall",
          gender_policy: "male",
          address: "Main Road",
        }),
      });

      const res = await createHostelRoute(req);
      const problem = await res.json();

      expect(res.status).toBe(403);
      expect(problem.code).toBe("FORBIDDEN");
      expect(problem.detail).toContain("lacks required permission");
    });

    it("allows hostel_admin with inventory:manage to create a hostel", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "usr_admin",
          email: "admin@campus.edu",
          roles: ["hostel_admin"],
          institution_id: tenantA,
          hostelAssignments: [],
          mfaEnabled: true,
          mfaPending: false,
        },
      } as never);

      vi.spyOn(HostelRepository.prototype, "create").mockResolvedValue({
        _id: new Types.ObjectId(),
        name: "Admin Created Hall",
        gender_policy: "coed",
        address: "Central",
        status: "active",
        version: 1,
      } as never);

      const req = new Request("http://localhost:3000/api/v1/inventory/hostels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Admin Created Hall",
          gender_policy: "coed",
          address: "Central",
        }),
      });

      const res = await createHostelRoute(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.name).toBe("Admin Created Hall");
    });
  });

  describe("6. Optimistic Concurrency & Audit on Bed Patch", () => {
    it("returns 412 PRECONDITION_FAILED when If-Match header is missing on PATCH", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "usr_admin",
          email: "admin@campus.edu",
          roles: ["hostel_admin"],
          institution_id: tenantA,
          hostelAssignments: [],
          mfaEnabled: true,
          mfaPending: false,
        },
      } as never);

      const bedId = new Types.ObjectId().toString();
      vi.spyOn(BedRepository.prototype, "findById").mockResolvedValue({
        _id: new Types.ObjectId(bedId),
        room_id: new Types.ObjectId(),
        bed_no: "A",
        status: "available",
        version: 3,
      } as never);

      // Request without If-Match
      const req = new Request(`http://localhost:3000/api/v1/inventory/beds/${bedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "out_of_service" }),
      });

      const res = await patchBedRoute(req, {
        params: Promise.resolve({ id: bedId }),
      });
      const problem = await res.json();

      expect(res.status).toBe(412);
      expect(problem.code).toBe("PRECONDITION_FAILED");
    });
  });

  describe("7. Occupancy Calculations", () => {
    it("calculates public occupancy summary with totals and percentage", async () => {
      const mockBeds = [
        { status: "occupied" },
        { status: "occupied" },
        { status: "occupied" },
        { status: "available" },
      ];
      const mockQuery = {
        session: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockBeds),
        lean: vi.fn().mockResolvedValue(mockBeds),
      };
      vi.spyOn(BedModel, "find").mockReturnValue(mockQuery as never);

      const metrics = await getOccupancyMetrics(tenantA, false);

      expect(metrics.totalBeds).toBe(4);
      expect(metrics.occupiedBeds).toBe(3);
      expect(metrics.availableBeds).toBe(1);
      expect(metrics.occupancyRate).toBe(75); // 3/4 = 75%
    });
  });
});
