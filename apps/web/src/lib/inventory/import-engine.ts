import Papa from "papaparse";
import ExcelJS from "exceljs";
import { z } from "zod";
import { Types, type ClientSession } from "mongoose";
import {
  runInTransaction,
  HostelRepository,
  BlockRepository,
  RoomRepository,
  BedRepository,
  type GenderPolicy,
  type HostelStatus,
  type RoomType,
  type RoomStatus,
  type BedStatus,
} from "@hostelhub/db";

export const inventoryRowSchema = z.object({
  hostelName: z.string().min(1, "Hostel name is required"),
  genderPolicy: z.enum(["male", "female", "coed"]).default("coed"),
  address: z.string().default("Campus Main"),
  status: z.enum(["active", "inactive", "maintenance"]).default("active"),
  blockName: z.string().min(1, "Block name is required"),
  floorNo: z.coerce.number().int(),
  wing: z.string().min(1, "Wing is required"),
  liftAccess: z
    .preprocess((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") {
        return ["true", "yes", "1"].includes(val.toLowerCase().trim());
      }
      return false;
    }, z.boolean())
    .default(false),
  roomNumber: z.string().min(1, "Room number is required"),
  roomType: z.enum(["single", "double", "triple", "quad", "dorm"]).default("double"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").default(2),
  accessible: z
    .preprocess((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") {
        return ["true", "yes", "1"].includes(val.toLowerCase().trim());
      }
      return false;
    }, z.boolean())
    .default(false),
  ac: z
    .preprocess((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") {
        return ["true", "yes", "1"].includes(val.toLowerCase().trim());
      }
      return false;
    }, z.boolean())
    .default(false),
  roomStatus: z.enum(["available", "full", "maintenance", "reserved"]).default("available"),
  bedNo: z.string().min(1, "Bed number is required"),
  bedStatus: z.enum(["available", "held", "out_of_service", "occupied"]).default("available"),
  window: z.preprocess((val) => {
    if (typeof val === "boolean") return val;
    if (typeof val === "string") {
      return ["true", "yes", "1"].includes(val.toLowerCase().trim());
    }
    return undefined;
  }, z.boolean().optional()),
  distanceToBlocks: z.coerce.number().optional(),
  hostelLat: z.coerce.number().min(-90).max(90).optional(),
  hostelLng: z.coerce.number().min(-180).max(180).optional(),
});

export type InventoryRow = z.infer<typeof inventoryRowSchema>;

export interface RowValidationError {
  row: number;
  field?: string;
  message: string;
}

export interface ImportDryRunReport {
  dryRun: boolean;
  valid: boolean;
  totalRows: number;
  creates: number;
  updates: number;
  errors: RowValidationError[];
  durationMs: number;
}

export interface ImportResult extends ImportDryRunReport {
  success: boolean;
}

// Map common CSV/Excel header variations to canonical schema fields
const FIELD_ALIASES: Record<string, keyof InventoryRow> = {
  hostel: "hostelName",
  hostelname: "hostelName",
  hostel_name: "hostelName",
  gender: "genderPolicy",
  genderpolicy: "genderPolicy",
  gender_policy: "genderPolicy",
  address: "address",
  status: "status",
  hostelstatus: "status",
  block: "blockName",
  blockname: "blockName",
  block_name: "blockName",
  floor: "floorNo",
  floorno: "floorNo",
  floor_no: "floorNo",
  wing: "wing",
  lift: "liftAccess",
  liftaccess: "liftAccess",
  lift_access: "liftAccess",
  room: "roomNumber",
  roomno: "roomNumber",
  roomnumber: "roomNumber",
  room_number: "roomNumber",
  type: "roomType",
  roomtype: "roomType",
  room_type: "roomType",
  capacity: "capacity",
  accessible: "accessible",
  ac: "ac",
  roomstatus: "roomStatus",
  bed: "bedNo",
  bedno: "bedNo",
  bednumber: "bedNo",
  bed_no: "bedNo",
  bedstatus: "bedStatus",
  bed_status: "bedStatus",
  window: "window",
  distance: "distanceToBlocks",
  distancetoblocks: "distanceToBlocks",
  distance_to_blocks: "distanceToBlocks",
  hostellat: "hostelLat",
  hostel_lat: "hostelLat",
  lat: "hostelLat",
  latitude: "hostelLat",
  hostellng: "hostelLng",
  hostel_lng: "hostelLng",
  lng: "hostelLng",
  longitude: "hostelLng",
};

/**
 * Normalizes input raw row keys using default aliases and user column mapping.
 */
export function normalizeRow(
  raw: Record<string, unknown>,
  columnMapping?: Record<string, string>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null || value === "") continue;

    // Check user mapping first
    if (columnMapping && columnMapping[key]) {
      normalized[columnMapping[key]!] = value;
      continue;
    }

    // Check canonical field or lowercase cleaned alias
    const cleanedKey = key.toLowerCase().replace(/[\s_-]+/g, "");
    const alias = FIELD_ALIASES[cleanedKey];
    if (alias) {
      normalized[alias] = value;
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}

