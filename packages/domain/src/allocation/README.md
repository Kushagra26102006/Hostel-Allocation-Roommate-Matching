# Allocation Engine — `packages/domain/src/allocation`

Pure TypeScript implementation of the hostel bed allocation pipeline.
No I/O, no `Date.now()`, no `Math.random()` — all randomness comes from a caller-supplied seed.

---

## Pipeline Diagram

```mermaid
flowchart TD
    A([allocate snapshot units options]) --> S1

    subgraph S1[Step 1: Freeze & Hash]
        H1[canonicalHash - SHA-256 over canonical sorted JSON]
    end

    S1 --> S2

    subgraph S2[Step 2: Eligibility Partition]
        E1{hasHold or rejected?}
        E1 -->|yes| REJ[rejected list]
        E1 -->|no| ELIG[eligible units]
    end

    S2 --> S3

    subgraph S3[Step 3: Priority Sort]
        P1[Sort by ID first, then tier ASC]
        P2[then priorityScore DESC]
        P3[then PRNG key - seed + unitId]
        P1 --> P2 --> P3
    end

    S3 --> S4

    subgraph S4[Step 4: Group Formation]
        G1[Singles & confirmed groups become units; groupId = min memberId]
    end

    S4 --> S5

    subgraph S5[Step 5: Assignment Loop]
        AL1[For each unit in order]
        AL2[buildBedIndex from shadow state]
        AL3[feasible candidate rooms]
        AL4[score each candidate bed]
        AL5{best candidate?}
        AL5 -->|yes| AL6[assign - update shadow]
        AL5 -->|no| AL7[waitlist with reason code]
        AL1 --> AL2 --> AL3 --> AL4 --> AL5
    end

    S5 --> S6

    subgraph S6[Step 6: Bounded Local Search]
        LS1[Sort assigned pairs by PRNG key]
        LS2[For adjacent pairs in same hostel+roomType+bucket]
        LS3{swap improves total AND\nhigh-priority score does not drop\nAND constraints hold?}
        LS3 -->|yes| LS4[commit swap]
        LS3 -->|no| LS5[keep original]
        LS2 --> LS3
        LS1 --> LS2
        LS4 --> LS2
        LS5 --> LS2
    end

    S6 --> S7

    subgraph S7[Step 7: Waitlist Order]
        W1[Sort by priority key per quota bucket]
    end

    S7 --> S8

    subgraph S8[Step 8: Invariant Check]
        I1[P1 - no unit in two beds]
        I2[P2 - no bed with two units]
        I3[P3 - capacity respected]
        I4[P4 - no hard constraint violated]
        I5[P5 - accessibility respected]
        I6[P6 - no deal-breaker pair together]
        I7[P7 - every assignment has explanation]
    end

    S8 --> S9

    subgraph S9[Step 9: Metrics]
        M1[firstChoiceRate\navgRankSatisfied\nginiPreferenceScore]
        M2[categoryParityGap\npriorityInversions\nmeanRoomCompatibility\nminRoomCompatibility]
        M1 --- M2
    end

    S9 --> OUT([AllocateResult])
    REJ --> OUT
    AL7 --> OUT
```

---

## Invariants

| Code | Description                                                          | Throws                      |
| ---- | -------------------------------------------------------------------- | --------------------------- |
| P1   | No unit assigned to more than one bed                                | `InvariantError("P1", ...)` |
| P2   | No bed occupied by more than one unit                                | `InvariantError("P2", ...)` |
| P3   | Room occupancy ≤ room capacity                                       | `InvariantError("P3", ...)` |
| P4   | No unit with active hold assigned; gender policy respected           | `InvariantError("P4", ...)` |
| P5   | Units with `accessibilityNeed = true` placed only in accessible beds | `InvariantError("P5", ...)` |
| P6   | No mutual deal-breaker pair placed in the same room                  | `InvariantError("P6", ...)` |
| P7   | Every `Assignment` object has a non-null `explanation`               | `InvariantError("P7", ...)` |

---

## Scoring Formula

```
S(u, r) = wP·P + wC·C + wF·F + wD·D + wK·K

P = preference rank satisfaction: 1 − (rank−1)/N   (0 if hostel not listed)
C = roommate compatibility (0..1), neutral 0.5 for empty rooms
F = fill factor: 0.0 opens new room, 0.5 joins partial, 1.0 completes room
D = proximity: max(0, 1 − walkingMinutes/30)
K = continuity: 1 if priorBlock == room.block, else 0

Default weights: wP=0.45, wC=0.30, wF=0.10, wD=0.10, wK=0.05
Result scaled to integer ×1,000,000 (no floating-point drift across machines)
```

---

## Hard Constraints (HC1–HC11)

| Code | Rule                                                                          |
| ---- | ----------------------------------------------------------------------------- |
| HC1  | One bed per unit (not already assigned)                                       |
| HC2  | One unit per bed (bed not occupied)                                           |
| HC3  | Bed status = available AND room capacity not exceeded                         |
| HC4  | Gender policy: unit.gender matches hostel.genderPolicy or "coed"              |
| HC5  | Quota bucket match; spill-over allowed when own bucket exhausted              |
| HC6  | Accessibility need → accessible bed; reservation window blocks non-need units |
| HC7  | Room programme filter (MTech-only etc.)                                       |
| HC8  | Room fee category requirement                                                 |
| HC9  | Hold active → unit blocked entirely                                           |
| HC10 | Group integrity: all members fit in same room                                 |
| HC11 | Mutual deal-breaker opt-in: questionnaire conflict blocks placement           |

---

## Metrics Glossary

| Metric                  | Description                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `firstChoiceRate`       | Fraction of assigned units that received hostel rank 1 (0..1)                        |
| `avgRankSatisfied`      | Mean rank position across assigned units (1 = first choice)                          |
| `giniPreferenceScore`   | Gini coefficient of total scores (0 = perfect equality)                              |
| `categoryParityGap`     | Max difference in firstChoiceRate across quota buckets                               |
| `priorityInversions`    | Count of lower-priority units with better rank than higher-priority ones (must be 0) |
| `meanRoomCompatibility` | Mean room compatibility score (0..1) across assigned rooms                           |
| `minRoomCompatibility`  | Minimum room compatibility score (0..1)                                              |

---

## Determinism Guarantee

Given identical `snapshot`, `units`, and `options.seed`:

1. The canonical hash is identical on every machine (SHA-256 over canonical sorted JSON, no locale-dependent ops).
2. The priority sort is stable: sorted by ID first, then tier + score → same PRNG key → same order.
3. Candidate scoring uses only the snapshot state — no clocks, no random.
4. Local search pair iteration order is seeded.

Changing `seed` only affects tiebreak resolution. The total number of assigned units
and which students end up on the waitlist is seed-independent (unless the scenario
has exact score ties that cross wait/assign boundaries).
