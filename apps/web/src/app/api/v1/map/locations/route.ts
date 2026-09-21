import { apiHandler } from "@/lib/api/handler.js";
import { HostelRepository } from "@hostelhub/db";
import { getAllCachedDistances } from "@/lib/routing/distance-precomputer.js";

/**
 * Simple read-only repository for academic blocks since there's no custom repo yet.
 */
async function getAcademicBlocks(institutionId: unknown) {
  // Dynamic import to avoid the no-restricted-imports rule on direct model usage
  const { AcademicBlockModel } = await import("@hostelhub/db");
  return AcademicBlockModel.find({ institution_id: institutionId })
    .select("name short_code location")
    .lean();
}

export const GET = apiHandler(
  {
    public: true,
    operationId: "getMapLocations",
    summary: "Get hostel and academic block locations with cached walking distances",
  },
  async ({ institution_id }) => {
    // Load hostels with location data via repository
    const hostelRepo = new HostelRepository(institution_id);
    const hostels = await hostelRepo.find({
      status: "active",
    });

    const hostelLocations = hostels
      .filter((h) => h.location?.lat && h.location?.lng)
      .map((h) => ({
        id: h._id.toString(),
        name: h.name,
        genderPolicy: h.gender_policy,
        lat: h.location!.lat,
        lng: h.location!.lng,
        status: h.status,
      }));

    // Load academic blocks
    const blocks = await getAcademicBlocks(institution_id);

    const academicBlocks = blocks.map((b) => ({
      id: b._id.toString(),
      name: b.name,
      shortCode: b.short_code,
      lat: b.location.lat,
      lng: b.location.lng,
    }));

    // Load cached walking distances
    const distances = await getAllCachedDistances(institution_id);

    return {
      hostels: hostelLocations,
      academicBlocks,
      distances,
    };
  },
);