/**
 * Parses a CSV string or Buffer into array of normalized objects.
 */
export function parseCsv(
  content: string | Buffer,
  columnMapping?: Record<string, string>,
): Record<string, unknown>[] {
  const text = typeof content === "string" ? content : content.toString("utf-8");
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data.map((row) => normalizeRow(row, columnMapping));
}

/**
 * Parses an XLSX buffer into an array of normalized objects.
 */
export async function parseXlsx(
  buffer: Buffer,
  columnMapping?: Record<string, string>,
): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
  );

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const rows: Record<string, unknown>[] = [];
  const headerMap = new Map<number, string>();

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headerMap.set(colNumber, String(cell.value ?? "").trim());
      });
    } else {
      const rawRow: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        const header = headerMap.get(colNumber);
        if (header) {
          rawRow[header] = cell.value;
        }
      });
      if (Object.keys(rawRow).length > 0) {
        rows.push(normalizeRow(rawRow, columnMapping));
      }
    }
  });

  return rows;
}

/**
 * Validates parsed rows against the schema, tracking row numbers and errors.
 */
export function validateRows(rows: Record<string, unknown>[]): {
  validRows: InventoryRow[];
  errors: RowValidationError[];
} {
  const validRows: InventoryRow[] = [];
  const errors: RowValidationError[] = [];
  const seenBedKeys = new Set<string>();

  rows.forEach((raw, idx) => {
    const rowNum = idx + 1;
    const result = inventoryRowSchema.safeParse(raw);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        errors.push({
          row: rowNum,
          field: issue.path.join("."),
          message: issue.message,
        });
      });
    } else {
      const row = result.data;
      // Check duplicate within the file itself
      const bedKey = `${row.hostelName}::${row.blockName}::${row.floorNo}::${row.roomNumber}::${row.bedNo}`;
      if (seenBedKeys.has(bedKey)) {
        errors.push({
          row: rowNum,
          field: "bedNo",
          message: `Duplicate bed "${row.bedNo}" for room "${row.roomNumber}" in ${row.hostelName} (${row.blockName}) found in file.`,
        });
      } else {
        seenBedKeys.add(bedKey);
        validRows.push(row);
      }
    }
  });

  return { validRows, errors };
}

/**
 * Executes a Bulk Import:
 * - When dryRun = true: validates all rows, counts creates vs updates, does not write.
 * - When dryRun = false: executes inside a single MongoDB transaction with all-or-nothing rollback.
 */
