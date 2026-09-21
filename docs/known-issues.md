# Known Issues & Prioritised Technical Debt Register

**Last Updated:** September 2026  
**Review Cadence:** Bi-weekly engineering review

This document provides an open, honest, and prioritised accounting of known bugs, architectural limitations, performance bottlenecks, and technical debt in the HostelHub codebase, complete with severity levels, operational mitigations, and scheduled remediations.

---

## 1. Issue Severity Classification

- **P0 (Blocker):** Immediate data loss, system outage, or critical security vulnerability.
- **P1 (High):** Major functional defect or significant performance degradation without easy workaround.
- **P2 (Medium):** Non-blocking functional limitation, edge-case defect, or sub-optimal UX.
- **P3 (Low):** Minor visual quirk, technical debt, code cleanup, or documentation gap.

---

## 2. Active Issues & Technical Debt Register

|     ID      | Priority | Area                    | Description & Impact                                                                                                                                    | Current Mitigation                                                                         | Target Milestone / Resolution                                                                                                                   |
| :---------: | :------: | :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **DEBT-01** |  **P1**  | **Worker Scalability**  | Bulk allocation benchmark (8,000 applicants) runs synchronously in-worker thread. Under massive loads, Node.js event loop latency increases by ~250 ms. | Benchmark executes in < 31s; BullMQ separates job processing from Web HTTP server.         | Offload Gale-Shapley matching loop to a compiled Rust or C++ Node-API native addon or dedicated worker thread pool. _(Target: v2.1)_            |
| **DEBT-02** |  **P1**  | **Real-Time Presence**  | Warden collaborative bed map presence uses polling fallback if Redis Pub/Sub WebSocket disconnects in high-latency mobile networks.                     | Automatic client reconnection with 3-second exponential backoff.                           | Upgrade to native WebSockets via Socket.io / Cloudflare Workers Durable Objects for multi-warden presence. _(Target: v2.1)_                     |
| **DEBT-03** |  **P2**  | **PWA Offline Sync**    | Offline draft synchronization handles two-way conflicts via version number modal, but does not support three-way field-level auto-merge.                | Student is presented with side-by-side comparison modal to choose Local vs Server version. | Implement JSON CRDT (Automerge / Yjs) for field-level non-conflicting collaborative merging. _(Target: v2.2)_                                   |
| **DEBT-04** |  **P2**  | **Large CSV Importer**  | CSV inventory import streams rows in memory; files with > 50,000 beds may cause elevated heap memory usage during dry-run validation.                   | File size limit capped at 10 MB in Nginx / Next.js route handler.                          | Refactor CSV parser to use Node.js `stream/promises` with batched chunking into MongoDB `insertMany(..., { ordered: false })`. _(Target: v2.2)_ |
| **DEBT-05** |  **P3**  | **i18n Coverage**       | Hindi (`hi`) and Punjabi (`pa`) translations cover 100% of student-facing strings, but administrative staff portals are English-only.                   | Staff interfaces (warden review, cycle wizard) currently require English proficiency.      | Expand localization dictionary to staff console routes. _(Target: v2.3)_                                                                        |
| **DEBT-06** |  **P3**  | **Test Mocking Parity** | Some integration tests rely on in-memory mock repositories instead of real MongoDB replica set instances.                                               | CI pipeline includes MongoDB 7 and Redis services with integration test gate.              | Consolidate all database tests around Testcontainers for 100% replica-set feature parity. _(Target: v2.2)_                                      |

---

## 3. Technical Debt Management Process

1. **Bug Triage:** All issues filed by students, wardens, or CI failures are assigned a severity (`P0`–`P3`) within 24 hours.
2. **Regression Testing:** Every resolved known issue must include an automated unit or Playwright E2E regression test.
3. **Flakiness Policy:** Retries are disabled in CI (`retries: 0`). Any flaky test is immediately investigated and fixed at the root cause rather than hidden.
