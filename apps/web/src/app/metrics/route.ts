/**
 * GET /metrics
 *
 * Root Prometheus metrics endpoint.
 * Re-exports the API v1 metrics route for Prometheus / Grafana scraping.
 */

export { GET, runtime, dynamic } from "../api/v1/metrics/route";
