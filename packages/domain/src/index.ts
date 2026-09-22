/**
 * @hostelhub/domain
 * Core domain types and pure business logic modules.
 */

export type HostelId = string & { readonly _brand: "HostelId" };

export interface LegacyHostel {
  id: HostelId;
  name: string;
  city: string;
  totalBeds: number;
}

/** Branded constructor so callers can't pass arbitrary strings. */
export function createHostelId(raw: string): HostelId {
  return raw as HostelId;
}

export * from "./eligibility/index.js";
export * from "./compatibility/index.js";
export * from "./fixtures/sample-allocation-data.js";
export * from "./allocation/index.js";
export * from "./review/index.js";
export * from "./waitlist/index.js";
export * from "./publication/index.js";
export * from "./notifications/index.js";
export * from "./changes/index.js";
export * from "./reports/index.js";
export * from "./simulator/index.js";
export * from "./routing/distance.js";
export * from "./inspection/index.js";
