import { z } from "zod";

export const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export function isValidObjectId(id: string): boolean {
  return typeof id === "string" && objectIdRegex.test(id);
}

export const objectIdSchema = z.string().refine((val) => isValidObjectId(val), {
  message: "Invalid ObjectId string (must be 24 hex characters)",
});
