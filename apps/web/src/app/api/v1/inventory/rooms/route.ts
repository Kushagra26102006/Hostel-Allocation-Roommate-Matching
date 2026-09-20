import { z } from "zod";
import { Types } from "mongoose";
import { apiHandler } from "@/lib/api/handler.js";
import { RoomRepository, BlockRepository, HostelRepository } from "@hostelhub/db";
import { paginationQuerySchema } from "@/lib/api/pagination.js";
import { ApiProblemError } from "@/lib/api/errors.js";

const roomQuerySchema = paginationQuerySchema.extend({
  block_id: z.string().optional(),
  hostel_id: z.string().optional(),
  room_type: z.enum(["single", "double", "triple", "quad", "dorm"]).optional(),
  ac: z
    .preprocess((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") return val.toLowerCase() === "true";
      return undefined;
    }, z.boolean().optional()),
  accessible: z
    .preprocess((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") return val.toLowerCase() === "true";
      return undefined;
    }, z.boolean().optional()),
  status: z.enum(["available", "full", "maintenance", "reserved"]).optional(),
});

const createRoomSchema = z.object({
  block_id: z.string().min(1, "block_id is required"),
  hostel_id: z.string().optional(),
  room_number: z.string().min(1, "room_number is required"),
  room_type: z.enum(["single", "double", "triple", "quad", "dorm"]),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  accessible: z.boolean().default(false),
  ac: z.boolean().default(false),
  status: z.enum(["available", "full", "maintenance", "reserved"]).default("available"),
});

export const GET = apiHandler(
  {
    query: roomQuerySchema,
    operationId: "listRooms",
    summary: "List Rooms",
  },
  async ({ institution_id, query }) => {
    const repo = new RoomRepository(institution_id);
    const filter: Record<string, unknown> = {};
    if (query.block_id) filter.block_id = new Types.ObjectId(query.block_id);
    if (query.hostel_id) filter.hostel_id = new Types.ObjectId(query.hostel_id);
    if (query.room_type) filter.room_type = query.room_type;
    if (query.status) filter.status = query.status;
    if (query.ac !== undefined) filter.ac = query.ac;
    if (query.accessible !== undefined) filter.accessible = query.accessible;

    const result = await repo.paginate(
      filter,
      {
        ...(query.limit ? { limit: query.limit } : {}),
        ...(query.cursor ? { cursor: query.cursor } : {}),
        sortField: (query.sortField as "_id") ?? "_id",
        sortOrder: query.sortOrder ?? "asc",
      },
    );

    return result;
  },
);

export const POST = apiHandler(
  {
    permission: "inventory:manage",
    body: createRoomSchema,
    operationId: "createRoom",
    summary: "Create Room",
  },
  async ({ institution_id, body }) => {
    const blockRepo = new BlockRepository(institution_id);
    const block = await blockRepo.findById(body.block_id);
    if (!block) {
      throw new ApiProblemError({
        type: "https://hostelhub.campus.edu/probs/not-found",
        title: "Block Not Found",
        status: 404,
        detail: `Block with ID ${body.block_id} does not exist in tenant.`,
        code: "NOT_FOUND",
      });
    }

    const hostelRepo = new HostelRepository(institution_id);
    let hostelObjectId: Types.ObjectId;
    if (body.hostel_id) {
      hostelObjectId = new Types.ObjectId(body.hostel_id);
      const hostel = await hostelRepo.findById(hostelObjectId);
      if (!hostel) {
        throw new ApiProblemError({
          type: "https://hostelhub.campus.edu/probs/not-found",
          title: "Hostel Not Found",
          status: 404,
          detail: `Hostel with ID ${body.hostel_id} does not exist in tenant.`,
          code: "NOT_FOUND",
        });
      }
      if (String(block.hostel_id) !== String(hostelObjectId)) {
        throw new ApiProblemError({
          type: "https://hostelhub.campus.edu/probs/validation-failed",
          title: "Block/Hostel Mismatch",
          status: 422,
          detail: `Block ${body.block_id} does not belong to Hostel ${body.hostel_id}.`,
          code: "VALIDATION_FAILED",
        });
      }
    } else {
      hostelObjectId = block.hostel_id;
    }

    const repo = new RoomRepository(institution_id);
    const room = await repo.create({
      block_id: block._id,
      hostel_id: hostelObjectId,
      room_number: body.room_number,
      room_type: body.room_type,
      capacity: body.capacity,
      accessible: body.accessible ?? false,
      ac: body.ac ?? false,
      status: body.status ?? "available",
    });
    return room;
  },
);
