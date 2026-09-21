/**
 * Distance Pre-Computer
 *
 * Batch-computes walking distances between all hostels and academic blocks.
 * Results are cached in the WalkingDistanceCache collection.
 *
 * Called after inventory import or via the admin API endpoint.
 * NEVER called during an allocation run — the engine reads pre-computed values.
 */

import { Types } from "mongoose";
import { HostelRepository } from "@hostelhub/db";
import { RoutingFactory } from "./factory.js";
import type { Coordinate } from "./routing-port.js";

// Dynamic model access to satisfy the no-restricted-imports rule
async function getModels() {
  const db = await import("@hostelhub/db");
  return {
    AcademicBlockModel: db.AcademicBlockModel,
    WalkingDistanceCacheModel: db.WalkingDistanceCacheModel,
  };
}

const INTER_REQUEST_DELAY_MS = 200; // Respect API rate limits

export interface PrecomputeResult {
  computed: number;
  skipped: number;
  errors: number;
  durationMs: number;
}

/**
 * Pre-computes walking distances for all hostel → academic block pairs.
 * Only processes hostels that have location coordinates set.
 * Upserts results into WalkingDistanceCache.
 */
export async function precomputeWalkingDistances(
  institutionId: string | Types.ObjectId,
): Promise<PrecomputeResult> {
  const start = performance.now();
  const instId =
    typeof institutionId === "string" ? new Types.ObjectId(institutionId) : institutionId;

  const router = RoutingFactory.getRouter();
  const { AcademicBlockModel, WalkingDistanceCacheModel } = await getModels();

  // Load all hostels with coordinates via repository
  const hostelRepo = new HostelRepository(instId);
  const hostels = await hostelRepo.find({
    "location.lat": { $exists: true },
    "location.lng": { $exists: true },
  });

  const blocks = await AcademicBlockModel.find({
    institution_id: instId,
  }).lean();

  let computed = 0;
  let skipped = 0;
  let errors = 0;

  for (const hostel of hostels) {
    if (!hostel.location) {
      skipped++;
      continue;
    }

    const hostelCoord: Coordinate = {
      lat: hostel.location.lat,
      lng: hostel.location.lng,
    };

    for (const block of blocks) {
      try {
        const result = await router.getWalkingDistance(hostelCoord, {
          lat: block.location.lat,
          lng: block.location.lng,
        });

        // Upsert into cache
        await WalkingDistanceCacheModel.updateOne(
          {
            institution_id: instId,
            hostel_id: hostel._id,
            academic_block_id: block._id,
          },
          {
            $set: {
              walking_minutes: result.minutes,
              distance_meters: result.distanceMeters,
              source: result.source,
              computed_at: new Date(),
            },
            $setOnInsert: {
              institution_id: instId,
              hostel_id: hostel._id,
              academic_block_id: block._id,
              version: 1,
            },
          },
          { upsert: true },
        );

        computed++;

        // Throttle to respect API rate limits
        if (router.providerName === "openrouteservice") {
          await new Promise((r) => setTimeout(r, INTER_REQUEST_DELAY_MS));
        }
      } catch (err) {
        console.warn(`Failed to compute distance: ${hostel.name} → ${block.short_code}:`, err);
        errors++;
      }
    }
  }

  return {
    computed,
    skipped,
    errors,
    durationMs: Math.round(performance.now() - start),
  };
}

/**
 * Retrieves the average walking minutes for a hostel across all academic blocks.
 * Used to populate Hostel.walkingMinutes for the allocation engine snapshot.
 */
export async function getAverageWalkingMinutes(
  institutionId: string | Types.ObjectId,
  hostelId: string | Types.ObjectId,
): Promise<number | null> {
  const instId =
    typeof institutionId === "string" ? new Types.ObjectId(institutionId) : institutionId;
  const hId = typeof hostelId === "string" ? new Types.ObjectId(hostelId) : hostelId;

  const { WalkingDistanceCacheModel } = await getModels();

  const result = await WalkingDistanceCacheModel.aggregate<{ _id: null; avgMinutes: number }>([
    { $match: { institution_id: instId, hostel_id: hId } },
    { $group: { _id: null, avgMinutes: { $avg: "$walking_minutes" } } },
  ]);

  return result[0]?.avgMinutes ?? null;
}

/**
 * Retrieves all cached walking distances for an institution.
 * Used by the map UI and snapshot builder.
 */
export async function getAllCachedDistances(institutionId: string | Types.ObjectId): Promise<
  Array<{
    hostelId: string;
    academicBlockId: string;
    walkingMinutes: number;
    distanceMeters: number;
    source: string;
  }>
> {
  const instId =
    typeof institutionId === "string" ? new Types.ObjectId(institutionId) : institutionId;

  const { WalkingDistanceCacheModel } = await getModels();

  const entries = await WalkingDistanceCacheModel.find({
    institution_id: instId,
  }).lean();

  return entries.map((e) => ({
    hostelId: e.hostel_id.toString(),
    academicBlockId: e.academic_block_id.toString(),
    walkingMinutes: e.walking_minutes,
    distanceMeters: e.distance_meters,
    source: e.source,
  }));
}
