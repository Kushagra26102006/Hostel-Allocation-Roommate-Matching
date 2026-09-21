/**
 * @hostelhub/worker
 * Background worker — validates env, connects to dependencies,
 * and exits cleanly on SIGTERM.
 */

import mongoose from "mongoose";
import { Redis } from "ioredis";
import { parseEnv, workerEnvSchema, createLogger } from "@hostelhub/shared";
import { setupWindowScheduler } from "./window-scheduler.js";
import { setupAllocationWorker } from "./allocation-processor.js";
import { setupLetterWorker } from "./letter-processor.js";
import { setupNotificationWorker } from "./notification-processor.js";
import { setupAppealEscalationWorker } from "./appeal-escalation-processor.js";

// ── 1. Validate environment (fail fast) ───────────────────────────────────────
const env = parseEnv(workerEnvSchema, process.env);

const log = createLogger("worker");

// ── 2. Connect to MongoDB ─────────────────────────────────────────────────────
log.info("Connecting to MongoDB...");
await mongoose.connect(env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5_000,
});
log.info("MongoDB connected");

// ── 3. Connect to Redis (BullMQ requires maxRetriesPerRequest: null) ──────────
log.info("Connecting to Redis...");
const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  connectTimeout: 5_000,
  lazyConnect: true,
});
await redis.connect();
log.info("Redis connected");

// ── 4. Setup BullMQ Window Scheduler & Background Processors ───────────────
const { queue, worker } = await setupWindowScheduler(redis);
log.info("Window scheduler registered and running");

const allocationWorker = setupAllocationWorker(redis);
log.info("Allocation background worker registered and listening for jobs");

const letterWorker = setupLetterWorker(redis);
log.info("Letter background worker registered and listening for batch jobs");

const notificationWorker = setupNotificationWorker(redis);
log.info("Notification hub worker registered and listening for domain events");

const { worker: escalationWorker, queue: escalationQueue } = setupAppealEscalationWorker(redis);
log.info("Appeal escalation worker registered (hourly SLA check)");

// ── 5. Signal readiness ───────────────────────────────────────────────────────
log.info({ pid: process.pid }, "worker ready");

// ── 6. SIGTERM — graceful shutdown ────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  log.info({ signal }, "Shutting down worker...");
  try {
    await escalationWorker.close();
    await escalationQueue.close();
    await notificationWorker.close();
    await letterWorker.close();
    await allocationWorker.close();
    await worker.close();
    await queue.close();
    await redis.quit();
    await mongoose.disconnect();
    log.info("Clean shutdown complete");
  } catch (err) {
    log.error({ err }, "Error during shutdown");
  } finally {
    process.exit(0);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
