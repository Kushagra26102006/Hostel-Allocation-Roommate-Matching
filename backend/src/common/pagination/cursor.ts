import { z } from "zod";

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface CursorPayload {
  id: string;
  timestamp?: number | undefined;
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeCursor(cursor?: string): CursorPayload | null {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && typeof parsed.id === "string") {
      return parsed as CursorPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string | undefined;
  hasMore: boolean;
  total?: number | undefined;
}

export function paginateArray<T>(items: T[], limit: number, cursor?: string): PaginatedResult<T> {
  const decoded = decodeCursor(cursor);
  let startIndex = 0;

  if (decoded) {
    const found = items.findIndex((item) => {
      const record = item as { id?: string; _id?: unknown };
      const id = record.id || (record._id ? String(record._id) : "");
      return id === decoded.id;
    });
    if (found !== -1) {
      startIndex = found + 1;
    }
  }

  const sliced = items.slice(startIndex, startIndex + limit + 1);
  const hasMore = sliced.length > limit;
  const resultItems = hasMore ? sliced.slice(0, limit) : sliced;

  let nextCursor: string | undefined;
  if (hasMore && resultItems.length > 0) {
    const last = resultItems[resultItems.length - 1] as
      { id?: string; _id?: unknown; createdAt?: Date } | undefined;
    if (last) {
      const lastId = last.id || (last._id ? String(last._id) : "");
      nextCursor = encodeCursor({
        id: lastId,
        timestamp: last.createdAt ? new Date(last.createdAt).getTime() : undefined,
      });
    }
  }

  return {
    items: resultItems,
    nextCursor,
    hasMore,
    total: items.length,
  };
}
