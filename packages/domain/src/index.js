/**
 * @hostelhub/domain
 * Core domain types and pure business logic modules.
 */
/** Branded constructor so callers can't pass arbitrary strings. */
export function createHostelId(raw) {
    return raw;
}
export * from "./eligibility/index.js";
//# sourceMappingURL=index.js.map