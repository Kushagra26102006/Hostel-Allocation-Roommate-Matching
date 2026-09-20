import Papa from "papaparse";
import ExcelJS from "exceljs";
import { Types } from "mongoose";
import {
  HostelRepository,
  BlockRepository,
  RoomRepository,
  BedRepository,
  type HostelDocument,
  type BlockDocument,
  type RoomDocument,
} from "@hostelhub/db";

export interface FlatInventoryItem {
  hostelName: string;
  genderPolicy: string;
  address: string;
  hostelStatus: string;
  blockName: string;
  floorNo: number;
  wing: string;
  liftAccess: boolean;
  roomNumber: string;
  roomType: string;
  capacity: number;
  accessible: boolean;
  ac: boolean;
  roomStatus: string;
  bedNo: string;
  bedStatus: string;
  window: boolean | string;
  distanceToBlocks: number | string;
}

function sanitizeFormula(value: unknown): unknown {
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

/**
 * Loads all inventory for an institution and flattens it into row records.
 */
export async function getFlatInventory(
  institutionId: string | Types.ObjectId,
): Promise<FlatInventoryItem[]> {
  const instObjectId =
    typeof institutionId === "string" ? new Types.ObjectId(institutionId) : institutionId;

  const hostelRepo = new HostelRepository(instObjectId);
  const blockRepo = new BlockRepository(instObjectId);
  const roomRepo = new RoomRepository(instObjectId);
  const bedRepo = new BedRepository(instObjectId);

  // Load all data scoped to institution
  const [hostels, blocks, rooms, beds] = await Promise.all([
    hostelRepo.find({}),
    blockRepo.find({}),
    roomRepo.find({}),
    bedRepo.find({}),
  ]);

  const hostelMap = new Map<string, HostelDocument>();
  hostels.forEach((h) => hostelMap.set(h._id.toString(), h));

  const blockMap = new Map<string, BlockDocument>();
  blocks.forEach((b) => blockMap.set(b._id.toString(), b));

  const roomMap = new Map<string, RoomDocument>();
  rooms.forEach((r) => roomMap.set(r._id.toString(), r));

  const flatItems: FlatInventoryItem[] = [];

  for (const bed of beds) {
    const room = roomMap.get(bed.room_id.toString());
    if (!room) continue;

    const block = blockMap.get(room.block_id.toString());
    if (!block) continue;

    const hostel = hostelMap.get(block.hostel_id.toString());
    if (!hostel) continue;

    const attrs = (bed.attributes ?? {}) as {
      window?: boolean;
      distance_to_blocks?: number;
    };

    flatItems.push({
      hostelName: sanitizeFormula(hostel.name) as string,
      genderPolicy: sanitizeFormula(hostel.gender_policy) as string,
      address: sanitizeFormula(hostel.address) as string,
      hostelStatus: sanitizeFormula(hostel.status) as string,
      blockName: sanitizeFormula(block.name) as string,
      floorNo: block.floor_no,
      wing: sanitizeFormula(block.wing) as string,
      liftAccess: block.lift_access,
      roomNumber: sanitizeFormula(room.room_number) as string,
      roomType: sanitizeFormula(room.room_type) as string,
      capacity: room.capacity,
      accessible: room.accessible,
      ac: room.ac,
      roomStatus: sanitizeFormula(room.status) as string,
      bedNo: sanitizeFormula(bed.bed_no) as string,
      bedStatus: sanitizeFormula(bed.status) as string,
      window: attrs.window !== undefined ? (sanitizeFormula(attrs.window) as boolean | string) : "",
      distanceToBlocks:
        attrs.distance_to_blocks !== undefined
          ? (sanitizeFormula(attrs.distance_to_blocks) as number | string)
          : "",
    });
  }

  // Sort logically by hostel, block, floor, room, bed
  flatItems.sort((a, b) => {
    if (a.hostelName !== b.hostelName) return a.hostelName.localeCompare(b.hostelName);
    if (a.blockName !== b.blockName) return a.blockName.localeCompare(b.blockName);
    if (a.floorNo !== b.floorNo) return a.floorNo - b.floorNo;
    if (a.roomNumber !== b.roomNumber) return a.roomNumber.localeCompare(b.roomNumber);
    return a.bedNo.localeCompare(b.bedNo);
  });

  return flatItems;
}

/**
 * Generates a CSV string of the institution's inventory.
 */
export async function exportInventoryCsv(institutionId: string | Types.ObjectId): Promise<string> {
  const items = await getFlatInventory(institutionId);
  return Papa.unparse(items);
}

/**
 * Generates an XLSX Buffer of the institution's inventory with styled headers.
 */
export async function exportInventoryXlsx(institutionId: string | Types.ObjectId): Promise<Buffer> {
  const items = await getFlatInventory(institutionId);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Hostel Inventory");

  worksheet.columns = [
    { header: "Hostel Name", key: "hostelName", width: 22 },
    { header: "Gender Policy", key: "genderPolicy", width: 15 },
    { header: "Address", key: "address", width: 25 },
    { header: "Hostel Status", key: "hostelStatus", width: 14 },
    { header: "Block Name", key: "blockName", width: 16 },
    { header: "Floor No", key: "floorNo", width: 10 },
    { header: "Wing", key: "wing", width: 12 },
    { header: "Lift Access", key: "liftAccess", width: 12 },
    { header: "Room Number", key: "roomNumber", width: 14 },
    { header: "Room Type", key: "roomType", width: 14 },
    { header: "Capacity", key: "capacity", width: 10 },
    { header: "Accessible", key: "accessible", width: 12 },
    { header: "AC", key: "ac", width: 8 },
    { header: "Room Status", key: "roomStatus", width: 14 },
    { header: "Bed No", key: "bedNo", width: 10 },
    { header: "Bed Status", key: "bedStatus", width: 14 },
    { header: "Window", key: "window", width: 10 },
    { header: "Distance to Blocks", key: "distanceToBlocks", width: 18 },
  ];

  // Header row formatting
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" }, // slate-800
  };

  items.forEach((item) => {
    worksheet.addRow(item);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
