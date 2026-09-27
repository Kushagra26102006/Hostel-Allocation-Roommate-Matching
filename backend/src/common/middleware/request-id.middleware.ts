import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

declare global {
  namespace Express {
    interface Request {
      id?: string | undefined;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const reqId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  req.id = reqId;
  res.setHeader("x-request-id", reqId);
  next();
}
