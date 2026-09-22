/**
 * @hostelhub/db — services/walking-distance.service.ts
 *
 * Database service for reading and caching pre-computed walking distances.
 * Zero external routing API calls — operates purely on local MongoDB models.
 */

import { Types } from "mongoose";
import { WalkingDistanceCacheModel } from "../models/walking-distance-cache.model.js";
import { haversineDistanceKm, estimateWalkingMinutes, type Coordinate } from "@hostelhub/domain";

/**
 * Returns a map of hostelId (string) -> average walking minutes across all academic blocks.
 * Executed as a single high-speed aggregation query.
 */
export async function getHostelWalkingMinutesMap(
  institutionId: string | Types.ObjectId,
): Promise<Map<string, number>> {
  const instId =
    typeof institutionId === "string" ? new Types.ObjectId(institutionId) : institutionId;

  const results = await WalkingDistanceCacheModel.aggregate<{
    _id: Types.ObjectId;
    avgMinutes: number;
  }>([
    { $match: { institution_id: instId } },
    { $group: { _id: "$hostel_id", avgMinutes: { $avg: "$walking_minutes" } } },
  ]);

  const map = new Map<string, number>();
  for (const r of results) {
    map.set(r._id.toString(), Math.round(r.avgMinutes * 10) / 10);
  }
  return map;
}

/**
 * Seed or pre-populate walking distances between hostels and academic blocks offline
 * using the domain Haversine formula (1.3× detour factor, 5 km/h walking speed).
 */
export async function precomputeOfflineWalkingDistances(
  institutionId: Types.ObjectId,
  hostels: Array<{ _id: Types.ObjectId; name: string; location?: Coordinate }>,
  blocks: Array<{ _id: Types.ObjectId; name: string; short_code: string; location: Coordinate }>,
): Promise<number> {
  let count = 0;
  for (const hostel of hostels) {
    if (!hostel.location?.lat || !hostel.location?.lng) continue;

    for (const block of blocks) {
      if (!block.location?.lat || !block.location?.lng) continue;

      const distKm = haversineDistanceKm(hostel.location, block.location);
      const minutes = estimateWalkingMinutes(distKm);
      const distanceMeters = Math.round(distKm * 1000);

      await WalkingDistanceCacheModel.updateOne(
        {
          institution_id: institutionId,
          hostel_id: hostel._id,
          academic_block_id: block._id,
        },
        {
          $set: {
            walking_minutes: minutes,
            distance_meters: distanceMeters,
            source: "haversine",
            computed_at: new Date(),
          },
          $setOnInsert: {
            institution_id: institutionId,
            hostel_id: hostel._id,
            academic_block_id: block._id,
            version: 1,
          },
        },
        { upsert: true },
      );
      count++;
    }
  }
  return count;
}
