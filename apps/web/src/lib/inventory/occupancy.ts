import mongoose, { Types } from "mongoose";
import {
  HostelModel,
  BlockModel,
  RoomModel,
  BedModel,
  type HostelDocument,
  type BlockDocument,
  type RoomDocument,
  type BedDocument,
} from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors.js";

export interface PublicOccupancySummary {
  totalBeds: number;
  occupiedBeds: number;
  heldBeds: number;
  availableBeds: number;
  outOfServiceBeds: number;
  occupancyRate: number;
  lastUpdated: string;
}

export interface BlockOccupancyDetail {
  id: string;
  name: string;
  floor_no: number;
  wing: string;
  total: number;
  occupied: number;
  available: number;
  rate: number;
}

export interface HostelOccupancyDetail {
  id: string;
  name: string;
  gender_policy: string;
  total: number;
  occupied: number;
  available: number;
  rate: number;
  blocks: BlockOccupancyDetail[];
}

export interface RoomTypeOccupancyDetail {
  total: number;
  occupied: number;
  available: number;
  rate: number;
}

export interface StaffOccupancyDetail extends PublicOccupancySummary {
  byHostel: HostelOccupancyDetail[];
  byRoomType: Record<string, RoomTypeOccupancyDetail>;
}

/**
 * Calculates real occupancy metrics without fallback data fabrication.
 * - If isStaff = false: returns PublicOccupancySummary
 * - If isStaff = true: returns StaffOccupancyDetail
 */
