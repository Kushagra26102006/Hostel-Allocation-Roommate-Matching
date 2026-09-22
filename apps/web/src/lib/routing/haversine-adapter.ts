/**
 * HaversineAdapter — pure-math offline fallback for walking distance estimation.
 *
 * Haversine formula → straight-line km → estimated walking minutes.
 * Uses a 1.3× detour factor and 5 km/h average walking speed.
 * No I/O, no network — always available.
 */

import type { RoutingPort, Coordinate, WalkingDistanceResult } from "./routing-port.js";
import { haversineDistanceKm, estimateWalkingMinutes } from "@hostelhub/domain";

export { haversineDistanceKm, estimateWalkingMinutes };

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
