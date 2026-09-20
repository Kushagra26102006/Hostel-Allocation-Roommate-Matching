import { z } from "zod";
import { Types } from "mongoose";
import { apiHandler } from "@/lib/api/handler.js";
import { BlockRepository } from "@hostelhub/db";
import { paginationQuerySchema } from "@/lib/api/pagination.js";

const blockQuerySchema = paginationQuerySchema.extend({
  hostel_id: z.string().optional(),
  floor_no: z.coerce.number().optional(),
});

const createBlockSchema = z.object({
  hostel_id: z.string().min(1, "hostel_id is required"),
  name: z.string().min(1, "Block name is required"),
  floor_no: z.coerce.number().int(),
  wing: z.string().min(1, "Wing is required"),
  lift_access: z.boolean().default(false),
});

export const GET = apiHandler(
  {
    query: blockQuerySchema,
    operationId: "listBlocks",
    summary: "List Blocks",
  },
  async ({ institution_id, query }) => {
    const repo = new BlockRepository(institution_id);
    const filter: Record<string, unknown> = {};
    if (query.hostel_id) {
      filter.hostel_id = new Types.ObjectId(query.hostel_id);
    }
    if (query.floor_no !== undefined) {
      filter.floor_no = query.floor_no;
    }

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
    body: createBlockSchema,
    operationId: "createBlock",
    summary: "Create Block",
  },
  async ({ institution_id, body }) => {
    const repo = new BlockRepository(institution_id);
    const block = await repo.create({
      name: body.name,
      floor_no: body.floor_no,
      wing: body.wing,
      lift_access: body.lift_access ?? false,
      hostel_id: new Types.ObjectId(body.hostel_id),
    });
    return block;
  },
);
