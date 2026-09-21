/**
 * RoutingPort — hexagonal interface for walking-distance calculation.
 *
 * Adapters: OpenRouteServiceAdapter (network), HaversineAdapter (offline fallback).
 */

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface WalkingDistanceResult {
  /** Estimated walking time in minutes. */
  minutes: number;
  /** Straight-line or routed distance in meters. */
  distanceMeters: number;
  /** Which adapter produced this result. */
  source: "ors" | "haversine";
}

export interface RoutingPort {
  readonly providerName: string;
  getWalkingDistance(from: Coordinate, to: Coordinate): Promise<WalkingDistanceResult>;
}

/**
 * Circuit breaker state for managing API failures.
 */
export interface CircuitBreakerState {
  failures: number;
  lastFailureAt: number;
  state: "closed" | "open" | "half-open";
}
