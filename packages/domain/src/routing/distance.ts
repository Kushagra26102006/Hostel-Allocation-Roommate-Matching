/**
 * @hostelhub/domain — routing/distance.ts
 *
 * Pure mathematical formulas for geographic distances and walking estimations.
 * No I/O, no network, no floating-point dependencies on external services.
 */

export interface Coordinate {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const WALKING_SPEED_KMH = 5;
const DETOUR_FACTOR = 1.3;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculates the great-circle distance between two geographic coordinates
 * using the Haversine formula.
 * @returns Distance in kilometers.
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
 * Converts a straight-line distance in kilometers into estimated walking time in minutes.
 * Applies a 1.3× urban detour factor and standard 5 km/h walking speed.
 * @returns Walking time in minutes rounded to 1 decimal place.
 */
export function estimateWalkingMinutes(straightLineKm: number): number {
  if (straightLineKm <= 0) return 0;
  const walkingKm = straightLineKm * DETOUR_FACTOR;
  const hours = walkingKm / WALKING_SPEED_KMH;
  return Math.round(hours * 60 * 10) / 10;
}
