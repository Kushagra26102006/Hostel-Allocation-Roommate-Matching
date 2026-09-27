import { Types } from "mongoose";
import Papa from "papaparse";
import {
  HostelModel,
  BlockModel,
  RoomModel,
  BedModel,
  type IHostel,
  type HostelDocument,
  type IBlock,
  type BlockDocument,
  type IRoom,
  type RoomDocument,
  type IBed,
  type BedDocument,
  type GenderPolicy,
} from "@hostelhub/db";
import { NotFoundError, ConflictError, BadRequestError } from "../../common/errors/app-error.js";
import { AuditService } from "../audit/audit.service.js";
import { paginateArray, type PaginatedResult } from "../../common/pagination/index.js";

export interface OccupancySummary {
  totalBeds: number;
  allocatedBeds: number;
  availableBeds: number;
  maintenanceBeds: number;
  occupancyRate: number;
  hostels: Array<{
    hostelId: Types.ObjectId;
    name: string;
    total: number;
    occupied: number;
    rate: number;
  }>;
}

export class InventoryService {
  // Hostels
  public static async listHostels(institutionId: string): Promise<IHostel[]> {
    return HostelModel.find({ institution_id: new Types.ObjectId(institutionId), status: "active" })
      .sort({ name: 1 })
      .lean<IHostel[]>();
  }

  public static async createHostel(
    institutionId: string,
    data: {
      name: string;
      code: string;
      genderPolicy: string;
      capacity: number;
      location?: { latitude: number; longitude: number } | undefined;
    },
    actor: { userId: string; email: string; role: string },
  ): Promise<HostelDocument> {
    const instId = new Types.ObjectId(institutionId);
    const existing = await HostelModel.findOne({ institution_id: instId, name: data.name });
    if (existing) {
      throw new ConflictError(`Hostel '${data.name}' already exists`, "HOSTEL_EXISTS");
    }

    const gender: GenderPolicy =
      data.genderPolicy.toLowerCase() === "female"
        ? "female"
        : data.genderPolicy.toLowerCase() === "coed"
          ? "coed"
          : "male";

    const hostel = await HostelModel.create({
      institution_id: instId,
      name: data.name,
      gender_policy: gender,
      address: "Main Campus",
      status: "active",
      location: data.location
        ? { lat: data.location.latitude, lng: data.location.longitude }
        : { lat: 0, lng: 0 },
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "inventory.create_hostel",
      target: { resourceType: "Hostel", resourceId: hostel._id.toString() },
      after: { name: hostel.name },
    });

    return hostel;
  }

  // Blocks
  public static async listBlocks(
    institutionId: string,
    hostelId?: string | undefined,
  ): Promise<IBlock[]> {
    const filter: Record<string, unknown> = {
      institution_id: new Types.ObjectId(institutionId),
      status: "active",
    };
    if (hostelId) filter.hostel_id = new Types.ObjectId(hostelId);
    return BlockModel.find(filter).sort({ name: 1 }).lean<IBlock[]>();
  }

  public static async createBlock(
    institutionId: string,
    data: { hostelId: string; name: string; code: string; floorsCount: number },
    actor: { userId: string; email: string; role: string },
  ): Promise<BlockDocument> {
    const instId = new Types.ObjectId(institutionId);
    const block = await BlockModel.create({
      institution_id: instId,
      hostel_id: new Types.ObjectId(data.hostelId),
      name: data.name,
      floor_no: data.floorsCount ?? 1,
      wing: data.code ?? "A",
      lift_access: true,
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "inventory.create_block",
      target: { resourceType: "Block", resourceId: block._id.toString() },
      after: { name: block.name, wing: block.wing, floor_no: block.floor_no },
    });

    return block;
  }

  // Rooms
  public static async listRooms(
    institutionId: string,
    query: {
      hostelId?: string | undefined;
      blockId?: string | undefined;
      floor?: number | undefined;
      limit?: number | undefined;
      cursor?: string | undefined;
    },
  ): Promise<PaginatedResult<IRoom>> {
    const filter: Record<string, unknown> = {
      institution_id: new Types.ObjectId(institutionId),
      status: "active",
    };
    if (query.hostelId) filter.hostel_id = new Types.ObjectId(query.hostelId);
    if (query.blockId) filter.block_id = new Types.ObjectId(query.blockId);
    if (query.floor !== undefined) filter.floor_number = query.floor;

    const rooms = await RoomModel.find(filter).sort({ room_number: 1 }).lean<IRoom[]>();
    return paginateArray<IRoom>(rooms, query.limit ?? 50, query.cursor);
  }

