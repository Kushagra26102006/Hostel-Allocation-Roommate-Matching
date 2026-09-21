import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { HostelRepository } from "@hostelhub/db";
import { paginationQuerySchema } from "@/lib/api/pagination.js";

const hostelQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["active", "inactive", "maintenance"]).optional(),
  gender_policy: z.enum(["male", "female", "coed"]).optional(),
});

const createHostelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gender_policy: z.enum(["male", "female", "coed"]),
  address: z.string().min(1, "Address is required"),
  status: z.enum(["active", "inactive", "maintenance"]).default("active"),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});

export const GET = apiHandler(
  {
    query: hostelQuerySchema,
    operationId: "listHostels",
    summary: "List Hostels",
  },
  async ({ institution_id, query }) => {
    const repo = new HostelRepository(institution_id);
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.gender_policy) filter.gender_policy = query.gender_policy;

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
    body: createHostelSchema,
    operationId: "createHostel",
    summary: "Create Hostel",
  },
  async ({ institution_id, body }) => {
    const repo = new HostelRepository(institution_id);
    const hostel = await repo.create({
      name: body.name,
      gender_policy: body.gender_policy,
      address: body.address,
      status: body.status ?? "active",
      ...(body.location && { location: body.location }),
    });
    return hostel;
  },
);
