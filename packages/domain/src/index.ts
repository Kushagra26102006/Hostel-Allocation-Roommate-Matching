/**
 * @hostelhub/domain
 * Core domain types and pure business logic modules.
 */

export type HostelId = string & { readonly _brand: "HostelId" };

export interface Hostel {
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
