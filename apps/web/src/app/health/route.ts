/**
 * GET /health
 *
 * Root liveness probe — returns HTTP 200 when Next.js server is up.
 * Re-exports the API v1 health probe for UptimeRobot / Better Stack monitoring.
 */

export { GET, runtime, dynamic } from "../api/v1/health/route";
