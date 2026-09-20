/**
 * @hostelhub/domain
 * Core domain types and pure business logic modules.
 */
export type HostelId = string & {
    readonly _brand: "HostelId";
};
export interface Hostel {
    id: HostelId;
    name: string;
    city: string;
    totalBeds: number;
}
/** Branded constructor so callers can't pass arbitrary strings. */
export declare function createHostelId(raw: string): HostelId;
export * from "./eligibility/index.js";
//# sourceMappingURL=index.d.ts.map