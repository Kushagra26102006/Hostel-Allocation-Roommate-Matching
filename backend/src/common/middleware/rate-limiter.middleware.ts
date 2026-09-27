import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error.js";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string | undefined;
}

const memoryStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(options: RateLimitOptions) {
  const { windowMs, max, message = "Too many requests, please try again later." } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    let record = memoryStore.get(key);
    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + windowMs };
      memoryStore.set(key, record);
    } else {
      record.count += 1;
    }

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - record.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetAt / 1000));

    if (record.count > max) {
      return next(
        new AppError({
          message,
          statusCode: 429,
          code: "RATE_LIMIT_EXCEEDED",
        }),
      );
    }

    next();
  };
}

export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many authentication attempts. Please try again after 15 minutes.",
});

export const mfaRateLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: "Too many MFA attempts. Please try again after 5 minutes.",
});

export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 120,
});
