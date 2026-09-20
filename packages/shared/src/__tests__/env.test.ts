import { describe, it, expect } from "vitest";
import { webEnvSchema, workerEnvSchema, parseEnv } from "../env.js";

// Minimal valid env for web
const validWebEnv = {
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://localhost:27017/hostelhub?replicaSet=rs0",
  REDIS_URL: "redis://localhost:6379",
  S3_ENDPOINT: "http://localhost:9000",
  S3_ACCESS_KEY: "minioadmin",
  S3_SECRET_KEY: "minioadmin",
  S3_BUCKET: "hostelhub",
  MASTER_ENCRYPTION_KEY: "test-master-key-that-is-32-chars!!",
  APP_URL: "http://localhost:3000",
  AUTH_SECRET: "test-auth-secret-that-is-32-chars!!",
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  FF_NEW_BOOKING_FLOW: "false",
};

// Minimal valid env for worker (no APP_URL / AUTH_SECRET)
const validWorkerEnv = {
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://localhost:27017/hostelhub?replicaSet=rs0",
  REDIS_URL: "redis://localhost:6379",
  S3_ENDPOINT: "http://localhost:9000",
  S3_ACCESS_KEY: "minioadmin",
  S3_SECRET_KEY: "minioadmin",
  S3_BUCKET: "hostelhub",
  MASTER_ENCRYPTION_KEY: "test-master-key-that-is-32-chars!!",
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  FF_NEW_BOOKING_FLOW: "true",
};

describe("webEnvSchema", () => {
  it("parses a fully valid web env", () => {
    const env = parseEnv(webEnvSchema, validWebEnv);
    expect(env.MONGODB_URI).toBe(validWebEnv.MONGODB_URI);
    expect(env.SMTP_PORT).toBe(1025); // coerced from string to number
    expect(env.FF_NEW_BOOKING_FLOW).toBe(false); // coerced from "false" to boolean
  });

  it("rejects when MONGODB_URI is missing", () => {
    const rest = Object.fromEntries(
      Object.entries(validWebEnv).filter(([k]) => k !== "MONGODB_URI"),
    );
    expect(() => parseEnv(webEnvSchema, rest)).toThrow("MONGODB_URI");
  });

  it("rejects when AUTH_SECRET is too short", () => {
    expect(() => parseEnv(webEnvSchema, { ...validWebEnv, AUTH_SECRET: "short" })).toThrow(
      "AUTH_SECRET",
    );
  });

  it("rejects when APP_URL is not a valid URL", () => {
    expect(() => parseEnv(webEnvSchema, { ...validWebEnv, APP_URL: "not-a-url" })).toThrow(
      "APP_URL",
    );
  });

  it("defaults SMTP_PORT to 1025 when omitted", () => {
    const rest = Object.fromEntries(Object.entries(validWebEnv).filter(([k]) => k !== "SMTP_PORT"));
    const env = parseEnv(webEnvSchema, rest);
    expect(env.SMTP_PORT).toBe(1025);
  });

  it("coerces FF_NEW_BOOKING_FLOW string 'true' to boolean true", () => {
    const env = parseEnv(webEnvSchema, {
      ...validWebEnv,
      FF_NEW_BOOKING_FLOW: "true",
    });
    expect(env.FF_NEW_BOOKING_FLOW).toBe(true);
  });
});

describe("workerEnvSchema", () => {
  it("parses a fully valid worker env", () => {
    const env = parseEnv(workerEnvSchema, validWorkerEnv);
    expect(env.REDIS_URL).toBe(validWorkerEnv.REDIS_URL);
    expect(env.FF_NEW_BOOKING_FLOW).toBe(true);
  });

  it("rejects when REDIS_URL is not a valid URL", () => {
    expect(() => parseEnv(workerEnvSchema, { ...validWorkerEnv, REDIS_URL: "bad-url" })).toThrow(
      "REDIS_URL",
    );
  });

  it("rejects when MASTER_ENCRYPTION_KEY is too short", () => {
    expect(() =>
      parseEnv(workerEnvSchema, {
        ...validWorkerEnv,
        MASTER_ENCRYPTION_KEY: "tooshort",
      }),
    ).toThrow("MASTER_ENCRYPTION_KEY");
  });
});

describe("parseEnv error message", () => {
  it("lists all failing fields in a single error", () => {
    let message = "";
    try {
      parseEnv(webEnvSchema, {});
    } catch (e) {
      message = (e as Error).message;
    }
    // Should mention at least two missing fields
    expect(message).toContain("MONGODB_URI");
    expect(message).toContain("REDIS_URL");
    expect(message).toContain(".env.example");
  });
});
