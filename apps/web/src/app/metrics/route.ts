/**
 * GET /metrics
 *
 * Root Prometheus metrics endpoint.
 * Re-exports the API v1 metrics route for Prometheus / Grafana scraping.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { GET } from "../api/v1/metrics/route";
