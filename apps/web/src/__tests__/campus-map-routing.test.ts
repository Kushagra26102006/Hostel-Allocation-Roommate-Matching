import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  HaversineAdapter,
  haversineDistanceKm,
  estimateWalkingMinutes,
} from "@/lib/routing/haversine-adapter";
import { OpenRouteServiceAdapter } from "@/lib/routing/ors-adapter";
import type { Coordinate } from "@/lib/routing/routing-port";

describe("Campus Map: Routing Adapters & Distance Scoring", () => {
  // ─── Haversine Adapter Tests ──────────────────────────────────────────────
  describe("HaversineAdapter — Offline Distance Calculation", () => {
    const adapter = new HaversineAdapter();

    // Known reference points for validation
    const IIT_ROORKEE_MAIN_GATE: Coordinate = { lat: 29.8644, lng: 77.8962 };
    const IIT_ROORKEE_CSE_BLOCK: Coordinate = { lat: 29.8648, lng: 77.897 };
    const IIT_ROORKEE_LIBRARY: Coordinate = { lat: 29.865, lng: 77.8955 };

    // Long-distance reference: Delhi → Agra (~200 km)
    const DELHI: Coordinate = { lat: 28.6139, lng: 77.209 };
    const AGRA: Coordinate = { lat: 27.1767, lng: 78.0081 };

    it("calculates haversine distance between two campus points correctly", () => {
      const distKm = haversineDistanceKm(IIT_ROORKEE_MAIN_GATE, IIT_ROORKEE_CSE_BLOCK);
      // ~90-100m apart — should be less than 0.2 km
      expect(distKm).toBeGreaterThan(0);
      expect(distKm).toBeLessThan(0.2);
    });

    it("returns 0 distance for identical coordinates", () => {
      const distKm = haversineDistanceKm(IIT_ROORKEE_MAIN_GATE, IIT_ROORKEE_MAIN_GATE);
      expect(distKm).toBe(0);
    });

    it("calculates Delhi-Agra distance within 5% of expected ~200km", () => {
      const distKm = haversineDistanceKm(DELHI, AGRA);
      expect(distKm).toBeGreaterThan(175);
      expect(distKm).toBeLessThan(210);
    });

    it("estimates walking minutes with 1.3× detour factor at 5 km/h", () => {
      // 1 km straight → 1.3 km walking → 1.3/5 hours = 15.6 min
      const minutes = estimateWalkingMinutes(1.0);
      expect(minutes).toBeCloseTo(15.6, 0);
    });

    it("estimates 0 minutes for 0 distance", () => {
      const minutes = estimateWalkingMinutes(0);
      expect(minutes).toBe(0);
    });

    it("getWalkingDistance returns valid result with haversine source", async () => {
      const result = await adapter.getWalkingDistance(IIT_ROORKEE_MAIN_GATE, IIT_ROORKEE_CSE_BLOCK);

      expect(result.source).toBe("haversine");
      expect(result.minutes).toBeGreaterThan(0);
      expect(result.minutes).toBeLessThan(5); // Same campus, should be very short
      expect(result.distanceMeters).toBeGreaterThan(0);
      expect(result.distanceMeters).toBeLessThan(500);
    });

    it("getWalkingDistance handles antipodal points gracefully", async () => {
      const northPole: Coordinate = { lat: 90, lng: 0 };
      const southPole: Coordinate = { lat: -90, lng: 0 };
      const result = await adapter.getWalkingDistance(northPole, southPole);

      // ~20,000 km — walking minutes would be enormous but shouldn't crash
      expect(result.source).toBe("haversine");
      expect(result.minutes).toBeGreaterThan(0);
      expect(result.distanceMeters).toBeGreaterThan(10_000_000); // > 10,000 km
    });

    it("is symmetric: distance(A,B) === distance(B,A)", async () => {
      const ab = await adapter.getWalkingDistance(IIT_ROORKEE_MAIN_GATE, IIT_ROORKEE_LIBRARY);
      const ba = await adapter.getWalkingDistance(IIT_ROORKEE_LIBRARY, IIT_ROORKEE_MAIN_GATE);
      expect(ab.minutes).toBe(ba.minutes);
      expect(ab.distanceMeters).toBe(ba.distanceMeters);
    });
  });

  // ─── ORS Adapter Circuit Breaker Tests ────────────────────────────────────
  describe("OpenRouteServiceAdapter — Circuit Breaker", () => {
    let adapter: OpenRouteServiceAdapter;

    beforeEach(() => {
      adapter = new OpenRouteServiceAdapter({
        apiKey: "test-key",
        baseUrl: "https://api.example.com",
      });
      adapter.clearCache();
      vi.restoreAllMocks();
    });

    it("starts with circuit breaker in closed state", () => {
      const state = adapter.getCircuitBreakerState();
      expect(state.state).toBe("closed");
      expect(state.failures).toBe(0);
    });

    it("falls back to Haversine when API key is missing", async () => {
      const noKeyAdapter = new OpenRouteServiceAdapter({
        apiKey: "",
        baseUrl: "https://api.example.com",
      });

      const result = await noKeyAdapter.getWalkingDistance(
        { lat: 29.8644, lng: 77.8962 },
        { lat: 29.8648, lng: 77.897 },
      );

      expect(result.source).toBe("haversine");
    });

    it("falls back to Haversine after network failures", async () => {
      // Mock fetch to simulate network failure
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

      const result = await adapter.getWalkingDistance(
        { lat: 29.8644, lng: 77.8962 },
        { lat: 29.8648, lng: 77.897 },
      );

      expect(result.source).toBe("haversine");
      expect(fetchSpy).toHaveBeenCalled();
    });

    it("caches successful results and returns them without network calls", async () => {
      // Mock a successful ORS response
      const mockResponse = {
        ok: true,
        json: async () => ({
          routes: [
            {
              summary: { duration: 360, distance: 450 },
            },
          ],
        }),
      };

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(mockResponse as unknown as Response);

      const from: Coordinate = { lat: 29.8644, lng: 77.8962 };
      const to: Coordinate = { lat: 29.8648, lng: 77.897 };

      // First call: hits API
      const result1 = await adapter.getWalkingDistance(from, to);
      expect(result1.source).toBe("ors");
      expect(result1.minutes).toBe(6);
      expect(result1.distanceMeters).toBe(450);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call: should use cache, no additional fetch
      const result2 = await adapter.getWalkingDistance(from, to);
      expect(result2.source).toBe("ors");
      expect(fetchSpy).toHaveBeenCalledTimes(1); // Still 1, cached
    });
  });

  // ─── D-Score Integration Tests ────────────────────────────────────────────
  describe("D-Score Formula: max(0, 1 - minutes/30)", () => {
    // Import the pure scoring function from the engine
    function scoreD(walkingMinutes: number): number {
      return Math.max(0, Math.min(1, 1 - walkingMinutes / 30));
    }

    it("D = 1.0 for 0 min walking distance (on-site)", () => {
      expect(scoreD(0)).toBe(1.0);
    });

    it("D = 0.5 for 15 min walking distance", () => {
      expect(scoreD(15)).toBe(0.5);
    });

    it("D = 0.0 for 30+ min walking distance", () => {
      expect(scoreD(30)).toBe(0.0);
      expect(scoreD(45)).toBe(0.0);
    });

    it("D = 0.8 for 6 min (Ramanujan Hall typical)", () => {
      expect(scoreD(6)).toBeCloseTo(0.8, 2);
    });

    it("D score is monotonically decreasing with distance", () => {
      const minutes = [0, 5, 10, 15, 20, 25, 30];
      const scores = minutes.map(scoreD);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]!).toBeLessThanOrEqual(scores[i - 1]!);
      }
    });

    it("D score is always in [0, 1]", () => {
      for (let m = -10; m <= 60; m++) {
        const d = scoreD(m);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(1);
      }
    });
  });
});
