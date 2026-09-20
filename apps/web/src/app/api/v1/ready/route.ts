/**
 * GET /api/v1/ready
 *
 * Readiness probe — checks MongoDB, Redis and MinIO.
 * Returns 200 with all-green deps, or 503 with per-dependency status.
 */

import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api/handler";
import { pingMongo } from "@/lib/mongo";
import { pingRedis } from "@/lib/redis";
import { pingMinio } from "@/lib/minio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DepStatus = "ok" | string;

interface ReadyResponse {
  status: "ok" | "degraded";
  deps: {
    mongo: DepStatus;
    redis: DepStatus;
    minio: DepStatus;
  };
}

async function check(fn: () => Promise<void>): Promise<DepStatus> {
  try {
    await fn();
    return "ok";
  } catch (err) {
    return `error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export const GET = apiHandler(
  {
    public: true,
    operationId: "getReady",
    summary: "Readiness Probe",
    tags: ["System"],
  },
  async () => {
    const [mongo, redis, minio] = await Promise.all([
      check(pingMongo),
      check(pingRedis),
      check(pingMinio),
    ]);

    const deps = { mongo, redis, minio };
    const allOk = Object.values(deps).every((s) => s === "ok");

    const body: ReadyResponse = {
      status: allOk ? "ok" : "degraded",
      deps,
    };

    return NextResponse.json(body, { status: allOk ? 200 : 503 });
  },
);
