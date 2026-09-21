/**
 * GET /ready
 *
 * Root readiness probe — checks MongoDB, Redis, and Object Storage.
 * Re-exports the API v1 readiness probe for load balancers and uptime monitors.
 */

export { GET, runtime, dynamic } from "../api/v1/ready/route";
