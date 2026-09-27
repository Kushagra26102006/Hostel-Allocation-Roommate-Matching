/**
 * GET /health
 *
 * Root liveness probe — returns HTTP 200 when Next.js server is up.
 * Re-exports the API v1 health probe for UptimeRobot / Better Stack monitoring.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { GET } from "../api/v1/health/route";
