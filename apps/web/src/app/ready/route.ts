/**
 * GET /ready
 *
 * Root readiness probe — checks MongoDB, Redis, and Object Storage.
 * Re-exports the API v1 readiness probe for load balancers and uptime monitors.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { GET } from "../api/v1/ready/route";
