import { z } from "zod";
import { Types } from "mongoose";
import { apiHandler } from "@/lib/api/handler.js";
import { RoomRepository, BlockModel } from "@hostelhub/db";
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
      {
        limit: query.limit,
        cursor: query.cursor,
        sortField: (query.sortField as "_id") ?? "_id",
        sortOrder: query.sortOrder ?? "asc",
      },
      filter,
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
    const blockObjectId = new Types.ObjectId(body.block_id);

    // Resolve hostel_id from block if not explicitly passed
    let hostelObjectId: Types.ObjectId;
    if (body.hostel_id) {
      hostelObjectId = new Types.ObjectId(body.hostel_id);
    } else {
      const block = await BlockModel.findById(blockObjectId);
      if (!block) {
        throw new ApiProblemError({
          type: "https://hostelhub.campus.edu/probs/not-found",
          title: "Block Not Found",
          status: 404,
          detail: `Block with ID ${body.block_id} does not exist.`,
          code: "NOT_FOUND",
        });
      }
      hostelObjectId = block.hostel_id;
    }

    const repo = new RoomRepository(institution_id);
    const room = await repo.create({
      block_id: blockObjectId,
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
