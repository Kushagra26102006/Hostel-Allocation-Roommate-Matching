/**
 * OpenRouteServiceAdapter — network adapter for real walking directions.
 *
 * Uses the ORS free tier API with the walking profile.
 * Includes:
 * - In-memory TTL cache (5 min) to avoid redundant requests
 * - Exponential backoff on transient failures (100ms → 3.2s)
 * - Circuit breaker (5 consecutive failures → 30s open state)
 * - Automatic fallback to HaversineAdapter on any failure
 */

import type {
  RoutingPort,
  Coordinate,
  WalkingDistanceResult,
  CircuitBreakerState,
} from "./routing-port.js";
import { HaversineAdapter } from "./haversine-adapter.js";

interface CacheEntry {
  result: WalkingDistanceResult;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 30_000; // 30 seconds
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 100;
const TIMEOUT_MS = 10_000;

export class OpenRouteServiceAdapter implements RoutingPort {
  readonly providerName = "openrouteservice";

  private apiKey: string;
  private baseUrl: string;
  private cache = new Map<string, CacheEntry>();
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailureAt: 0,
    state: "closed",
  };
  private fallback = new HaversineAdapter();

  constructor(options?: { apiKey?: string; baseUrl?: string }) {
    this.apiKey = options?.apiKey ?? process.env["ORS_API_KEY"] ?? "";
    this.baseUrl =
      options?.baseUrl ?? process.env["ORS_BASE_URL"] ?? "https://api.openrouteservice.org";
  }

  private cacheKey(from: Coordinate, to: Coordinate): string {
    return `${from.lat.toFixed(6)},${from.lng.toFixed(6)}|${to.lat.toFixed(6)},${to.lng.toFixed(6)}`;
  }

  private checkCircuitBreaker(): boolean {
    if (this.circuitBreaker.state === "closed") return true;

    const elapsed = Date.now() - this.circuitBreaker.lastFailureAt;
    if (elapsed >= CIRCUIT_BREAKER_RESET_MS) {
      // Move to half-open: allow one test request
      this.circuitBreaker.state = "half-open";
      return true;
    }

    return false; // Circuit is open, reject
  }

  private recordSuccess(): void {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.state = "closed";
  }

  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureAt = Date.now();
    if (this.circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreaker.state = "open";
    }
  }

  async getWalkingDistance(from: Coordinate, to: Coordinate): Promise<WalkingDistanceResult> {
    // 1. Check cache
    const key = this.cacheKey(from, to);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    // 2. Check API key availability
    if (!this.apiKey) {
      return this.fallback.getWalkingDistance(from, to);
    }

    // 3. Check circuit breaker
    if (!this.checkCircuitBreaker()) {
      return this.fallback.getWalkingDistance(from, to);
    }

    // 4. Make API request with retries + exponential backoff
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const url = `${this.baseUrl}/v2/directions/foot-walking`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: this.apiKey,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            coordinates: [
              [from.lng, from.lat], // ORS uses [lng, lat] order
              [to.lng, to.lat],
            ],
            units: "m",
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        if (response.status === 429) {
          // Rate limited — backoff and retry
          const backoffMs = BASE_BACKOFF_MS * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }

        if (!response.ok) {
          throw new Error(`ORS API error: ${response.status}`);
        }

        const data = (await response.json()) as {
          routes?: Array<{
            summary?: { duration?: number; distance?: number };
          }>;
        };

        const summary = data.routes?.[0]?.summary;
        if (!summary?.duration || !summary?.distance) {
          throw new Error("ORS returned no route summary");
        }

        const result: WalkingDistanceResult = {
          minutes: Math.round((summary.duration / 60) * 10) / 10,
          distanceMeters: Math.round(summary.distance),
          source: "ors",
        };

        // Cache the result
        this.cache.set(key, {
          result,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });

        this.recordSuccess();
        return result;
      } catch (err) {
        console.warn(`ORS request attempt ${attempt + 1} failed:`, err);

        if (attempt < MAX_RETRIES - 1) {
          const backoffMs = BASE_BACKOFF_MS * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, backoffMs));
        }
      }
    }

    // All retries exhausted — record failure and use fallback
    this.recordFailure();
    return this.fallback.getWalkingDistance(from, to);
  }

  /**
   * Exposes circuit breaker state for testing and monitoring.
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  /**
   * Clears the in-memory cache (useful for testing).
   */
  clearCache(): void {
    this.cache.clear();
  }
}
