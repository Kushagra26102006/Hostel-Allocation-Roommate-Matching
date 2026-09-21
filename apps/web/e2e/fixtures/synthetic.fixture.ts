/**
 * Deterministic synthetic test fixture with fixed seed 42.
 * Provides reset helpers and standardized mock structures matching the synthetic generator.
 */

export const SYNTHETIC_SEED = 42;
export const SYNTHETIC_INSTITUTION_ID = "66f000000000000000000000";
export const SYNTHETIC_CYCLE_ID = "cycle-syn-42";
export const SYNTHETIC_DRAFT_ID = "66f000000000000000000001";

export interface SyntheticDataset {
  institutionId: string;
  cycleId: string;
  draftId: string;
  students: Array<{
    id: string;
    name: string;
    email: string;
    rollNumber: string;
    gender: "male" | "female";
    programme: string;
    year: number;
    quota: string;
    accessibilityNeed: boolean;
  }>;
  hostels: Array<{
    id: string;
    name: string;
    gender: string;
    capacity: number;
    floors: number;
  }>;
  beds: Array<{
    id: string;
    hostelId: string;
    roomNumber: string;
    bedNo: string;
    floor: number;
    status: "free" | "assigned" | "held" | "maintenance";
    accessible: boolean;
  }>;
}

/**
 * Returns a deterministic synthetic dataset seeded with SEED 42.
 */
export function getSyntheticDataset(seed = SYNTHETIC_SEED): SyntheticDataset {
  return {
    institutionId: SYNTHETIC_INSTITUTION_ID,
    cycleId: `${SYNTHETIC_CYCLE_ID}-${seed}`,
    draftId: SYNTHETIC_DRAFT_ID,
    students: [
      {
        id: "syn-stud-001",
        name: "Aarav Sharma",
        email: "aarav.sharma@synthetic42.edu",
        rollNumber: "CS2026-001",
        gender: "male",
        programme: "BTech CS",
        year: 2,
        quota: "General",
        accessibilityNeed: false,
      },
      {
        id: "syn-stud-002",
        name: "Kabir Mehta",
        email: "kabir.mehta@synthetic42.edu",
        rollNumber: "CS2026-002",
        gender: "male",
        programme: "BTech CS",
        year: 2,
        quota: "General",
        accessibilityNeed: false,
      },
      {
        id: "syn-stud-003",
        name: "Vikram Malhotra",
        email: "vikram.malhotra@synthetic42.edu",
        rollNumber: "ME2026-003",
        gender: "male",
        programme: "BTech ME",
        year: 2,
        quota: "General",
        accessibilityNeed: true,
      },
      {
        id: "syn-stud-004",
        name: "Rohan Patel",
        email: "rohan.patel@synthetic42.edu",
        rollNumber: "EE2026-004",
        gender: "male",
        programme: "BTech EE",
        year: 2,
        quota: "OBC",
        accessibilityNeed: false,
      },
    ],
    hostels: [
      {
        id: "hostel-tagore",
        name: "Rabindranath Tagore Hostel",
        gender: "boys",
        capacity: 120,
        floors: 3,
      },
      {
        id: "hostel-kalam",
        name: "APJ Abdul Kalam Hostel",
        gender: "boys",
        capacity: 80,
        floors: 2,
      },
      {
        id: "hostel-sarojini",
        name: "Sarojini Naidu Girls Hostel",
        gender: "girls",
        capacity: 100,
        floors: 3,
      },
    ],
    beds: [
      {
        id: "bed-tag-101a",
        hostelId: "hostel-tagore",
        roomNumber: "101",
        bedNo: "A",
        floor: 1,
        status: "assigned",
        accessible: false,
      },
      {
        id: "bed-tag-101b",
        hostelId: "hostel-tagore",
        roomNumber: "101",
        bedNo: "B",
        floor: 1,
        status: "free",
        accessible: false,
      },
      {
        id: "bed-tag-102a",
        hostelId: "hostel-tagore",
        roomNumber: "102",
        bedNo: "A",
        floor: 1,
        status: "free",
        accessible: true,
      },
      {
        id: "bed-tag-102b",
        hostelId: "hostel-tagore",
        roomNumber: "102",
        bedNo: "B",
        floor: 1,
        status: "free",
        accessible: true,
      },
    ],
  };
}

/**
 * Resets database synthetic data state between test suites if live DB is connected.
 */
export async function resetSyntheticData(seed = SYNTHETIC_SEED): Promise<void> {
  try {
    const { connectDb } = await import("@hostelhub/db");
    const { generateSyntheticData } = await import("@hostelhub/db");
    await connectDb();
    await generateSyntheticData({
      seed,
      applicants: 10,
      beds: 10,
      reset: true,
    });
  } catch {
    // If DB is unreachable or in mock mode, no-op silently
  }
}
