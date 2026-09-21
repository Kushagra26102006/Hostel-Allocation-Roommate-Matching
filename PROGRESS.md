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

---

## Milestone 7 — Waiting List & Automatic Promotion (Prompt 21) ✅

**Date:** 2026-09-21  
**Status:** Complete  
**Commit target:** `feat(waitlist): promotion engine and reconciliation`

### What was done

1. **Pure Domain Promotion Engine (`packages/domain/src/waitlist/`)**:
   - `findPromotionCandidate(ctx)`: Evaluates waitlisted units in priority order and quota bucket. Revalidates every hard constraint (`HC1`–`HC11`), accessibility requirements (`HC6`), cohort rules (`HC7`), deal-breaker pairings (`HC11`), and group integrity (`HC10` - groups only promoted if all members fit). Unfit units are skipped with recorded reason codes.
   - `reorderWaitlistQueue`: Algorithmic reordering of waitlist units with mandatory reason ($\ge 10$ characters) validation and recalculation of positions.
   - `reconcileOccupancy`: Independent recount comparing raw active student assignments against room and hostel capacities, verifying the 0-drift invariant.
   - 100-cycle randomized simulation test comparing room counters against active assignments with 100% exact match invariant.

2. **Database Models & Service (`packages/db/src/`)**:
   - `PromotionProposalModel`: Stores proposals requiring warden confirmation (`draft_id`, `cycle_id`, `waitlist_entry_id`, `bed_id`, `trigger`, `status`, `warden_comment`, `resolved_by`, `resolved_at`).
   - `WaitlistEntryModel`: Updated schema with `status`, `priority_score`, `waiting_reason_code`, and `reorder_history`.
   - `AllocationCycleModel`: Added `promotion_policy` (`auto_confirm` vs `proposal_required`).
   - `PromotionService`:
     - `handleVacatedBed(draftId, bedId, trigger, actor, options)`
     - `promoteVacatedBed(draftId, bedId, trigger, actor, policyOverride)`
     - `confirmProposal(proposalId, actor, comment)`
     - `rejectProposal(proposalId, actor, reason)`
     - `manualPromote(draftId, waitlistEntryId, bedId, reason, actor)`
     - `reorderWaitlist(draftId, waitlistEntryId, newPosition, reason, actor)`
     - `reconcileHostelOccupancy(hostelId, draftId)`
     - **Post-Publication Safety**: When promoting into a published draft, `DraftWorkflowService.amendDraft` creates a new amended draft version (`v + 1`) under system actor, updates occupancy, triggers notification hooks, and appends to the audit hash chain.
   - Full integration test suite in `packages/db/src/__tests__/waitlist-workflow.test.ts` (6/6 passing).

3. **Web API Endpoints (`apps/web/src/app/api/v1/waitlist/`)**:
   - `GET /api/v1/waitlist`: List waitlist entries with student info, position badges, reason codes.
   - `POST /api/v1/waitlist/[id]/promote`: Manual promotion with mandatory $\ge 10$ char reason.
   - `POST /api/v1/waitlist/reorder`: Reordering with mandatory $\ge 10$ char reason.
   - `GET /api/v1/waitlist/proposals`: List pending proposals.
   - `POST /api/v1/waitlist/proposals/[id]/confirm`: Warden confirms proposal.
   - `POST /api/v1/waitlist/proposals/[id]/reject`: Warden rejects proposal.
   - `POST /api/v1/waitlist/vacate`: Trigger vacancy from withdrawal, no-show, override, appeal.
   - `GET /api/v1/waitlist/reconcile`: Independent occupancy recount report.

