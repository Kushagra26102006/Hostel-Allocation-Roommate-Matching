/**
 * HaversineAdapter — pure-math offline fallback for walking distance estimation.
 *
 * Haversine formula → straight-line km → estimated walking minutes.
 * Uses a 1.3× detour factor and 5 km/h average walking speed.
 * No I/O, no network — always available.
 */

import type { RoutingPort, Coordinate, WalkingDistanceResult } from "./routing-port.js";

const EARTH_RADIUS_KM = 6371;
const WALKING_SPEED_KMH = 5;
const DETOUR_FACTOR = 1.3;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine formula: calculates the great-circle distance between two points.
 * Returns distance in kilometers.
 */
export function haversineDistanceKm(from: Coordinate, to: Coordinate): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Converts straight-line distance to estimated walking minutes.
 * Applies a 1.3× detour factor to account for roads/paths not being straight.
 */
export function estimateWalkingMinutes(straightLineKm: number): number {
  const walkingKm = straightLineKm * DETOUR_FACTOR;
  const hours = walkingKm / WALKING_SPEED_KMH;
  return Math.round(hours * 60 * 10) / 10; // 1 decimal place
}

export class HaversineAdapter implements RoutingPort {
  readonly providerName = "haversine";

  async getWalkingDistance(from: Coordinate, to: Coordinate): Promise<WalkingDistanceResult> {
    const distanceKm = haversineDistanceKm(from, to);
    const distanceMeters = Math.round(distanceKm * 1000);
    const minutes = estimateWalkingMinutes(distanceKm);

    return {
      minutes,
      distanceMeters,
      source: "haversine",
    };
  }
}
