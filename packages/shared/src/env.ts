/**
 * @hostelhub/shared — env.ts
 *
 * Zod-validated environment schemas for web and worker processes.
 * The app fails fast with a formatted error if required vars are missing
 * or have wrong types — no silent misconfigurations.
 */

import { z } from "zod";

// ── Shared base fields (present in both web and worker) ───────────────────────

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // MongoDB
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  // Redis
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL"),

  // MinIO / S3
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_ACCESS_KEY: z.string().default("minioadmin"),
  S3_SECRET_KEY: z.string().default("minioadmin"),
  S3_BUCKET: z.string().default("hostelhub-docs"),

  // Encryption
  MASTER_ENCRYPTION_KEY: z.string().min(32, "MASTER_ENCRYPTION_KEY must be at least 32 chars"),
  ENCRYPTION_KEY_ID: z.string().default("v1"),
});

// ── Feature flags shared by all apps ─────────────────────────────────────────

const featureFlagSchema = z.object({
  FF_NEW_BOOKING_FLOW: z
    .string()
    .transform((v) => v === "true")
    .pipe(z.boolean())
    .default("false"),
});

// ── Web-specific schema ───────────────────────────────────────────────────────

export const webEnvSchema = baseSchema.merge(featureFlagSchema).extend({
  APP_URL: z.string().url("APP_URL must be a valid URL").default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars"),
  AUTH_ALLOWED_DOMAIN: z.string().optional(),
  AUTH_TRUST_HOST: z
    .string()
    .transform((v) => v === "true")
    .pipe(z.boolean())
    .default("false"),

  // Cloudflare Turnstile
  TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // SMTP
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

// ── Worker-specific schema ────────────────────────────────────────────────────

export const workerEnvSchema = baseSchema.merge(featureFlagSchema).extend({
  // SMTP
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

// ── parseEnv & getWebEnv — fail-fast helper ──────────────────────────────────

let cachedWebEnv: WebEnv | null = null;

export function resetWebEnvCache(): void {
  cachedWebEnv = null;
}

export function validateProductionSecrets(env: WebEnv): void {
  if (env.NODE_ENV === "production") {
    const isPlaceholder = (val: string | undefined) =>
      !val ||
      val.toLowerCase().includes("changeme") ||
      val.toLowerCase().includes("insecure") ||
      val.toLowerCase().includes("demo-");

    if (isPlaceholder(env.AUTH_SECRET)) {
      throw new Error(
        "Production security error: AUTH_SECRET must not be a placeholder or contain 'insecure'/'changeme'.",
      );
    }
    if (isPlaceholder(env.MASTER_ENCRYPTION_KEY)) {
      throw new Error(
        "Production security error: MASTER_ENCRYPTION_KEY must not be a placeholder or contain 'insecure'/'changeme'.",
      );
    }
    if (env.TURNSTILE_SECRET_KEY && isPlaceholder(env.TURNSTILE_SECRET_KEY)) {
      throw new Error(
        "Production security error: TURNSTILE_SECRET_KEY must not be a placeholder or test key in production.",
      );
    }
    if (env.TURNSTILE_SITE_KEY && isPlaceholder(env.TURNSTILE_SITE_KEY)) {
      throw new Error(
        "Production security error: TURNSTILE_SITE_KEY must not be a placeholder or test key in production.",
      );
    }
  }
}

export function parseEnv<S extends z.ZodTypeAny>(
  schema: S,
  rawEnv: NodeJS.ProcessEnv | Record<string, string | undefined>,
): z.infer<S> {
  const result = schema.safeParse(rawEnv);

  if (!result.success) {
    const formatted = result.error.errors
      .map((e) => `  • ${e.path.join(".")}: ${e.message}`)
      .join("\n");

    throw new Error(
      `\n❌  Environment validation failed:\n${formatted}\n\n` +
        `Copy .env.example → .env and fill in the required values.\n`,
    );
  }

  return result.data as z.infer<S>;
}

export function getWebEnv(): WebEnv {
  if (!cachedWebEnv) {
    cachedWebEnv = parseEnv(webEnvSchema, process.env);
    validateProductionSecrets(cachedWebEnv);
  }
  return cachedWebEnv;
}