  public static async createRoom(
    institutionId: string,
    data: {
      hostelId: string;
      blockId: string;
      roomNumber: string;
      floorNumber: number;
      capacity: number;
      roomType: string;
      genderPolicy: string;
      isAccessible?: boolean | undefined;
    },
    actor: { userId: string; email: string; role: string },
  ): Promise<RoomDocument> {
    const instId = new Types.ObjectId(institutionId);
    const hostelObjectId = new Types.ObjectId(data.hostelId);

    const existing = await RoomModel.findOne({
      institution_id: instId,
      hostel_id: hostelObjectId,
      room_number: data.roomNumber,
    });
    if (existing) {
      throw new ConflictError(
        `Room '${data.roomNumber}' already exists in this hostel`,
        "ROOM_EXISTS",
      );
    }

    const room = await RoomModel.create({
      institution_id: instId,
      hostel_id: hostelObjectId,
      block_id: new Types.ObjectId(data.blockId),
      room_number: data.roomNumber,
      floor_number: 1,
      capacity: data.capacity,
      room_type:
        data.roomType.toLowerCase() === "single"
          ? "single"
          : data.roomType.toLowerCase() === "triple"
            ? "triple"
            : "double",
      accessible: data.isAccessible ?? false,
      ac: false,
      status: "available",
    });

    // Auto-create beds
    const bedPromises = [];
    for (let i = 1; i <= data.capacity; i++) {
      bedPromises.push(
        BedModel.create({
          institution_id: instId,
          room_id: room._id,
          bed_no: `B${i}`,
          status: "available",
        }),
      );
    }
    await Promise.all(bedPromises);

    await AuditService.record({
      institutionId,
      actor,
      action: "inventory.create_room",
      target: { resourceType: "Room", resourceId: room._id.toString() },
      after: { roomNumber: room.room_number, capacity: room.capacity },
    });

    return room;
  }

  // Beds
  public static async listBeds(
    institutionId: string,
    query: {
      roomId?: string | undefined;
      hostelId?: string | undefined;
      status?: string | undefined;
      limit?: number | undefined;
      cursor?: string | undefined;
    },
  ): Promise<PaginatedResult<IBed>> {
    const filter: Record<string, unknown> = { institution_id: new Types.ObjectId(institutionId) };
    if (query.roomId) filter.room_id = new Types.ObjectId(query.roomId);
    if (query.status) filter.status = query.status;

    const beds = await BedModel.find(filter).sort({ bed_no: 1 }).lean<IBed[]>();
    return paginateArray<IBed>(beds, query.limit ?? 50, query.cursor);
  }

  public static async createBed(
    institutionId: string,
    data: { hostelId: string; roomId: string; bedNumber: string },
    actor: { userId: string; email: string; role: string },
  ): Promise<BedDocument> {
    const instId = new Types.ObjectId(institutionId);
    const roomObjectId = new Types.ObjectId(data.roomId);

    const existing = await BedModel.findOne({
      room_id: roomObjectId,
      bed_no: data.bedNumber,
    });
    if (existing) {
      throw new ConflictError(`Bed '${data.bedNumber}' already exists in this room`, "BED_EXISTS");
    }

    const bed = await BedModel.create({
      institution_id: instId,
      room_id: roomObjectId,
      bed_no: data.bedNumber,
      status: "available",
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "inventory.create_bed",
      target: { resourceType: "Bed", resourceId: bed._id.toString() },
      after: { bedNumber: bed.bed_no },
    });

    return bed;
  }

