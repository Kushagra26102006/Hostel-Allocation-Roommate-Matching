import { z } from "zod";
import { Types } from "mongoose";
import { apiHandler } from "@/lib/api/handler.js";
import { BedRepository } from "@hostelhub/db";
import { paginationQuerySchema } from "@/lib/api/pagination.js";

const bedQuerySchema = paginationQuerySchema.extend({
  room_id: z.string().optional(),
  status: z.enum(["available", "held", "out_of_service", "occupied"]).optional(),
});

const createBedSchema = z.object({
  room_id: z.string().min(1, "room_id is required"),
  bed_no: z.string().min(1, "bed_no is required"),
  status: z.enum(["available", "held", "out_of_service", "occupied"]).default("available"),
  attributes: z.record(z.unknown()).optional(),
});

export const GET = apiHandler(
  {
    query: bedQuerySchema,
    operationId: "listBeds",
    summary: "List Beds",
  },
  async ({ institution_id, query }) => {
    const repo = new BedRepository(institution_id);
    const filter: Record<string, unknown> = {};
    if (query.room_id) filter.room_id = new Types.ObjectId(query.room_id);
    if (query.status) filter.status = query.status;

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
    body: createBedSchema,
    operationId: "createBed",
    summary: "Create Bed",
  },
  async ({ institution_id, body }) => {
    const repo = new BedRepository(institution_id);
    const bed = await repo.create({
      room_id: new Types.ObjectId(body.room_id),
      bed_no: body.bed_no.trim(),
      status: body.status ?? "available",
      attributes: body.attributes ?? {},
    });
    return bed;
  },
);
