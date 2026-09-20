import { z } from "zod";

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  sortField: z.string().default("_id"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginatedMeta {
  limit: number;
  nextCursor: string | null;
  hasNextPage: boolean;
  total?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginatedMeta;
}

/**
 * Creates a standard paginated envelope containing items and cursor metadata.
 */
export function createPaginatedResponse<T>(
  items: T[],
  limit: number,
  nextCursor: string | null,
  total?: number,
): PaginatedResponse<T> {
  return {
    items,
    pagination: {
      limit,
      nextCursor,
      hasNextPage: Boolean(nextCursor),
      ...(total !== undefined ? { total } : {}),
    },
  };
}
