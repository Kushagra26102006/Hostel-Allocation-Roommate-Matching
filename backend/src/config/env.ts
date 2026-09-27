import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  MONGODB_URI: z.string().default("mongodb://localhost:27017/hostelhub"),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  JWT_SECRET: z.string().min(16).default("super-secret-jwt-key-minimum-32-chars-length!!"),
  JWT_REFRESH_SECRET: z.string().min(16).default("super-secret-refresh-jwt-key-32-chars-min!"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  ENCRYPTION_KEY: z
    .string()
    .length(64)
    .default("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
  COOKIE_SECRET: z.string().default("super-secret-cookie-signing-key-32-chars!!"),

  OIDC_ISSUER: z.string().optional(),
  OIDC_CLIENT_ID: z.string().optional(),
  OIDC_CLIENT_SECRET: z.string().optional(),
  OIDC_REDIRECT_URI: z.string().optional(),

  STORAGE_PROVIDER: z.enum(["local", "s3", "minio"]).default("local"),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_REGION: z.string().default("us-east-1"),
  STORAGE_BUCKET: z.string().default("hostelhub-documents"),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_FORCE_PATH_STYLE: z.coerce.boolean().default(true),

  EMAIL_PROVIDER: z.enum(["console", "resend", "brevo", "mailtrap"]).default("console"),
  EMAIL_FROM: z.string().default("no-reply@hostelhub.local"),
  EMAIL_API_KEY: z.string().optional(),

  SMS_PROVIDER: z.enum(["console", "twilio"]).default("console"),
  SMS_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:admin@hostelhub.local"),

  ASSISTANT_PROVIDER: z.enum(["gemini", "ollama", "disabled"]).default("disabled"),
  GEMINI_API_KEY: z.string().optional(),

  ROUTING_PROVIDER: z.enum(["haversine", "openrouteservice"]).default("haversine"),
  OPENROUTESERVICE_API_KEY: z.string().optional(),

  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
});

export type EnvConfig = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
