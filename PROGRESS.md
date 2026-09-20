# PROGRESS

Tracks milestones for the HostelHub project.

---

## Milestone 0 — Monorepo scaffold ✅

**Date:** 2026-09-20  
**Status:** Complete

### What was done

- [x] Initialised pnpm workspace with `apps/web`, `apps/worker`, `packages/domain`, `packages/db`, `packages/shared`
- [x] `tsconfig.base.json` — TypeScript strict mode + path aliases `@hostelhub/*`
- [x] ESLint flat config (`eslint.config.mjs`) + Prettier (`.prettierrc`)
- [x] Vitest configured in every package with at least one passing unit test
- [x] Playwright config + one smoke test in `apps/web/e2e/`
- [x] husky + lint-staged (pre-commit: lint + format staged files)
- [x] commitlint (conventional commits enforced on commit-msg)
- [x] `.editorconfig`, `.gitignore`, `.env.example`
- [x] Root scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `format`
- [x] `pnpm dev` starts `apps/web` on port 3000
- [x] `README.md` — one-command setup + architecture note
- [x] `docs/adr/0001-stack-choice.md` — stack ADR

### Packages created

| Package             | Description                             |
| ------------------- | --------------------------------------- |
| `@hostelhub/domain` | Branded domain types (Hostel, HostelId) |
| `@hostelhub/db`     | DB layer placeholder                    |
| `@hostelhub/shared` | nowIso, assertDefined utilities         |
| `@hostelhub/web`    | Next.js 15 App Router front-end         |
| `@hostelhub/worker` | Node 20 background worker               |

---

## Milestone 1 — Data Modelling & Security Hardening ✅

**Date:** 2026-09-21  
**Status:** Complete

### What was done

- [x] Defined core aggregates and Mongoose schemas in `packages/db` with tenant safety (`institution_id`) plugin
- [x] MFA & Session Security (Server-authoritative session, backup codes entropy/HMAC, Turnstile, HIBP password checks)
- [x] Data Integrity & Authorization (Application lifecycle state transitions, AST eligibility evaluator rules, tenant safety)
- [x] Document Storage & Malware Scanning (Magic byte validation, S3 presigned URLs, ClamAV adapter)
- [x] BullMQ Worker & Audit Chains (Deduplicated reminders, atomic status transitions, HMAC-SHA-256 audit chain verification)
- [x] API Platform & Error Handling (RFC 9457 Problem details, rate limiting, idempotency key reservations)
- [x] Repository Layer Enforcements & ESLint boundary rules across monorepo

---

## Milestone 2 — Deterministic Allocation Pipeline ✅

**Date:** 2026-09-21  
**Status:** Complete  
**Commit target:** `feat(domain): deterministic allocation pipeline`

### What was done

- [x] `packages/domain/src/allocation/pipeline.ts` — full 9-step pure-function `allocate()`:
  - **Step 1** `canonicalHash()` — SHA-256 over canonical sorted JSON snapshot
  - **Step 2** Eligibility partition — `HC9_HOLD_ACTIVE` units → `rejected[]` immediately
  - **Step 3** Priority sort — unit ID first, tier ASC → score DESC → PCG32 PRNG tiebreak
  - **Step 4** Group formation — `groupId = min(memberIds)` normalised
  - **Step 5** Assignment loop — `buildBedIndex` feasibility, `scoreUnit`, PRNG tie-break on `(unitId, roomId)`
  - **Step 6** Bounded local-search — up to `maxIterations` deterministic adjacent-pair swaps; swap only when total improves AND high-priority score does not decrease AND all HCs hold; iteration count only, no elapsed time
  - **Step 7** Waitlist ordering — per quota bucket by same priority key
  - **Step 8** Invariant checker — P1–P7 throw `InvariantError` with structured `details`
  - **Step 9** Metrics — `firstChoiceRate`, `avgRankSatisfied`, `giniPreferenceScore`, `categoryParityGap`, `priorityInversions`, `meanRoomCompatibility`, `minRoomCompatibility`
