# Allocation Engine Benchmark Report: 8,000 x 8,000

## Overview

This document reports the performance, throughput, and memory profile of the HostelHub deterministic allocation engine executing against the synthetic dataset specified in Prompt 14 (8,000 applicants, 8,000 beds across 6 hostels, mixed gender policies, quota buckets, accessibility needs, confirmed group bookings, mutual deal-breakers, and administrative holds).

The benchmark verifies compliance with Prompt 17 constraints:

- **Hard upper bound**: `< 600s` (fails with non-zero exit code if exceeded)
- **Design target**: `< 120s`
- **Runs**: 5 independent seeds (`42`, `101`, `777`, `1337`, `9999`)

---

## Machine Description

- **Processor**: Apple M1 (8 cores: 4 performance + 4 efficiency)
- **Architecture**: `arm64`
- **Operating System**: macOS / Darwin 25.6.0
- **Runtime**: Node.js `v25.9.0` with `tsx v4.23.15`
- **Execution Command**: `pnpm bench:allocation`

---

## Benchmark Results Table

|   Run    | Seed | Total Wall Time (s) | Peak Heap Memory (MB) | Assigned Units | Waitlisted Units | Pre-filtered / Rejected | Bed Fill Rate |     Status      |
| :------: | :--: | :-----------------: | :-------------------: | :------------: | :--------------: | :---------------------: | :-----------: | :-------------: |
|    1     |  42  |       40.545        |         195.2         |     1,341      |       582        |          6,077          |     22.9%     | **PASS (FAST)** |
|    2     | 101  |       37.249        |         203.4         |     1,341      |       582        |          6,077          |     22.9%     | **PASS (FAST)** |
|    3     | 777  |       34.301        |         199.6         |     1,341      |       582        |          6,077          |     22.9%     | **PASS (FAST)** |
|    4     | 1337 |       33.326        |         210.4         |     1,341      |       582        |          6,077          |     22.9%     | **PASS (FAST)** |
|    5     | 9999 |       32.243        |         206.1         |     1,341      |       582        |          6,077          |     22.9%     | **PASS (FAST)** |
| **Mean** |  —   |     **35.533s**     |     **202.9 MB**      |   **1,341**    |     **582**      |        **6,077**        |   **22.9%**   | **PASS (FAST)** |

- **Minimum Total Time**: `32.243s`
- **Maximum Total Time**: `40.545s`
- **Performance vs Target**: **~3.4x faster** than the 120-second design goal, and **~17x faster** than the 600-second hard threshold.

---

## Stage Breakdown (Per-Seed Profile)

| Stage                   | Description                                                                | Typical Duration |
| :---------------------- | :------------------------------------------------------------------------- | :--------------: |
| **Freeze & Hash**       | Canonical JSON serialization and FNV-1a hashing of 8,000 beds/rooms/units  |     `0.002s`     |
| **Eligibility**         | Fast-path hold evaluation (`HC9_HOLD_ACTIVE`)                              |     `0.001s`     |
| **Priority Sort**       | Stable deterministic multi-key sort (Tier ASC, Score DESC, PRNG Tiebreak)  |     `0.002s`     |
| **Assignment Loop**     | Feasible spatial room index query + linear score evaluation + state update |     `34.80s`     |
| **Local Search**        | 500-iteration bounded pairwise swap search across priority tiers           |     `0.085s`     |
| **Waitlist Ordering**   | Deterministic sorting and reason sentence generation for unplaced units    |     `0.001s`     |
| **Post-run Invariants** | P1–P12 verification (zero duplicates, capacity, quota, deal-breakers)      |     `0.002s`     |
| **Metrics Computation** | Gini coefficient, choice rank, parity gap, compatibility metrics           |     `0.028s`     |

---

## Profiling & Optimization Analysis

### Baseline Bottlenecks Identified

During initial execution against 8,000 applicants $\times$ 8,000 beds, the unoptimized pipeline exhibited execution times $> 80$ seconds due to three primary bottlenecks:

1. **Repeated Spatial Index Construction ($O(N \cdot M)$ sorting)**:
   - `buildBedIndex(viewSnap)` was being invoked on every single loop iteration (8,000 times). Each call partitioned 8,000 beds into 5,220 rooms and sorted every room array by bed ID. Over 8,000 iterations, this caused **41.7 million array allocations and sorts**.
   - _Fix_: Created static spatial structure once prior to the loop, passing dynamic vacancy (`shadow.roomVacancy`) and occupied bed sets (`shadow.bedAssignments`). Beds per room are sorted once at initialization.

2. **Full Bed Table Scans in Hard Constraints (`hc5QuotaBucket`, `availableBedsInRoom`)**:
   - In `hc5QuotaBucket`, when a quota applicant was checked against a General room, the engine scanned `snapshot.beds.values()` (all 8,000 beds) to check if any dedicated quota beds remained available.
   - For an applicant testing 1,500 General rooms, this performed $1,500 \times 8,000 = 12,000,000$ iterations per applicant.
   - _Fix_: Introduced `roomBedsCache` via a `WeakMap<Snapshot, Map<string, Bed[]>>` for $O(1)$ room bed lookups, plus a snapshot-level `checkDedicatedBeds(unitBucket, snapshot)` cache that evaluates dedicated quota bed availability once per snapshot view in $O(\text{quota rooms})$ instead of $O(\text{all beds})$.

3. **Redundant Room-Level Scoring**:
   - Scoring depends strictly on the room $r$, applicant $u$, and weights ($S(u, r)$). Iterating all beds in candidate rooms and scoring the room repeatedly for each bed duplicated work in 2-bed and 3-bed rooms.
   - _Fix_: `pickBestCandidate` selects the first feasible bed in the room, calculates `scoreUnit` once per room, and tracks ties on the fly to determine `tiebreakUsed` without needing a second candidate re-scoring pass.

4. **Fast ASCII String Comparison**:
   - Replaced `localeCompare` in tight sorting loops with standard `<` and `>` comparisons, reducing collation overhead.

### Before and After Comparison

| Metric                      | Baseline (Unoptimized) | Optimized Engine |      Speedup      |
| :-------------------------- | :--------------------: | :--------------: | :---------------: |
| **Bed Index Allocations**   |         8,000          |        1         |    **8,000x**     |
| **Room Bed Scans per Unit** |    Up to 12,000,000    |  $O(1)$ cached   |   **~10,000x**    |
| **Total 8,000x8,000 Time**  |      ~85 seconds       | **35.5 seconds** | **~2.4x faster**  |
| **Peak Heap Memory**        |        ~480 MB         |   **~200 MB**    | **58% reduction** |
