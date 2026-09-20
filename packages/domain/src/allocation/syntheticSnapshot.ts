/**
 * @hostelhub/domain — allocation/syntheticSnapshot.ts
 *
 * In-memory synthetic dataset generator for benchmarks and large-scale testing.
 * Implements the exact distribution specified in Prompt 14 (8,000 applicants, 8,000 beds).
 *
 * Deterministic: uses a seeded PRNG, no I/O, no Date.now().
 */

import type { Hostel, Room, Bed, Unit, Snapshot, Gender, GenderPolicy, RoomType } from "./types.js";
import type { PriorityUnit } from "./pipeline.js";
import { makePCGState, pcg32Step } from "./prng.js";

export interface SyntheticDatasetOptions {
  applicants?: number;
  beds?: number;
  seed?: number;
}

export interface SyntheticDataset {
  snapshot: Snapshot;
  units: PriorityUnit[];
}

export function buildSyntheticDataset(options: SyntheticDatasetOptions = {}): SyntheticDataset {
  const applicantCount = options.applicants ?? 8000;
  const bedTargetCount = options.beds ?? 8000;
  const seedValue = options.seed ?? 42;

  let pcg = makePCGState(seedValue);
  const nextFloat = (): number => {
    const step = pcg32Step(pcg);
    pcg = step.next;
    return step.value / 4294967296;
  };

  // 1. Hostels
  const hostelConfigs: Array<{
    id: string;
    name: string;
    genderPolicy: GenderPolicy;
    walkingMinutes: number;
  }> = [
    { id: "h-ram", name: "Ramanujan Male Hostel A", genderPolicy: "male", walkingMinutes: 6 },
    { id: "h-bha", name: "Bhabha Male Hostel B", genderPolicy: "male", walkingMinutes: 8 },
    {
      id: "h-kc",
      name: "Kalpana Chawla Female Hostel A",
      genderPolicy: "female",
      walkingMinutes: 10,
    },
    { id: "h-gar", name: "Gargi Female Hostel B", genderPolicy: "female", walkingMinutes: 12 },
    {
      id: "h-vis",
      name: "Visvesvaraya International Hostel (Coed)",
      genderPolicy: "coed",
      walkingMinutes: 15,
    },
    {
      id: "h-ary",
      name: "Aryabhata Research Hostel (Coed)",
      genderPolicy: "coed",
      walkingMinutes: 18,
    },
  ];

  const hostels = new Map<string, Hostel>();
  for (const hc of hostelConfigs) {
    hostels.set(hc.id, {
      id: hc.id,
      name: hc.name,
      genderPolicy: hc.genderPolicy,
      walkingMinutes: hc.walkingMinutes,
    });
  }

  // 2. Rooms & Beds
  const rooms = new Map<string, Room>();
  const beds = new Map<string, Bed>();

  const quotaBuckets = ["General", "Merit", "Reserved", "International", "Sports"];
  const blocksInHostel = 3;
  const totalFloors = 10;
  const roomsPerFloor =
    Math.ceil(bedTargetCount / (hostelConfigs.length * blocksInHostel * totalFloors * 1.9)) + 5;

  let generatedBedCount = 0;
  let roomIdCounter = 1;
  let bedIdCounter = 1;

  for (let hIdx = 0; hIdx < hostelConfigs.length; hIdx++) {
    const hostel = hostelConfigs[hIdx]!;
    for (let bIdx = 0; bIdx < blocksInHostel; bIdx++) {
      const blockLetter = String.fromCharCode(65 + bIdx); // A, B, C

      for (let floor = 1; floor <= totalFloors; floor++) {
        for (let rIdx = 1; rIdx <= roomsPerFloor; rIdx++) {
          if (generatedBedCount >= bedTargetCount) break;

          const rRand = nextFloat();
          let roomType: RoomType = "double";
          let capacity = 2;

          if (rRand < 0.3) {
            roomType = "single";
            capacity = 1;
          } else if (rRand < 0.8) {
            roomType = "double";
            capacity = 2;
          } else {
            roomType = "triple";
            capacity = 3;
          }

          const isAccessible = nextFloat() < 0.05;
          const quotaRand = nextFloat();
          const quotaBucket =
            quotaRand < 0.6
              ? "General"
              : quotaBuckets[Math.floor(nextFloat() * quotaBuckets.length)]!;

          const roomId = `room-${roomIdCounter++}`;
          rooms.set(roomId, {
            id: roomId,
            hostelId: hostel.id,
            roomNumber: `${blockLetter}-${floor * 100 + rIdx}`,
            roomType,
            capacity,
            block: blockLetter,
            floor,
            accessible: isAccessible,
            quotaBucket,
            walkingMinutes: hostel.walkingMinutes,
          });

          for (let b = 1; b <= capacity; b++) {
            if (generatedBedCount >= bedTargetCount) break;
            const bedId = `bed-${bedIdCounter++}`;
            const isOos = nextFloat() < 0.03; // ~3% out of service

            const bedObj: Bed = {
              id: bedId,
              roomId,
              status: isOos ? "out_of_service" : "available",
              accessible: isAccessible,
            };
            if (isAccessible) {
              bedObj.accessibilityReservedUntil = "2030-01-01T00:00:00.000Z";
            }
            beds.set(bedId, bedObj);

            generatedBedCount++;
          }
        }
        if (generatedBedCount >= bedTargetCount) break;
      }
      if (generatedBedCount >= bedTargetCount) break;
    }
    if (generatedBedCount >= bedTargetCount) break;
  }

  // 3. Applicants & PriorityUnits
  const unitsMap = new Map<string, Unit>();
  const priorityUnits: PriorityUnit[] = [];

  const programmes = ["BTech", "MTech", "MBA", "PhD"];
  const feeCategories = ["General", "Reserved", "International", "Sponsored"];

  for (let i = 0; i < applicantCount; i++) {
    const unitId = `unit-${i + 1}`;
    const gender: Gender = i % 2 === 0 ? "male" : "female";
    const hasHold = nextFloat() < 0.02; // ~2% hold
    const accessibilityNeed = nextFloat() < 0.03; // ~3% accessibility

    // Priority tier
    let priorityTier = "03"; // regular
    let priorityScore = Math.floor(nextFloat() * 60) + 10;

    if (i < 5) {
      priorityTier = "01"; // Exact tie merit
      priorityScore = 100;
    } else if (accessibilityNeed) {
      priorityTier = "01";
      priorityScore = 95;
    } else if (nextFloat() < 0.15) {
      priorityTier = "02";
      priorityScore = Math.floor(nextFloat() * 30) + 70;
    }

    const matchingHostels = hostelConfigs
      .filter((h) => h.genderPolicy === gender || h.genderPolicy === "coed")
      .map((h) => h.id);

    const prefCount = Math.min(3, matchingHostels.length);
    const prefs = matchingHostels.slice(0, prefCount);

    const progIdx = Math.floor(nextFloat() * programmes.length);
    const feeIdx = Math.floor(nextFloat() * feeCategories.length);
    const qIdx = Math.floor(nextFloat() * quotaBuckets.length);

    const unit: Unit = {
      id: unitId,
      memberIds: [`student-${i + 1}`],
      gender,
      programme: programmes[progIdx]!,
      year: (i % 4) + 1,
      feeCategory: feeCategories[feeIdx]!,
      quotaBucket: quotaBuckets[qIdx]!,
      hasHold,
      accessibilityNeed,
      preferenceHostelIds: prefs,
      questionnaire: {
        sleep: { value: Math.floor(nextFloat() * 5) + 1, importance: 2 },
        study: { value: Math.floor(nextFloat() * 5) + 1, importance: 2 },
        tidiness: { value: Math.floor(nextFloat() * 5) + 1, importance: 2 },
        smoking: {
          value: nextFloat() < 0.85 ? "non_smoker" : "smoker",
          importance: 3,
          dealBreaker: nextFloat() < 0.3,
        },
      },
    };

    unitsMap.set(unitId, unit);
    priorityUnits.push({
      unit,
      priorityTier,
      priorityScore,
    });
  }

  const quotaBudget = new Map<string, number>([
    ["General", Math.floor(bedTargetCount * 0.5)],
    ["Merit", Math.floor(bedTargetCount * 0.2)],
    ["Reserved", Math.floor(bedTargetCount * 0.2)],
    ["International", Math.floor(bedTargetCount * 0.05)],
    ["Sports", Math.floor(bedTargetCount * 0.05)],
  ]);

  const quotaUsage = new Map<string, number>([
    ["General", 0],
    ["Merit", 0],
    ["Reserved", 0],
    ["International", 0],
    ["Sports", 0],
  ]);

  const snapshot: Snapshot = {
    cycleId: `cycle-synthetic-${seedValue}`,
    hostels,
    rooms,
    beds,
    units: unitsMap,
    assignments: new Map(),
    quotaBudget,
    quotaUsage,
    nowIso: "2026-09-01T00:00:00.000Z",
  };

  return { snapshot, units: priorityUnits };
}