- [x] `onProgress(stage, done, total)` wired through all 9 stages
- [x] Integer-scaled scores (×1,000,000) — no floating-point drift across machines
- [x] `packages/domain/src/allocation/README.md` — algorithm docs + Mermaid pipeline diagram

### 154 domain tests passing (9 test files)

| Test file             | Tests | Key coverage                                                                 |
| --------------------- | ----- | ---------------------------------------------------------------------------- |
| `pipeline.test.ts`    | 25    | 12-applicant/6-room hand-verified scenario, determinism, invariants, metrics |
| `property.test.ts`    | 12    | fast-check P1–P12 properties, 200 runs                                       |
| `constraints.test.ts` | 36    | HC1–HC11 all predicates                                                      |
| `scoring.test.ts`     | 24    | P/C/F/D/K scoring components                                                 |
| `bedIndex.test.ts`    | 14    | Feasibility index                                                            |
| `prng.test.ts`        | 17    | PCG32 + FNV-1a                                                               |
| others                | 26    | compatibility, eligibility, index                                            |

### Determinism guarantees verified

| Property                                        | Result |
| ----------------------------------------------- | ------ |
| Same seed × 2 → deep-equal `AllocateResult`     | ✅     |
| Shuffled unit array → identical assignment set  | ✅     |
| Shuffled Map insertion order → identical result | ✅     |
| Different seed → only tiebreak outcomes change  | ✅     |
| `priorityInversions` always 0                   | ✅     |

---

## Milestone 3 — Property-Based Tests & 8,000×8,000 Benchmark ✅

**Date:** 2026-09-21  
**Status:** Complete  
**Commit target:** `test(domain): property-based suite and benchmark`

### What was done

- [x] `packages/domain/src/__tests__/allocation/property.test.ts` — 12 fast-check properties P1–P12
  - 200 runs in CI (`CI=true`), 2,000 runs locally (default), configurable via `PBT_RUNS=N`
  - Generates random cohorts: 2–4 hostels, 3–8 rooms, 4–15 units with randomised gender, quotas, accessibility, groups, deal-breakers, questionnaires
  - **Fixed**: `NUM_RUNS` was incorrectly defaulting to 200 locally — now correctly defaults to 2,000
- [x] `packages/domain/src/__tests__/allocation/regression-seeds.test.ts` — pinned failing seeds registry
  - Infrastructure for capturing fast-check counterexamples as permanent regression tests
  - Includes `verifyCorrectnessProperties()` helper that checks P1–P2, P4–P5, P7–P8 against any seed
- [x] `scripts/bench-allocation.ts` — 8,000 × 8,000 benchmark script (`pnpm bench:allocation`)
- [x] `docs/engine-benchmark.md` — updated with **live measured results**
- [x] `packages/domain/package.json` — added `test:pbt`, `test:pbt:ci`, `bench:allocation` scripts

### Benchmark results (Apple M1, Node 25.9.0, 2026-09-21)

|   Run    | Seed | Total (s)  | Peak Heap (MB) |     Status      |
| :------: | :--: | :--------: | :------------: | :-------------: |
|    1     |  42  |   28.761   |     195.4      |   PASS (FAST)   |
|    2     | 101  |   28.263   |     199.4      |   PASS (FAST)   |
|    3     | 777  |   29.275   |     209.0      |   PASS (FAST)   |
|    4     | 1337 |   31.882   |     210.0      |   PASS (FAST)   |
|    5     | 9999 |   33.777   |     201.7      |   PASS (FAST)   |
| **Mean** |  —   | **30.392** |   **203.1**    | **PASS (FAST)** |

- Design goal: < 120 s — **~4× under target**
- Hard threshold: < 600 s — **~20× under threshold**
- Priority inversions: **0** across all runs

### Test count

- **176 tests** passing in `@hostelhub/domain` (14 test files)

---

## Milestone 4 — Run Worker, Live Progress & Run Console (Prompt 18) ✅