  public static async updateBed(
    institutionId: string,
    bedId: string,
    data: { status?: string | undefined; notes?: string | undefined },
    actor: { userId: string; email: string; role: string },
  ): Promise<BedDocument> {
    const bed = await BedModel.findOne({
      _id: new Types.ObjectId(bedId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!bed) {
      throw new NotFoundError("Bed not found", "BED_NOT_FOUND");
    }

    const before = { status: bed.status };
    if (data.status) {
      const s = data.status.toLowerCase();
      bed.status =
        s === "occupied" || s === "allocated"
          ? "occupied"
          : s === "held"
            ? "held"
            : s === "maintenance" || s === "out_of_service"
              ? "out_of_service"
              : "available";
    }
    await bed.save();

    await AuditService.record({
      institutionId,
      actor,
      action: "inventory.update_bed",
      target: { resourceType: "Bed", resourceId: bed._id.toString() },
      before,
      after: { status: bed.status },
    });

    return bed;
  }

  // Import CSV/Excel inventory
  public static async importInventory(
    institutionId: string,
    csvContent: string,
    actor: { userId: string; email: string; role: string },
  ): Promise<{ importedBeds: number; importedRooms: number }> {
    const instId = new Types.ObjectId(institutionId);
    const parsed = Papa.parse<Record<string, string>>(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      throw new BadRequestError("Invalid CSV content", "CSV_PARSE_ERROR");
    }

    let importedRooms = 0;
    let importedBeds = 0;

    for (const row of parsed.data) {
      const hostelName = row.hostelName || row.Hostel || "Default Hostel";
      const blockName = row.blockName || row.Block || "Main Block";
      const roomNumber = row.roomNumber || row.Room;
      const bedNumber = row.bedNumber || row.Bed || "B1";
      const capacity = parseInt(row.capacity || "1", 10);
      const genderPolicy = (row.gender || row.genderPolicy || "coed").toLowerCase() as GenderPolicy;

      if (!roomNumber) continue;

      let hostel = await HostelModel.findOne({ institution_id: instId, name: hostelName });
      if (!hostel) {
        hostel = await HostelModel.create({
          institution_id: instId,
          name: hostelName,
          gender_policy: genderPolicy,
          address: "Main Campus",
          status: "active",
        });
      }

      let block = await BlockModel.findOne({
        institution_id: instId,
        hostel_id: hostel._id,
        name: blockName,
      });
      if (!block) {
        block = await BlockModel.create({
          institution_id: instId,
          hostel_id: hostel._id,
          name: blockName,
          code: blockName.substring(0, 2).toUpperCase(),
          floors_count: 4,
          status: "active",
        });
      }

      let room = await RoomModel.findOne({
        institution_id: instId,
        hostel_id: hostel._id,
        room_number: roomNumber,
      });
      if (!room) {
        room = await RoomModel.create({
          institution_id: instId,
          hostel_id: hostel._id,
          block_id: block._id,
          room_number: roomNumber,
          capacity,
          room_type: capacity === 1 ? "single" : capacity === 2 ? "double" : "triple",
          accessible: false,
          ac: false,
          status: "available",
        });
        importedRooms++;
      }

      const existingBed = await BedModel.findOne({ room_id: room._id, bed_no: bedNumber });
      if (!existingBed) {
        await BedModel.create({
          institution_id: instId,
          room_id: room._id,
          bed_no: bedNumber,
          status: "available",
        });
        importedBeds++;
      }
    }

    await AuditService.record({
      institutionId,
      actor,
      action: "inventory.import",
      target: { resourceType: "Inventory", resourceId: institutionId },
      after: { importedRooms, importedBeds },
    });

    return { importedRooms, importedBeds };
  }

  // Occupancy summary
  public static async getOccupancySummary(institutionId: string): Promise<OccupancySummary> {
    const instId = new Types.ObjectId(institutionId);
    const [totalBeds, allocatedBeds, availableBeds, maintenanceBeds] = await Promise.all([
      BedModel.countDocuments({ institution_id: instId }),
      BedModel.countDocuments({ institution_id: instId, status: "occupied" }),
      BedModel.countDocuments({ institution_id: instId, status: "available" }),
      BedModel.countDocuments({ institution_id: instId, status: "out_of_service" }),
    ]);

    const hostels = await HostelModel.find({ institution_id: instId, status: "active" }).lean<
      HostelDocument[]
    >();
    const hostelBreakdown = await Promise.all(
      hostels.map(async (h) => {
        const rooms = await RoomModel.find({ institution_id: instId, hostel_id: h._id });
        const roomIds = rooms.map((r) => r._id);
        const total = await BedModel.countDocuments({
          institution_id: instId,
          room_id: { $in: roomIds },
        });
        const occupied = await BedModel.countDocuments({
          institution_id: instId,
          room_id: { $in: roomIds },
          status: "occupied",
        });
        return {
          hostelId: h._id,
          name: h.name,
          total,
          occupied,
          rate: total > 0 ? Math.round((occupied / total) * 100) : 0,
        };
      }),
    );

    return {
      totalBeds,
      allocatedBeds,
      availableBeds,
      maintenanceBeds,
      occupancyRate: totalBeds > 0 ? Math.round((allocatedBeds / totalBeds) * 100) : 0,
      hostels: hostelBreakdown,
    };
  }
}
