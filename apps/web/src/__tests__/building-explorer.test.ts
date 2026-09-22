import { describe, it, expect } from "vitest";
import {
  generate3DBuildingModel,
  generateSampleHostelModel,
  determineOccupancyStatus,
  type RawInventoryInput,
} from "../components/explorer/building-generator";
import { STATUS_COLORS, STATUS_LABELS } from "../components/explorer/types";
import { NextRequest } from "next/server";
import { GET as getBuildingModel } from "../app/api/v1/inventory/explorer/[hostelId]/route";

describe("Prompt O5: 3D Building Explorer (I01)", () => {
  describe("1. Occupancy Status & Pattern Resolution", () => {
    it("correctly identifies available, partial, and full occupancy", () => {
      expect(determineOccupancyStatus(2, 0)).toBe("available");
      expect(determineOccupancyStatus(2, 1)).toBe("partial");
      expect(determineOccupancyStatus(2, 2)).toBe("full");
      expect(determineOccupancyStatus(3, 3)).toBe("full");
      expect(determineOccupancyStatus(3, 4)).toBe("full");
    });

    it("respects maintenance and reserved statuses overriding counts", () => {
      expect(determineOccupancyStatus(2, 0, "maintenance")).toBe("maintenance");
      expect(determineOccupancyStatus(2, 1, "reserved")).toBe("reserved");
    });

    it("has unique, defined colors and labels for every status", () => {
      const statuses = ["available", "partial", "full", "maintenance", "reserved"] as const;
      for (const status of statuses) {
        expect(STATUS_COLORS[status]).toBeDefined();
        expect(STATUS_COLORS[status]).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(STATUS_LABELS[status]).toBeDefined();
        expect(STATUS_LABELS[status].length).toBeGreaterThan(0);
      }
    });
  });

  describe("2. Procedural Building 3D Extrusion Generator", () => {
    const sampleInput: RawInventoryInput = {
      hostel: {
        id: "hostel-test-01",
        name: "Test Aryabhata Residence",
        genderPolicy: "male",
      },
      floors: [
        {
          floorNumber: 0,
          floorLabel: "Ground Floor",
          wings: [
            {
              name: "Wing A",
              rooms: [
                {
                  id: "room-001",
                  roomNumber: "G01",
                  roomType: "Double",
                  capacity: 2,
                  occupiedCount: 2,
                  accessible: true,
                },
                {
                  id: "room-002",
                  roomNumber: "G02",
                  roomType: "Double",
                  capacity: 2,
                  occupiedCount: 1,
                },
              ],
            },
          ],
        },
        {
          floorNumber: 1,
          floorLabel: "Floor 1",
          wings: [
            {
              name: "Wing A",
              rooms: [
                {
                  id: "room-101",
                  roomNumber: "101",
                  roomType: "Single",
                  capacity: 1,
                  occupiedCount: 0,
                },
              ],
            },
          ],
        },
      ],
    };

    it("generates structured 3D building coordinates with floor heights", () => {
      const model = generate3DBuildingModel(sampleInput);

      expect(model.hostelName).toBe("Test Aryabhata Residence");
      expect(model.floors.length).toBe(2);

      // Floor 0
      const groundFloor = model.floors[0]!;
      expect(groundFloor.floorNumber).toBe(0);
      expect(groundFloor.elevationY).toBe(0);
      expect(groundFloor.totalRooms).toBe(2);
      expect(groundFloor.totalBeds).toBe(4);
      expect(groundFloor.occupiedBeds).toBe(3);

      // Floor 1
      const floorOne = model.floors[1]!;
      expect(floorOne.floorNumber).toBe(1);
      expect(floorOne.elevationY).toBeGreaterThan(0);
      expect(floorOne.totalRooms).toBe(1);

      // Total totals
      expect(model.totalRooms).toBe(3);
      expect(model.totalBeds).toBe(5);
      expect(model.occupiedBeds).toBe(3);
      expect(model.overallOccupancyRate).toBe(60); // 3 / 5 = 60%
    });

    it("positions rooms in 3D world space with valid bounding boxes", () => {
      const model = generate3DBuildingModel(sampleInput);

      expect(model.bounds.width).toBeGreaterThan(0);
      expect(model.bounds.height).toBeGreaterThan(0);
      expect(model.bounds.depth).toBeGreaterThan(0);

      const floor0 = model.floors[0];
      expect(floor0).toBeDefined();
      const wing0 = floor0?.wings[0];
      expect(wing0).toBeDefined();
      const roomG01 = wing0?.rooms[0];
      expect(roomG01).toBeDefined();
      if (!roomG01) throw new Error("roomG01 missing");

      expect(roomG01.position.length).toBe(3);
      expect(roomG01.size).toEqual([3.2, 2.4, 3.6]);
      expect(roomG01.accessible).toBe(true);
      expect(roomG01.status).toBe("full");

      const floor1 = model.floors[1];
      expect(floor1).toBeDefined();
      const wing1 = floor1?.wings[0];
      expect(wing1).toBeDefined();
      const room101 = wing1?.rooms[0];
      expect(room101).toBeDefined();
      if (!room101) throw new Error("room101 missing");

      expect(room101.position[1]).toBeGreaterThan(roomG01.position[1]); // Higher elevation
      expect(room101.status).toBe("available");
    });

    it("generates synthetic campus model reliably when offline", () => {
      const sample = generateSampleHostelModel("Ramanujan Tower");
      expect(sample.hostelName).toBe("Ramanujan Tower");
      expect(sample.floors.length).toBe(4);
      expect(sample.totalRooms).toBeGreaterThan(20);
      expect(sample.totalBeds).toBeGreaterThan(30);
    });
  });

  describe("3. GET /api/v1/inventory/explorer/[hostelId] API Route", () => {
    it("returns 422 validation error when hostelId is empty", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/inventory/explorer/");
      const res = await getBuildingModel(req, {
        params: Promise.resolve({ hostelId: "" }),
      });
      expect(res.status).toBe(422);
    });

    it("returns model with sample fallback when hostelId is not in DB", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/v1/inventory/explorer/non-existent-id",
      );
      const res = await getBuildingModel(req, {
        params: Promise.resolve({ hostelId: "6ab049e8a846014e1214fed3" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.model).toBeDefined();
      expect(data.model.floors.length).toBeGreaterThan(0);
    });
  });
});
