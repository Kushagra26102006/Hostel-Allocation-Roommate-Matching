# Allocation Engine Specification

This document defines the mathematical specification, constraint catalog, multi-criteria scoring formulation, deterministic tie-breaking rules, and fairness metric indicators of the HostelHub allocation engine.

---

## 1. Engine Pipeline Stages

The allocation engine processes institutional snapshots through 8 sequential, deterministic stages:

```
1. Freeze & Snapshot Hash (SHA-256 canonical sort)
       ↓
2. Hard Eligibility Filter (HC1 – HC12)
       ↓
3. Cohort & Priority Tier Sorting (Deterministic PRNG tie-break)
       ↓
4. Gale-Shapley Stable Matching Loop
       ↓
5. Roommate Compatibility & Deal-Breaker Optimization
       ↓
6. Local Search Pairwise Swaps (Bounded 500-iteration hill climbing)
       ↓
7. Dynamic Waitlist Queue Construction
       ↓
8. Structural Invariant Checks (P1 – P7) & Fairness Metrics Calculation
```

---

## 2. Constraint Catalog

### A. Hard Constraints (Mandatory Invariants)

Hard constraints are absolute rules that cannot be violated under any circumstances:

| Code     | Name                           | Rule Formulation                                                                                                          | Rejection Action                         |
| :------- | :----------------------------- | :------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------- |
| **HC1**  | Cohort Eligibility             | Applicant must be actively enrolled in an eligible academic degree programme and semester.                                | Immediate application rejection          |
| **HC2**  | Single Bed Placement           | $\sum_{j} X_{ij} \le 1 \quad \forall i \in \text{Applicants}$                                                             | Constraint solver assertion failure      |
| **HC3**  | Bed Availability               | Bed must not be marked occupied, under maintenance, or administrative hold.                                               | Bed excluded from feasible set           |
| **HC4**  | Gender & Block Policy          | Bed hostel block gender policy must strictly match applicant cohort gender policy.                                        | Assignment forbidden                     |
| **HC5**  | Quota Seat Guarantees          | Quota capacities ($SC, ST, OBC, EWS, PWD$) reserved prior to general merit placement.                                     | Reserved beds unassigned to general pool |
| **HC6**  | Accessibility Priority         | Students with certified physical mobility needs placed on Ground Floor or elevator-served beds.                           | Priority allocation override             |
| **HC11** | Mutual Deal-Breaker Protection | If Resident A and Resident B have a mutual deal-breaker conflict (e.g. smoking, sleep noise), they cannot share room $R$. | Room assignment disallowed               |

### B. Soft Constraints (Optimization Objectives)

Soft constraints contribute positively or negatively to the objective function:

- **SC1 (Hostel Preference Rank):** Maximize placement into student's top-ranked hostel choice.
- **SC2 (Roommate Compatibility):** Maximize interpersonal harmony score across sleep, study, tidiness, and noise dimensions.
- **SC3 (Floor Level Match):** Match preferences for low, mid, or high floor levels.
- **SC4 (Air Conditioning Preference):** Match AC vs Non-AC preferences where available.
- **SC5 (Hometown Distance Priority):** Prioritize students travelling from greater geographical distances (> 250 km).

---

## 3. Multi-Criteria Composite Scoring Formula

For applicant $i$ and room/bed $j$:

$$S(i, j) = w_p \cdot P_{ij} + w_c \cdot C_{ij} + w_f \cdot F_{ij} + w_d \cdot D_{ij} + w_k \cdot K_{ij}$$

Where:

- $P_{ij} \in [0, 100]$: Preference ranking score ($100$ for 1st choice, $75$ for 2nd, $50$ for 3rd, $25$ for 4th).
- $C_{ij} \in [0, 100]$: Roommate compatibility score calculated via Cosine Similarity / Manhattan distance across 7 behavioral survey dimensions.
- $F_{ij} \in [0, 100]$: Floor and room type amenity alignment score.
- $D_{ij} \in [0, 100]$: Distance cutoff bonus ($D_{ij} = \min(100, \frac{\text{Distance in km}}{500} \times 100)$).
- $K_{ij} \in [0, 100]$: Normalised academic merit percentile score.

Default weight profile:
$$w_p = 0.35, \quad w_c = 0.25, \quad w_f = 0.15, \quad w_d = 0.15, \quad w_k = 0.10$$
Institutional administrators can adjust weights per cycle via the Policy Rule Builder.

---

## 4. Deterministic Tie-Breaking Rules

When two or more applicants have identical composite scores for a contested bed, ties are resolved deterministically without human intervention:

1. **Deterministic PRNG Seed:** A pseudo-random generator seeded with the cycle's fixed seed (default `42`).
2. **Deterministic Sort Key:**
   $$\text{HashKey}(i) = \text{SHA256}(\text{Seed} \mathbin{\Vert} \text{CycleID} \mathbin{\Vert} \text{StudentRollNo}_i)$$
3. Sorting applicants by $\text{HashKey}$ guarantees that:
   - No bias towards alphabetical order, timestamp of application, or internal database ObjectId.
   - 100% reproducible results across any machine, operating system, or execution time.

---

## 5. Fairness Metrics & Verification

Following every allocation run, the engine computes an empirical fairness evaluation:

1. **Gini Coefficient ($G$):** Evaluates inequality of preference satisfaction across the student body:
   $$G = \frac{\sum_{i=1}^n \sum_{j=1}^n |S_i - S_j|}{2n \sum_{i=1}^n S_i}$$
   Target: $G \le 0.18$.
2. **Quota Parity Gap:** Difference between targeted statutory reservation percentages and actual provisional allocations. Must be $0.0\%$.
3. **Pareto Optimality:** No student can be moved to a higher-ranked bed without reducing another student's preference rank. Verified via the bounded local search phase.
4. **Envy-Freeness:** Verified through plain-language explanations produced for each student assignment, detailing why any alternative preferred bed was allotted to a higher-priority candidate.