export async function getOccupancyMetrics(
  institutionId?: string | Types.ObjectId | null,
  isStaff = false,
): Promise<PublicOccupancySummary | StaffOccupancyDetail> {
  const queryFilter: Record<string, unknown> = {};
  if (institutionId) {
    queryFilter.institution_id =
      typeof institutionId === "string"
        ? new Types.ObjectId(institutionId)
        : institutionId;
  }

  let beds: BedDocument[] = [];
  try {
    const bedsQuery = BedModel.find(queryFilter);
    beds = typeof bedsQuery.lean === "function" ? await bedsQuery.lean<BedDocument[]>() : await bedsQuery;
  } catch (err) {
    throw new ApiProblemError({
      type: "https://hostelhub.campus.edu/probs/service-unavailable",
      title: "Service Unavailable",
      status: 503,
      detail: "Database query failed while calculating occupancy metrics.",
      code: "SERVICE_UNAVAILABLE",
    });
  }

  const totalBeds = beds.length;
  let occupiedBeds = 0;
  let heldBeds = 0;
  let availableBeds = 0;
  let outOfServiceBeds = 0;

  for (const bed of beds) {
    if (bed.status === "occupied") occupiedBeds++;
    else if (bed.status === "held") heldBeds++;
    else if (bed.status === "available") availableBeds++;
    else if (bed.status === "out_of_service") outOfServiceBeds++;
  }

  // Real zero response for empty datasets (no fake numbers)
  if (totalBeds === 0) {
    const emptySummary: PublicOccupancySummary = {
      totalBeds: 0,
      occupiedBeds: 0,
      heldBeds: 0,
      availableBeds: 0,
      outOfServiceBeds: 0,
      occupancyRate: 0,
      lastUpdated: new Date().toISOString(),
    };
    if (!isStaff) return emptySummary;
    return {
      ...emptySummary,
      byHostel: [],
      byRoomType: {},
    };
  }

  const effectiveTotal = totalBeds - outOfServiceBeds;
  const occupancyRate =
    effectiveTotal > 0 ? Math.round((occupiedBeds / effectiveTotal) * 100) : 0;

  const publicSummary: PublicOccupancySummary = {
    totalBeds,
    occupiedBeds,
    heldBeds,
    availableBeds,
    outOfServiceBeds,
    occupancyRate,
    lastUpdated: new Date().toISOString(),
  };

  if (!isStaff) {
    return publicSummary;
  }

  // Staff Detail Calculation
  let hostels: HostelDocument[] = [];
  let blocks: BlockDocument[] = [];
  let rooms: RoomDocument[] = [];

  try {
    const hostelsQuery = HostelModel.find(queryFilter);
    hostels = typeof hostelsQuery.lean === "function" ? await hostelsQuery.lean<HostelDocument[]>() : await hostelsQuery;

    const blocksQuery = BlockModel.find(queryFilter);
    blocks = typeof blocksQuery.lean === "function" ? await blocksQuery.lean<BlockDocument[]>() : await blocksQuery;

    const roomsQuery = RoomModel.find(queryFilter);
    rooms = typeof roomsQuery.lean === "function" ? await roomsQuery.lean<RoomDocument[]>() : await roomsQuery;
  } catch {
    // If details load fails, return summary with empty breakdowns
    return {
      ...publicSummary,
      byHostel: [],
      byRoomType: {},
    };
  }

  const roomMap = new Map<string, RoomDocument>();
  rooms.forEach((r) => roomMap.set(r._id.toString(), r));

  const blockMap = new Map<string, BlockDocument>();
  blocks.forEach((b) => blockMap.set(b._id.toString(), b));

  const hostelMap = new Map<string, HostelDocument>();
  hostels.forEach((h) => hostelMap.set(h._id.toString(), h));

  const blockStats = new Map<string, { total: number; occupied: number; available: number }>();
  const hostelStats = new Map<string, { total: number; occupied: number; available: number }>();
  const roomTypeStats: Record<string, { total: number; occupied: number; available: number }> = {};

  for (const bed of beds) {
    const room = roomMap.get(bed.room_id.toString());
    if (!room) continue;

    const block = blockMap.get(room.block_id.toString());
    if (!block) continue;

    const hostel = hostelMap.get(block.hostel_id.toString());
    if (!hostel) continue;

    const blockId = block._id.toString();
    const hostelId = hostel._id.toString();

    const bStat = blockStats.get(blockId) ?? { total: 0, occupied: 0, available: 0 };
    bStat.total++;
    if (bed.status === "occupied" || bed.status === "held") bStat.occupied++;
    if (bed.status === "available") bStat.available++;
    blockStats.set(blockId, bStat);

    const hStat = hostelStats.get(hostelId) ?? { total: 0, occupied: 0, available: 0 };
    hStat.total++;
    if (bed.status === "occupied" || bed.status === "held") hStat.occupied++;
    if (bed.status === "available") hStat.available++;
    hostelStats.set(hostelId, hStat);

    const rType = room.room_type ?? "double";
    if (!roomTypeStats[rType]) {
      roomTypeStats[rType] = { total: 0, occupied: 0, available: 0 };
    }
    roomTypeStats[rType]!.total++;
    if (bed.status === "occupied" || bed.status === "held") roomTypeStats[rType]!.occupied++;
    if (bed.status === "available") roomTypeStats[rType]!.available++;
  }

  const byHostel: HostelOccupancyDetail[] = hostels.map((hostel) => {
    const hId = hostel._id.toString();
    const hStat = hostelStats.get(hId) ?? { total: 0, occupied: 0, available: 0 };
    const hRate = hStat.total > 0 ? Math.round((hStat.occupied / hStat.total) * 100) : 0;

    const hostelBlocks = blocks.filter((b) => b.hostel_id.toString() === hId);
    const blockDetails: BlockOccupancyDetail[] = hostelBlocks.map((b) => {
      const bId = b._id.toString();
      const bStat = blockStats.get(bId) ?? { total: 0, occupied: 0, available: 0 };
      const bRate = bStat.total > 0 ? Math.round((bStat.occupied / bStat.total) * 100) : 0;

      return {
        id: bId,
        name: b.name,
        floor_no: b.floor_no,
        wing: b.wing,
        total: bStat.total,
        occupied: bStat.occupied,
        available: bStat.available,
        rate: bRate,
      };
    });

    return {
      id: hId,
      name: hostel.name,
      gender_policy: hostel.gender_policy,
      total: hStat.total,
      occupied: hStat.occupied,
      available: hStat.available,
      rate: hRate,
      blocks: blockDetails,
    };
  });

  const byRoomType: Record<string, RoomTypeOccupancyDetail> = {};
  for (const [rt, stat] of Object.entries(roomTypeStats)) {
    byRoomType[rt] = {
      ...stat,
      rate: stat.total > 0 ? Math.round((stat.occupied / stat.total) * 100) : 0,
    };
  }

  return {
    ...publicSummary,
    byHostel,
    byRoomType,
  };
}
