/**
 * GET /api/v1/health
 *
 * Liveness probe — always returns 200 if the process is up.
 * Does NOT check downstream dependencies (use /ready for that).
 */

import { apiHandler } from "@/lib/api/handler";
import { nowIso } from "@hostelhub/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiHandler(
  {
    public: true,
    operationId: "getHealth",
    summary: "Liveness Probe",
    tags: ["System"],
  },
  async () => {
    return { status: "ok", ts: nowIso() };
  },
);
