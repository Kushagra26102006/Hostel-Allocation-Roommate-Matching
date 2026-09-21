/**
 * RoutingFactory — singleton provider selection for the routing adapter.
 *
 * Returns OpenRouteServiceAdapter if ORS_API_KEY is set, else HaversineAdapter.
 */

import type { RoutingPort } from "./routing-port.js";
import { OpenRouteServiceAdapter } from "./ors-adapter.js";
import { HaversineAdapter } from "./haversine-adapter.js";

export class RoutingFactory {
  private static instance: RoutingPort | null = null;

  static getRouter(): RoutingPort {
    if (!this.instance) {
      const orsKey = process.env["ORS_API_KEY"];
      this.instance = orsKey
        ? new OpenRouteServiceAdapter({ apiKey: orsKey })
        : new HaversineAdapter();
    }
    return this.instance;
  }

  /** Resets the cached singleton (useful for testing). */
  static reset(): void {
    this.instance = null;
  }
}
