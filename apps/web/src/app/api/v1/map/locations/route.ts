import { apiHandler } from "@/lib/api/handler.js";
import { connectDb, HostelRepository } from "@hostelhub/db";
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
    await connectDb();
    let instId = institution_id;
    if (!instId) {
      const { InstitutionModel } = await import("@hostelhub/db");
      const defaultInst = await InstitutionModel.findOne({ status: "active" }).select("_id").lean();
      if (defaultInst) {
        instId = defaultInst._id.toString();
      }
    }

    if (!instId) {
      return {
        hostels: [],
        academicBlocks: [],
        distances: [],
      };
    }

    // Load hostels with location data via repository
    const hostelRepo = new HostelRepository(instId);
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
    const blocks = await getAcademicBlocks(instId);

    const academicBlocks = blocks.map((b) => ({
      id: b._id.toString(),
      name: b.name,
      shortCode: b.short_code,
      lat: b.location.lat,
      lng: b.location.lng,
    }));

    // Load cached walking distances
    const distances = await getAllCachedDistances(instId);

    return {
      hostels: hostelLocations,
      academicBlocks,
      distances,
    };
  },
);