**Date:** 2026-09-21  
**Status:** Complete  
**Commit target:** `feat(allocation): background runs, sse progress, run console`

### What was done

- [x] BullMQ background job processing with cancellation key and heartbeat
- [x] SSE event streams (`/api/v1/runs/[id]/events`) with Redis pub/sub
- [x] Live run console UI with metrics, progress bar, cancel action, and dry-run mode

---

## Milestone 5 — Draft Workflow, Overrides, Approval & Publish Gate (Prompt 19) ✅

**Date:** 2026-09-21  
**Status:** Complete  
**Commit target:** `feat(review): state machine, override, approval, publish gate`

### What was done

1. **State Machine (`@hostelhub/domain`)**:
   - Pure transition table: `GENERATING -> DRAFT_READY -> UNDER_REVIEW -> APPROVED -> PUBLISHED`
   - Side paths: `CHANGES_REQUESTED` (back to `UNDER_REVIEW`), `FAILED`, `DISCARDED`, `AMENDED` (new version after publication), and `ARCHIVED`
   - Role checks (`warden`, `chief_warden`, `admin`, `dean`, `system`) and transition guards
   - Zero I/O pure functions in `packages/domain/src/review/state-machine.ts`

2. **Override Engine (`@hostelhub/domain` & `@hostelhub/db`)**:
   - Reassign student bed within draft with mandatory reason (>= 10 characters)
   - Revalidation of all hard constraints (HC3-HC8, HC11 mutual deal-breakers)
   - Optimistic concurrency control using `If-Match` version checking
   - Automatic escalation tagging (`escalated: true`) for accessibility and quota moves
   - Draft version bump and hash-chained audit logging

3. **Approval & Maker-Checker Governance**:
   - `ApprovalRecord` (`draft_id`, `approver`, `second_approver`, `comment`, `approved_at`)
   - Mandatory check that all overrides have reasons and zero invariant violations
   - Escalated overrides mandate distinct second approver (Maker-Checker)

4. **Request-Changes Action**:
   - Mandatory comment (>= 10 characters), transitions draft to `CHANGES_REQUESTED`

5. **Publish Gate**:
   - Publishing allowed strictly from `APPROVED` status
   - Wardens can only publish drafts within their assigned hostel; Chief Wardens / Admin can publish all
   - Atomic publish lock using `findOneAndUpdate` with status filter `{ status: "APPROVED" }` to guarantee exactly one winner in race conditions

6. **Post-Publication Amendments**:
   - Published drafts become `ARCHIVED` and read-only
   - Creates a new amended draft version (`version_number + 1`) in `DRAFT_READY` state with cloned assignments

7. **Four Layers of Protection (All 4 Enforced)**:
   - **Layer a (Service Guard)**: `publishDraft` requires an existing, valid `ApprovalRecord`
   - **Layer b (Database Validation)**: Mongoose schema validation rejects status `PUBLISHED` if `approval_id` is missing
   - **Layer c (Read-Only Rows)**: Pre-hooks reject direct update or delete of `PUBLISHED` drafts and their assignments
   - **Layer d (Cryptographic Audit)**: Every transition, override, approval, amendment, and publish event is appended to the SHA-256 hash chain via `AuditService`

8. **Web API Endpoints (`apps/web`)**:
   - `POST /api/v1/drafts/[id]/override` (with `If-Match`)
   - `POST /api/v1/drafts/[id]/request-changes`
   - `POST /api/v1/drafts/[id]/approve`
   - `POST /api/v1/drafts/[id]/publish`
   - `POST /api/v1/drafts/[id]/amend`

9. **Verification & Tests**:
   - Pure domain unit tests: 100% pass (state machine, override validator, approval rules)
   - Database integration tests: 100% pass (service-level publish guard, direct model write rejection, reason validation, constraint violations, maker-checker escalation, read-only pre-hooks, and concurrent publish race)

---

## Milestone 6 — Warden Interface: Review Table & Animated Bed Map (Prompt 20) ✅

