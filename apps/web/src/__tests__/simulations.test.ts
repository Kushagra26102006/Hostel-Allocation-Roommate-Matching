import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Types } from "mongoose";

// Mock @/auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
const mockAuth = vi.mocked(auth);

// Mock @hostelhub/db SimulatorService and SimulationBatchModel
vi.mock("@hostelhub/db", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@hostelhub/db");
  return {
    ...actual,
    connectDb: vi.fn().mockResolvedValue(undefined),
    SimulatorService: vi.fn().mockImplementation(() => ({
      runSimulationBatch: vi.fn().mockResolvedValue({
        batchId: "batch-123",
        comparison: {
          scenarios: [],
          metricDeltas: {},
          divergentStudents: [],
          bestOverallScenarioId: "sc-1",
        },
        scenarios: [
          {
            scenarioId: "sc-1",
            scenarioName: "Scenario A",
            totalPlaced: 100,
            totalWaitlisted: 0,
            firstChoiceRate: 0.9,
            meanCompatibility: 0.85,
            parityGap: 0.02,
            priorityInversions: 0,
            giniCoefficient: 0.05,
            outcomes: {},
          },
        ],
      }),
      getSimulationBatch: vi.fn().mockImplementation((batchId: string) => {
        if (batchId === "batch-123") {
          return Promise.resolve({
            batchId: "batch-123",
            seed: 42,
            comparison: {
              scenarios: [],
              metricDeltas: {},
              divergentStudents: [],
            },
            scenarios: [],
          });
        }
        return Promise.resolve(null);
      }),
      getScenarioOptions: vi.fn().mockResolvedValue({
        cycleId: "cycle-1",
        cycleName: "Fall 2026",
        hostels: [{ id: "h1", name: "Hostel A" }],
        blocks: [{ id: "b1", name: "Block 1", hostelId: "h1" }],
        quotaBuckets: [{ name: "General", capacity: 50 }],
        weightsVersions: [{ id: "w1", name: "Default", version: "standard" }],
      }),
    })),
    SimulationBatchModel: {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId(),
            base_cycle_id: new Types.ObjectId(),
            seed: 42,
            scenarios: [{ scenario_id: "sc-1", name: "Scenario 1", run_id: new Types.ObjectId() }],
            createdAt: new Date(),
          },
        ]),
      }),
    },
  };
});

import {
  POST as runSimulationsRoute,
  GET as listSimulationsRoute,
} from "../app/api/v1/simulations/route";
import { GET as getSimulationByIdRoute } from "../app/api/v1/simulations/[id]/route";
import { GET as getScenarioOptionsRoute } from "../app/api/v1/simulations/options/route";

describe("What-If Simulator API Routes (/api/v1/simulations)", () => {
  const institutionId = new Types.ObjectId().toString();
  const chiefWardenId = new Types.ObjectId().toString();
  const studentId = new Types.ObjectId().toString();
  const cycleId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/simulations", () => {
    it("returns 401 if user is unauthenticated", async () => {
      mockAuth.mockResolvedValueOnce(null as never);

      const req = new NextRequest("http://localhost:3000/api/v1/simulations", {
        method: "POST",
        body: JSON.stringify({
          cycleId,
          scenarios: [{ id: "sc-1", name: "Scenario 1" }],
        }),
      });

      const res = await runSimulationsRoute(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 if student role attempts to run simulation", async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: studentId,
          roles: ["student"],
          institution_id: institutionId,
        },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/v1/simulations", {
        method: "POST",
        body: JSON.stringify({
          cycleId,
          scenarios: [{ id: "sc-1", name: "Scenario 1" }],
        }),
      });

      const res = await runSimulationsRoute(req);
      expect(res.status).toBe(403);
    });

    it("returns 422 if more than 3 scenarios are submitted", async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: chiefWardenId,
          roles: ["chief_warden"],
          institution_id: institutionId,
        },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/v1/simulations", {
        method: "POST",
        body: JSON.stringify({
          cycleId,
          scenarios: [
            { id: "sc-1", name: "Scenario 1" },
            { id: "sc-2", name: "Scenario 2" },
            { id: "sc-3", name: "Scenario 3" },
            { id: "sc-4", name: "Scenario 4" }, // max is 3!
          ],
        }),
      });

      const res = await runSimulationsRoute(req);
      expect(res.status).toBe(422);
    });

    it("successfully runs up to 3 scenarios in parallel for chief warden", async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: chiefWardenId,
          roles: ["chief_warden"],
          institution_id: institutionId,
        },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/v1/simulations", {
        method: "POST",
        body: JSON.stringify({
          cycleId,
          seed: 42,
          scenarios: [
            { id: "sc-1", name: "Scenario 1" },
            { id: "sc-2", name: "Scenario 2", capacityOverrides: { closedBlockIds: ["b1"] } },
          ],
        }),
      });

      const res = await runSimulationsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.batchId).toBe("batch-123");
      expect(json.comparison).toBeDefined();
      expect(json.scenarios).toHaveLength(1);
    });
  });

  describe("GET /api/v1/simulations/[id]", () => {
    it("returns 404 for non-existent batch", async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: chiefWardenId,
          roles: ["chief_warden"],
          institution_id: institutionId,
        },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/v1/simulations/batch-999");
      const res = await getSimulationByIdRoute(req, {
        params: Promise.resolve({ id: "batch-999" }),
      });
      expect(res.status).toBe(404);
    });

    it("returns simulation batch comparison for valid ID", async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: chiefWardenId,
          roles: ["chief_warden"],
          institution_id: institutionId,
        },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/v1/simulations/batch-123");
      const res = await getSimulationByIdRoute(req, {
        params: Promise.resolve({ id: "batch-123" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.batchId).toBe("batch-123");
      expect(json.seed).toBe(42);
    });
  });

  describe("GET /api/v1/simulations/options", () => {
    it("returns scenario options for the builder", async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: chiefWardenId,
          roles: ["chief_warden"],
          institution_id: institutionId,
        },
      } as never);

      const req = new NextRequest(
        `http://localhost:3000/api/v1/simulations/options?cycleId=${cycleId}`,
      );
      const res = await getScenarioOptionsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.cycleId).toBe("cycle-1");
      expect(json.hostels).toHaveLength(1);
      expect(json.blocks).toHaveLength(1);
    });
  });

  describe("GET /api/v1/simulations", () => {
    it("lists recent simulation batches", async () => {
      mockAuth.mockResolvedValueOnce({
        user: {
          id: chiefWardenId,
          roles: ["chief_warden"],
          institution_id: institutionId,
        },
      } as never);

      const req = new NextRequest("http://localhost:3000/api/v1/simulations");
      const res = await listSimulationsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.batches)).toBe(true);
      expect(json.batches.length).toBeGreaterThan(0);
    });
  });
});
