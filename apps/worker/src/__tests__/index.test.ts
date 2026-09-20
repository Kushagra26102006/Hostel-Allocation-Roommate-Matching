/**
 * @hostelhub/worker tests
 *
 * We test env validation and the shutdown helper in isolation —
 * the main index.ts has top-level side effects (connect, listen)
 * that require live infrastructure, so those are covered by integration tests.
 */

import { describe, it, expect } from "vitest";
import { parseEnv, workerEnvSchema } from "@hostelhub/shared";

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
  FF_NEW_BOOKING_FLOW: "false",
};

describe("@hostelhub/worker — env validation", () => {
  it("process.version satisfies Node 20+", () => {
    const major = parseInt(process.version.slice(1).split(".")[0]!, 10);
    expect(major).toBeGreaterThanOrEqual(20);
  });

  it("parses a valid worker env without throwing", () => {
    const env = parseEnv(workerEnvSchema, validWorkerEnv);
    expect(env.MONGODB_URI).toBe(validWorkerEnv.MONGODB_URI);
    expect(env.REDIS_URL).toBe(validWorkerEnv.REDIS_URL);
    expect(env.FF_NEW_BOOKING_FLOW).toBe(false);
  });

  it("throws with a clear message when MONGODB_URI is missing", () => {
    const rest = Object.fromEntries(
      Object.entries(validWorkerEnv).filter(([k]) => k !== "MONGODB_URI"),
    );
    expect(() => parseEnv(workerEnvSchema, rest)).toThrow("MONGODB_URI");
  });

  it("throws with a clear message when REDIS_URL is missing", () => {
    const rest = Object.fromEntries(
      Object.entries(validWorkerEnv).filter(([k]) => k !== "REDIS_URL"),
    );
    expect(() => parseEnv(workerEnvSchema, rest)).toThrow("REDIS_URL");
  });

  it("coerces SMTP_PORT string to number", () => {
    const env = parseEnv(workerEnvSchema, validWorkerEnv);
    expect(typeof env.SMTP_PORT).toBe("number");
    expect(env.SMTP_PORT).toBe(1025);
  });
});
