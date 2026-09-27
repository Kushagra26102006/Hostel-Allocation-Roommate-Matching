import pino from "pino";
import { env } from "./env.js";

export const logger = pino(
  env.NODE_ENV === "development"
    ? {
        level: env.LOG_LEVEL,
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            'req.headers["x-api-key"]',
            "password",
            "refreshToken",
            "token",
            "secret",
            "answers",
            "encryptedPayload",
          ],
          remove: true,
        },
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "SYS:standard",
          },
        },
      }
    : {
        level: env.LOG_LEVEL,
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            'req.headers["x-api-key"]',
            "password",
            "refreshToken",
            "token",
            "secret",
            "answers",
            "encryptedPayload",
          ],
          remove: true,
        },
      },
);
