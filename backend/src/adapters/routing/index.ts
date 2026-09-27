import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RoutingPort {
  calculateWalkingDistanceMeters(from: GeoPoint, to: GeoPoint): Promise<number>;
}

export class HaversineRoutingAdapter implements RoutingPort {
  async calculateWalkingDistanceMeters(from: GeoPoint, to: GeoPoint): Promise<number> {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (from.latitude * Math.PI) / 180;
    const phi2 = (to.latitude * Math.PI) / 180;
    const deltaPhi = ((to.latitude - from.latitude) * Math.PI) / 180;
    const deltaLambda = ((to.longitude - from.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Multiply straight-line distance by pedestrian tortuosity factor ~1.3
    return Math.round(R * c * 1.3);
  }
}

export class OpenRouteServiceAdapter implements RoutingPort {
  constructor(private apiKey: string) {}

  async calculateWalkingDistanceMeters(from: GeoPoint, to: GeoPoint): Promise<number> {
    if (!this.apiKey) {
      return new HaversineRoutingAdapter().calculateWalkingDistanceMeters(from, to);
    }
    try {
      const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${this.apiKey}&start=${from.longitude},${from.latitude}&end=${to.longitude},${to.latitude}`;
      const response = await fetch(url);
      if (!response.ok) {
        return new HaversineRoutingAdapter().calculateWalkingDistanceMeters(from, to);
      }
      const data = (await response.json()) as {
        features?: Array<{ properties?: { summary?: { distance: number } } }>;
      };
      const dist = data.features?.[0]?.properties?.summary?.distance;
      if (typeof dist === "number") {
        return Math.round(dist);
      }
      return new HaversineRoutingAdapter().calculateWalkingDistanceMeters(from, to);
    } catch (err) {
      logger.warn({ err }, "OpenRouteService call failed, falling back to Haversine");
      return new HaversineRoutingAdapter().calculateWalkingDistanceMeters(from, to);
    }
  }
}

export function getRoutingAdapter(): RoutingPort {
  if (env.ROUTING_PROVIDER === "openrouteservice" && env.OPENROUTESERVICE_API_KEY) {
    return new OpenRouteServiceAdapter(env.OPENROUTESERVICE_API_KEY);
  }
  return new HaversineRoutingAdapter();
}
