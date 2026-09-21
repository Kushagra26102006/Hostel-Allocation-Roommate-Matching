/**
 * @hostelhub/shared — logger.ts
 *
 * pino logger factory with a consistent redact list across the platform.
 * Uses pino-pretty in development for human-readable output.
 */

import pino from "pino";

// Paths to redact from all log output (exact keys and nested patterns)
export const REDACT_PATHS: string[] = [
  // Auth / secrets
  "password",
  "*.password",
  "token",
  "*.token",
  "secret",
  "*.secret",
  "authorization",
  "*.authorization",
  "req.headers.authorization",
  "*.headers.authorization",
  "MASTER_ENCRYPTION_KEY",
  "AUTH_SECRET",
  // PII
  "email",
  "*.email",
  "phone",
  "*.phone",
  // Security questions / KYC / Compatibility
  "answers",
  "*.answers",
  "answers.*",
  "responses",
  "*.responses",
  "responses.*",
  "questionnaire",
  "*.questionnaire",
  "questionnaire.*",
  "ciphertext",
  "*.ciphertext",
];

export type LoggerOptions = {
  level?: pino.LevelWithSilent;
  destination?: pino.DestinationStream;
};

/**
 * Creates a named pino logger child.
 * In non-production environments the transport is pino-pretty for readability.
 */
export function createLogger(name: string, opts: LoggerOptions = {}) {
  const isDev = process.env["NODE_ENV"] !== "production";
  const level = opts.level ?? (isDev ? "debug" : "info");

  const isNextRuntime = typeof process.env["NEXT_RUNTIME"] !== "undefined";
  const transport: pino.TransportSingleOptions | undefined =
    isDev && !isNextRuntime && !opts.destination
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss",
            ignore: "pid,hostname",
          },
        }
      : undefined;

  const loggerConfig = {
    name,
    level,
    redact: {
      paths: REDACT_PATHS,
      censor: "[REDACTED]",
    },
  };

  if (opts.destination) {
    return pino(loggerConfig, opts.destination);
  }

  return pino(loggerConfig, transport ? pino.transport(transport) : undefined);
}

/**
 * Default application-wide logger.
 * Import this directly for quick logging; use createLogger() for named children.
 */
export const logger = createLogger("hostelhub");