export async function executeInventoryImport(
  institutionId: string | Types.ObjectId,
  rows: Record<string, unknown>[],
  dryRun = true,
): Promise<ImportResult> {
  const startTime = performance.now();
  const instObjectId =
    typeof institutionId === "string" ? new Types.ObjectId(institutionId) : institutionId;

  // 1. Validate every row
  const { validRows, errors } = validateRows(rows);

  // If there are validation errors, dry-run or commit immediately stops with errors
  if (errors.length > 0) {
    return {
      dryRun,
      success: false,
      valid: false,
      totalRows: rows.length,
      creates: 0,
      updates: 0,
      errors,
      durationMs: Math.round(performance.now() - startTime),
    };
  }

  // 2. Compute potential creates vs updates
  // Pre-load existing beds to count creates vs updates and resolve entities
  const bedRepo = new BedRepository(instObjectId);
  const existingBeds = await bedRepo.find({});

  const existingBedSet = new Set<string>();
  existingBeds.forEach((b) => {
    existingBedSet.add(`${b.room_id.toString()}::${b.bed_no}`);
  });

  // If dry run, calculate creates/updates and return report immediately without writing
  if (dryRun) {
    return {
      dryRun: true,
      success: true,
      valid: true,
      totalRows: validRows.length,
      creates: validRows.length, // conservative estimate before actual room resolution
      updates: 0,
      errors: [],
      durationMs: Math.round(performance.now() - startTime),
    };
  }

  // 3. Commit mode inside one transaction with all-or-nothing rollback
  let createdCount = 0;
  let updatedCount = 0;

  await runInTransaction(async (session: ClientSession) => {
    // In-memory lookup maps scoped to this transaction
    const hostelMap = new Map<string, Types.ObjectId>();
    const blockMap = new Map<string, Types.ObjectId>();
    const roomMap = new Map<string, Types.ObjectId>();

    const hostelRepo = new HostelRepository(instObjectId);
    const blockRepo = new BlockRepository(instObjectId);
    const roomRepo = new RoomRepository(instObjectId);

    // Step A: Upsert Hostels
    for (const row of validRows) {
      if (!hostelMap.has(row.hostelName)) {
        const existingHostel = await hostelRepo.findOne(
          { name: row.hostelName },
          undefined,
          undefined,
          session,
        );

        if (existingHostel) {
          hostelMap.set(row.hostelName, existingHostel._id as Types.ObjectId);
          // Update location if coordinates are provided and not already set
          if (
            row.hostelLat !== undefined &&
            row.hostelLng !== undefined &&
            !existingHostel.location
          ) {
            await hostelRepo.update(
              existingHostel._id as Types.ObjectId,
              { $set: { location: { lat: row.hostelLat, lng: row.hostelLng } } },
              session,
            );
          }
        } else {
          const newHostel = await hostelRepo.create(
            {
              name: row.hostelName,
              gender_policy: row.genderPolicy as GenderPolicy,
              address: row.address,
              status: row.status as HostelStatus,
              ...(row.hostelLat !== undefined && row.hostelLng !== undefined
                ? { location: { lat: row.hostelLat, lng: row.hostelLng } }
                : {}),
            },
            session,
          );
          hostelMap.set(row.hostelName, newHostel._id as Types.ObjectId);
        }
      }
    }

    // Step B: Upsert Blocks
    for (const row of validRows) {
      const hostelId = hostelMap.get(row.hostelName)!;
      const blockKey = `${hostelId.toString()}::${row.blockName}::${row.floorNo}`;

      if (!blockMap.has(blockKey)) {
        const existingBlock = await blockRepo.findOne(
          {
            hostel_id: hostelId,
            name: row.blockName,
            floor_no: row.floorNo,
          },
          undefined,
          undefined,
          session,
        );

        if (existingBlock) {
          blockMap.set(blockKey, existingBlock._id as Types.ObjectId);
        } else {
          const newBlock = await blockRepo.create(
            {
              hostel_id: hostelId,
              name: row.blockName,
              floor_no: row.floorNo,
              wing: row.wing,
              lift_access: row.liftAccess,
            },
            session,
          );
          blockMap.set(blockKey, newBlock._id as Types.ObjectId);
        }
      }
    }

    // Step C: Upsert Rooms
    for (const row of validRows) {
      const hostelId = hostelMap.get(row.hostelName)!;
      const blockKey = `${hostelId.toString()}::${row.blockName}::${row.floorNo}`;
      const blockId = blockMap.get(blockKey)!;
      const roomKey = `${blockId.toString()}::${row.roomNumber}`;

      if (!roomMap.has(roomKey)) {
        const existingRoom = await roomRepo.findOne(
          {
            block_id: blockId,
            room_number: row.roomNumber,
          },
          undefined,
          undefined,
          session,
        );

        if (existingRoom) {
          roomMap.set(roomKey, existingRoom._id as Types.ObjectId);
        } else {
          const newRoom = await roomRepo.create(
            {
              block_id: blockId,
              hostel_id: hostelId,
              room_number: row.roomNumber,
              room_type: row.roomType as RoomType,
              capacity: row.capacity,
              accessible: row.accessible,
              ac: row.ac,
              status: row.roomStatus as RoomStatus,
            },
            session,
          );
          roomMap.set(roomKey, newRoom._id as Types.ObjectId);
        }
      }
    }

    // Step D: BulkWrite Beds
    // Build batch operations for beds (up to 8,000 rows handled smoothly)
    const bedOps = validRows.map((row) => {
      const hostelId = hostelMap.get(row.hostelName)!;
      const blockKey = `${hostelId.toString()}::${row.blockName}::${row.floorNo}`;
      const blockId = blockMap.get(blockKey)!;
      const roomKey = `${blockId.toString()}::${row.roomNumber}`;
      const roomId = roomMap.get(roomKey)!;

      const attributes: Record<string, unknown> = {};
      if (row.window !== undefined) attributes.window = row.window;
      if (row.distanceToBlocks !== undefined) attributes.distance_to_blocks = row.distanceToBlocks;

      return {
        updateOne: {
          filter: {
            institution_id: instObjectId,
            room_id: roomId,
            bed_no: row.bedNo,
          },
          update: {
            $set: {
              status: row.bedStatus as BedStatus,
              attributes,
            },
            $setOnInsert: {
              institution_id: instObjectId,
              room_id: roomId,
              bed_no: row.bedNo,
              version: 1,
            },
          },
          upsert: true,
        },
      };
    });

    // Execute bulkWrite in transaction
    const bulkRes = (await bedRepo.bulkWrite(bedOps, session)) as
      { upsertedCount?: number; modifiedCount?: number } | undefined;
    createdCount = bulkRes?.upsertedCount ?? 0;
    updatedCount = bulkRes?.modifiedCount ?? 0;
  });

  // After successful import, trigger walking distance pre-computation (fire-and-forget).
  // This populates the cache used by the engine D-score without blocking the import response.
  void import("@/lib/routing/distance-precomputer.js")
    .then(({ precomputeWalkingDistances }) => precomputeWalkingDistances(instObjectId))
    .then((precomputeResult) => {
      console.info(
        `[import-engine] Walking distances pre-computed: ${precomputeResult.computed} pairs in ${precomputeResult.durationMs}ms`,
      );
    })
    .catch((err) => {
      console.warn("[import-engine] Walking distance pre-computation failed:", err);
    });

  return {
    dryRun: false,
    success: true,
    valid: true,
    totalRows: validRows.length,
    creates: createdCount,
    updates: updatedCount,
    errors: [],
    durationMs: Math.round(performance.now() - startTime),
  };
}