**Date:** 2026-09-21  
**Status:** Complete  
**Commit target:** `feat(warden): review table, bed map, explanation drawer`

### What was done

1. **Review Dashboard (`apps/web/src/components/warden/review-dashboard.tsx`)**:
   - Draft queue for the warden's assigned hostel(s)
   - Interactive status chips with icons and color schemes
   - SLA timers with urgent and overdue countdown reminders (< 24h amber warning, overdue red pulse)
   - Live progress counters updating dynamically with total placed vs unplaced ratio and animated bars

2. **TanStack Virtualized Assignment Table (`apps/web/src/components/warden/review-table.tsx`)**:
   - Powered by `@tanstack/react-table` + `@tanstack/react-virtual` for 60fps smooth scrolling with 8,000+ rows
   - Cursor-based API pagination support
   - Saved quick filter presets: `All`, `Unallocated`, `Low Compatibility (<70)`, `Accessibility Needs`, `Audited Overrides`, and `Waitlisted`
   - Full keyboard navigation and expandable row accordion displaying the explanation inline

3. **Explanation Drawer (`apps/web/src/components/warden/explanation-drawer.tsx`)**:
   - Accessible Radix Sheet with human-friendly natural language summary sentence
   - Multi-objective score breakdown progress bars:
     - **P**: Academic & Policy Priority
     - **C**: Questionnaire Compatibility
     - **F**: Floor & Room Type Preference
     - **D**: Proximity / Distance to Department
     - **K**: Residential Continuity Bonus
   - Hard constraints audit checklist (HC1–HC11) with verified pass icons
   - Alternatives considered during matching loop and deterministic tiebreak log with PRNG seed

4. **Animated Spatial Bed Map (`apps/web/src/components/warden/bed-map.tsx`, `bed-chip.tsx`)**:
   - Floor selector with spatial room tiles and accessible grid semantics (`role="grid"`, `aria-label`)
   - Multi-cue bed chips: letter, status color, icon, and textural SVG patterns (assigned, free, waitlist promotion candidate, accessible, conflict)
   - Interactive hover lift and ripple click effects
   - Drag-and-drop reassignment using `@dnd-kit/core` with magnetic snapping
   - Live server target validation with red pulsing conflict warnings and reason tooltips
   - Accessible "Move to..." action menu as keyboard and screen-reader alternative
   - Dropping triggers the Override Modal with mandatory $\ge 10$-character reason field and Maker-Checker escalation warning

5. **Presence and Live Updates over SSE (`apps/web/src/components/warden/presence-bar.tsx`)**:
   - Live active reviewer presence bar showing reviewers and active floor badges
   - Real-time toast notifications when other reviewers apply bed overrides or update assignments

6. **Workflow Bar & Publish Wizard (`apps/web/src/components/warden/workflow-bar.tsx`, `publish-wizard-modal.tsx`)**:
   - State machine actions: `Submit for Approval`, `Request Changes` (with $\ge 10$-char note), `Approve`, and `Publish Draft`
   - Publish Wizard modal with pre-publish checklist:
     - All manual overrides have documented reasons
     - Zero hard constraint conflicts
     - All allotment letters queued in Mailpit
   - Summary diff highlighting changes since the previous version

7. **Accessibility (a11y) & WCAG Compliance**:
   - `role="grid"` with explicit row and column labels
   - Live change announcements via `aria-live="polite"`
   - Status never signaled by color alone (always paired with distinct icons and textural patterns)
   - Respects `prefers-reduced-motion` (disables hover lift, ripples, and pulses, falling back to clean outline highlights)

8. **Automated Testing Suite**:
   - Vitest component tests: Explanation Drawer and Override Modal (100% pass)
   - Playwright test J4: Full review workflow (Dashboard -> Console -> Bed override -> Approval -> Virtual Table -> Explanation Drawer)
   - Keyboard-only reassignment test: Complete workflow tested without mouse input
   - Axe-core accessibility test: 0 violations across Review Dashboard and Review Console screens
