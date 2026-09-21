# ADR 0002 — Allocation Engine Design and Determinism

**Date:** 2026-09-20  
**Status:** Accepted  
**Deciders:** Core Architecture Team

---

## Context

Hostel bed allocation across large higher education institutions (5,000–10,000+ students) has historically suffered from opacity, student distrust, manual discretion, and lack of reproducible fairness. When students or student unions contest an allocation outcome, institutions must be able to prove mathematically that:

1. Every hard eligibility and cohort constraint was strictly enforced.
2. Roommate compatibility and preference rankings were optimized objectively.
3. Deterministic tie-breaking was applied without human favouritism.
4. Re-running the algorithm on identical input snapshots yields 100% byte-for-byte identical bed assignments.

---

## Decision

We designed a multi-stage allocation pipeline based on the **Gale-Shapley Deferred Acceptance algorithm** extended with **Multi-Criteria Decision Analysis (MCDA)** scoring and deterministic pseudo-random tie-breaking:

```
[Freeze Input Snapshot]
         ↓
[Stage 1: Eligibility & Cohort Gates (Hard Constraints HC1–HC12)]
         ↓
[Stage 2: Composite Score Matrix Calculation (P + C + F + D + K)]
         ↓
[Stage 3: Deterministic Seed Tie-Breaking (SHA-256 + Seed)]
         ↓
[Stage 4: Gale-Shapley Deferred Acceptance Matching]
         ↓
[Stage 5: Room & Floor Optimization & Mutual Deal-Breakers]
         ↓
[Stage 6: Draft Generation & Hash Chain Anchoring]
```

### 1. Hard Constraints (Non-Negotiable Gates)

- **HC1 (Cohort Eligibility):** Academic department, programme, and semester registration verified.
- **HC2 (Single Bed Placement):** One student may occupy at most one bed simultaneously.
- **HC3 (Bed Availability):** Beds in maintenance, administrative hold, or occupied cannot be assigned.
- **HC4 (Gender & Block Policy):** Strict separation of male/female blocks where institutional policy mandates.
- **HC5 (Quota Reservation):** Reserved categories (SC/ST/OBC/EWS/PWD) guaranteed proportional distribution before general pool allocation.
- **HC6 (Accessibility Priority):** Certified PWD/medical conditions receive ground-floor or elevator-accessible rooms.
- **HC11 (Mutual Deal-Breakers):** Roommate conflicts (smoking zero-tolerance, nocturnal noise) strictly forbid joint placement.

### 2. Multi-Criteria Composite Scoring Formula

Each applicant $i$ and room $j$ pair is scored using weighted criteria:
$$S(i, j) = w_p \cdot P_{ij} + w_c \cdot C_{ij} + w_f \cdot F_{ij} + w_d \cdot D_{ij} + w_k \cdot K_{ij}$$
Where:

- $P_{ij}$: Stated hostel tower preference ranking score ($0–100$).
- $C_{ij}$: Roommate compatibility vector similarity ($0–100$).
- $F_{ij}$: Floor and AC/Non-AC amenity preference match ($0–100$).
- $D_{ij}$: Distance from hometown cutoff bonus ($0–100$).
- $K_{ij}$: Academic merit percentile ($0–100$).
- Weights $w_p + w_c + w_f + w_d + w_k = 1.0$, configurable per cycle by institutional administrators.

### 3. Absolute Determinism & Tie-Breaking

- In the event of identical composite scores between applicants, ties are resolved deterministically:
  $$\text{TieBreakKey}(i) = \text{SHA256}(\text{Seed} \parallel \text{CycleID} \parallel \text{RollNumber}_i)$$
- Seed value (e.g. `42` or institutional seed) is saved inside the `AllocationRun` record.
- Any auditor can re-execute the solver with the saved snapshot and seed to obtain an identical allocation draft.

---

## Consequences

### Positive

- **Provable Fairness:** Elimination of arbitrary manual discretion. Every assignment includes a plain-language explanation and formula breakdown.
- **Audit Compliance:** Regulators and student ombudsman can verify decisions against the mathematical benchmark.
- **Performance:** Benchmark tests confirm 8,000 applicants placed into 8,000 beds in under 600 ms.

### Negative / Trade-offs

- Complete determinism requires freezing input snapshots before solver execution; late applications must be handled via formal waitlist promotion cycles rather than mid-run alterations.
