import type { Response } from "express";

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
): void {
  res.status(statusCode).json({
    success: true,
    data,
    meta: meta ?? undefined,
  });
}

export function sendCreated<T>(res: Response, data: T, location?: string): void {
  if (location) {
    res.setHeader("Location", location);
  }
  res.status(201).json({
    success: true,
    data,
  });
}

export function sendNoContent(res: Response): void {
  res.status(204).end();
}
