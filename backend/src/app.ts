import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { requestIdMiddleware } from "./common/middleware/request-id.middleware.js";
import { errorHandler } from "./common/errors/error-handler.js";
import { apiV1Router } from "./routes/index.js";
import { getRedisClient } from "./config/redis.js";

export function createApp(): Express {
  const app = express();

  // Security & standard middlewares
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === "production",
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: [env.CORS_ORIGIN, "http://localhost:3000", "http://localhost:3001"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "If-Match",
        "X-Request-ID",
        "X-Institution-ID",
        "X-Signature",
      ],
    }),
  );

  app.use(compression());
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use(requestIdMiddleware);

  if (env.NODE_ENV !== "test") {
    type PinoHttpFactory = (opts?: unknown) => express.RequestHandler;
    const pinoResolver = pinoHttp as unknown as {
      pinoHttp?: PinoHttpFactory;
      default?: PinoHttpFactory;
    };
    const pinoMiddleware: PinoHttpFactory | undefined =
      typeof pinoHttp === "function"
        ? (pinoHttp as unknown as PinoHttpFactory)
        : pinoResolver.pinoHttp || pinoResolver.default;
    if (pinoMiddleware) {
      app.use(
        pinoMiddleware({
          logger,
          genReqId: (req: Request) =>
            (req.headers["x-request-id"] as string) ||
            (req as Request & { id?: string }).id ||
            "unknown",
          autoLogging: {
            ignore: (req: Request) =>
              Boolean(req.url?.startsWith("/health") || req.url?.startsWith("/ready")),
          },
        }),
      );
    }
  }

  // Health and Readiness checks (Section 9)
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "UP",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
    });
  });

  app.get("/ready", async (_req: Request, res: Response) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? "UP" : "DOWN";
    let redisStatus = "DOWN";
    try {
      const redis = getRedisClient();
      const pong = await redis.ping();
      if (pong === "PONG") redisStatus = "UP";
    } catch {
      redisStatus = "DOWN";
    }

    const isReady = mongoStatus === "UP" && redisStatus === "UP";
    res.status(isReady ? 200 : 503).json({
      status: isReady ? "READY" : "DEGRADED",
      dependencies: {
        mongodb: mongoStatus,
        redis: redisStatus,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API v1
  app.use("/api/v1", apiV1Router);

  // 404 Handler for unknown routes
  app.use((req: Request, res: Response) => {
    res
      .status(404)
      .contentType("application/problem+json")
      .json({
        type: "https://hostelhub.local/errors/not-found",
        title: "Resource Not Found",
        status: 404,
        code: "NOT_FOUND",
        detail: `The requested path ${req.originalUrl} was not found on this server.`,
        instance: req.originalUrl,
      });
  });

  // Centralized Error Handler (RFC 9457 problem+json)
  app.use(errorHandler);

  return app;
}