4. **Warden Waiting List UI (`apps/web/src/components/warden/waitlist/` & `apps/web/src/app/(staff)/staff/warden/waitlist/page.tsx`)**:
   - `WaitlistTable` with `framer-motion` reorder animations, tier position badges (#1, #2, #3, >3), and "Why is this student waiting?" reason code badges with explanatory tooltips.
   - `ReorderModal` with live $\ge 10$ char count validation.
   - `ManualPromoteModal` with target bed selection and mandatory justification.
   - `ProposalsBanner` displaying pending proposals for warden confirmation/rejection.
   - `PromotionTimeline` visual audit trail of recent automated and manual promotions.
   - `ReconcileModal` displaying capacity vs active recount with 0-drift verification.
   - `VacateBedModal` to simulate vacancy triggers live.

---

## Milestone 10 & 11 — Room Changes, Atomic Swaps & Appeals (Prompt 24) ✅

**Date:** 2026-09-21  
**Status:** Complete  
**Commit target:** `feat(changes): room change requests and appeals`

### What was done

1. **Pure Domain (`packages/domain/src/changes/`)**:
   - `validateRoomChange`: Strict revalidation of all hard constraints (`HC3`–`HC11`), including capacity, gender policy, accessibility requirements, quota buckets, programme cohorts, fee tiers, and roommate deal-breaker conflicts.
   - `validateSwap`: Bidirectional validation of unit exchanges across rooms and hostels. One side failing cancels the entire transaction atomically.
   - `calculateSlaDueDate`, `isSlaBreach`, `getWorkingDaysRemaining`: Pure SLA calculation engine skipping weekends and configurable holidays.
   - 21 Vitest domain tests in `packages/domain/src/__tests__/changes/changes-domain.test.ts` (100% pass).

2. **Database Layer (`packages/db/src/`)**:
   - Models:
     - `RoomChangeRequestModel`: Assignment ID, reason, evidence keys, target bed, status, warden decision with reason, constraint audit flags.
     - `SwapRequestModel`: Bidirectional participant tracking, acceptance flags, validation outcomes, cancellation reasons.
     - `AppealModel`: Statement, evidence, SLA due date, escalation timestamps, dual-tier decision records (warden and chief warden).
   - Services:
     - `RoomChangeService`: Lifecycle management, student isolation, constraint revalidation on approval, tamper-evident hash chain audit logging.
     - `SwapService`: Proposal, acceptance, atomic completion/rollback, cancellation.
     - `AppealService`: Submission, SLA deadline tracking, multi-tier routing (`warden_review` -> `chief_warden_review`), and scheduled auto-escalation.
   - 20 DB workflow integration tests in `packages/db/src/__tests__/` (100% pass).

3. **Background Worker (`apps/worker/src/`)**:
   - `appeal-escalation-processor.ts`: Hourly BullMQ repeatable job for SLA breach escalation, notifying both roles and logging audit events.

4. **Web API (`apps/web/src/app/api/v1/`)**:
   - Authenticated, tenant-scoped REST endpoints with Auth.js v5:
     - `/api/v1/room-changes`: POST (submit request) & GET (list)
     - `/api/v1/room-changes/[id]`: GET (detail)
     - `/api/v1/room-changes/[id]/decide`: POST (warden approve/reject)
     - `/api/v1/swaps`: POST (propose) & GET (list)
     - `/api/v1/swaps/[id]/accept`: POST (counterpart accepts, atomic execute)
     - `/api/v1/swaps/[id]/cancel`: POST (cancellation)
     - `/api/v1/appeals`: POST (submit appeal) & GET (list)
     - `/api/v1/appeals/[id]`: GET (detail with stored explanation & SLA info)
     - `/api/v1/appeals/[id]/decide`: POST (multi-tier review decision)
   - 8 Vitest API route tests in `apps/web/src/__tests__/room-changes-api.test.ts` (100% pass).

5. **UI Components & Dashboard Pages (`apps/web/src/`)**:
   - `Timeline`, `StatusChip`, `SlaBadge` (`apps/web/src/components/changes/timeline.tsx`) with dark-mode zinc aesthetics and Framer Motion step animations.
   - Student room changes page (`/room/changes`) with request status tracker and submission modal.
   - Student room swap page (`/room/swap`) with counterpart selection and accept/cancel controls.
   - Student appeals page (`/room/appeal`) with SLA countdown, stored allocation explanation, and status tracking.
   - Warden decision panels for room changes (`/staff/warden/room-changes`) and appeals (`/staff/warden/appeals`) with SLA urgency sorting and decision modals requiring written reasons.

---

## Milestone 13 — Reports, Analytics & Fairness Dashboard (Prompt 25) ✅

**Date:** 2026-09-21  
**Status:** Complete  
**Commit target:** `feat(reports): analytics and fairness dashboard`

### What was done

1. **Pure Domain (`packages/domain/src/reports/`)**:
   - `privacy-suppression.ts`: Strict differential privacy masking threshold ($1 \le N < 5$ masked as `"< 5"`, `count: null`, `is_suppressed: true`), ensuring small groups cannot be deanonymized in any breakdown.
   - `fairness-calculator.ts`: Pure mathematical formulas for:
     - Gini coefficient of preference satisfaction scores ($O(n \log n)$).
     - Category parity gap between quota buckets.
     - Priority inversion detector asserting invariant $0$ inversions.
     - Roommate compatibility statistics (mean and minimum).
   - 16 Vitest domain unit tests across `fairness.test.ts` and `suppression.test.ts` (100% pass).

2. **Database Layer & Aggregation (`packages/db/src/`)**:
   - `ReportReadModelModel`: Pre-aggregated read model schema indexed by `(institution_id, cycle_id, report_type)` for $< 3$s sub-second dashboard queries.
   - `ReportService`: Complete implementation of all 8 required reports:
     - Occupancy by hostel, block, and room type with 3-level drilldown.
     - Preference satisfaction (1st choice rate, average satisfied rank).
     - Override analysis (by warden, category, reason).
     - Waitlist movement (waitlisted, promoted, median wait time).
     - Cycle time (apply to publish, stage-by-stage durations).
     - Accessibility compliance (candidate vs accommodated, 0 violations).
     - Year-on-year comparative delta.
     - Fairness report per run with quota breakdowns, Gini, parity gap, zero inversions, compatibility metrics.
   - Multi-format report export engine: Synchronous and background-ready streaming for CSV, XLSX (via ExcelJS), and self-contained executive vector PDF.
   - 10 integration tests in `packages/db/src/__tests__/reports-reconciliation.test.ts` reconciling counts with raw synthetic database entities.

3. **Background Worker & Scheduled Digest (`apps/worker/src/`)**:
   - `report-processor.ts`:
     - BullMQ worker for long-running asynchronous report generation jobs with completion in-app notification.
     - Weekly scheduled executive PDF digest generator for Dean and Chief Warden (cron: `0 8 * * 1`), dispatching executive reports directly to notification queues.

4. **Web API & Policy Layer (`apps/web/src/`)**:
   - `policy.ts`: Strict read-only enforcement for Dean role (`isReadOnlyRole`, `assertNotReadOnly`), preventing write mutations across all staff endpoints.
   - Endpoints:
     - `/api/v1/reports/[type]`: Pre-aggregated read model retrieval with privacy suppression.
     - `/api/v1/reports/[type]/export`: Direct download or async BullMQ background job queueing.
     - `/api/v1/reports/refresh`: Read model re-computation endpoint (strictly 403 Forbidden for Dean).
   - 7 policy unit tests in `apps/web/src/__tests__/dean-read-only.test.ts` verifying that Dean is strictly read-only.

5. **Bento UI & Accessibility (`apps/web/src/`)**:
   - `BentoDashboard` (`apps/web/src/components/reports/dashboard-bento.tsx`):
     - Interactive Bento grid using Recharts with smooth data transitions.
     - KPI top ribbon (occupancy, 1st choice rate, Gini, inversions certified 0, cycle time).
     - Interactive Occupancy Heat Map with 3-tier drilldown (Hostels $\to$ Blocks $\to$ Rooms) and live capacity badges.
     - Quota fairness breakdown chart, preference satisfaction distribution, and YoY comparison toggle.
     - Search filter state persistence in URL search parameters (`?hostel=...&yoy=...`).
     - Reduced motion support disabling entrance animations for accessibility (`useReducedMotion`).
     - Screen reader accessible data table alternatives on every chart with toggleable view.
   - `/staff/reports`: Staff portal route pre-fetching read models and rendering the executive Bento dashboard.
   - Navigation updated with dedicated "Reports & Fairness" destination across all staff roles.
