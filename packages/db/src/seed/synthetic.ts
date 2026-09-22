import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Types } from "mongoose";
import { Faker, en } from "@faker-js/faker";

// Auto-load root .env if environment variables are not pre-set in shell
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
for (const candidate of [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(__dirname, "../../../../.env"),
  path.resolve(__dirname, "../../../.env"),
  path.resolve(__dirname, "../../.env"),
]) {
  if (fs.existsSync(candidate)) {
    const lines = fs.readFileSync(candidate, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq !== -1) {
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    }
    break;
  }
}
import { connectDb } from "../connection.js";
import { InstitutionModel } from "../models/institution.model.js";
import { UserModel } from "../models/user.model.js";
import { HostelModel, type GenderPolicy } from "../models/hostel.model.js";
import { BlockModel } from "../models/block.model.js";
import { RoomModel, type RoomType } from "../models/room.model.js";
import { BedModel } from "../models/bed.model.js";
import { AllocationCycleModel } from "../models/allocation-cycle.model.js";
import { ApplicationModel } from "../models/application.model.js";
import { PreferenceModel } from "../models/preference.model.js";
import { GroupModel } from "../models/group.model.js";
import { CompatibilityResponseModel } from "../models/compatibility-response.model.js";
import { ConsentRecordModel } from "../models/consent-record.model.js";
import { encryptPayload } from "@hostelhub/shared";
import type { QuestionnaireAnswers } from "@hostelhub/domain";

export interface SyntheticSeedOptions {
  applicants?: number;
  beds?: number;
  seed?: number;
  reset?: boolean;
  uri?: string;
  silent?: boolean;
}

export interface SyntheticSeedSummary {
  seed: number;
  executionTimeSeconds: number;
  dataHash: string;
  counts: {
    institution: number;
    hostels: number;
    blocks: number;
    rooms: number;
    beds: number;
    accessibleBeds: number;
    outOfServiceBeds: number;
    applicants: number;
    applications: number;
    groups: number;
    questionnairesEncrypted: number;
  };
  edgeCases: {
    exactPriorityTiesCount: number;
    oversizedGroupSize: number;
    unmetAccessibilityApplicantId: string;
    dealBreakerPairCount: number;
  };
}

export async function generateSyntheticData(
  options: SyntheticSeedOptions = {},
): Promise<SyntheticSeedSummary> {
  const startTime = Date.now();
  const applicantCount = options.applicants ?? 8000;
  const bedTargetCount = options.beds ?? 8000;
  const seedValue = options.seed ?? 42;
  const silent = options.silent ?? false;

  const log = (...args: unknown[]) => {
    if (!silent) console.log(...args);
  };

  // 1. Initialize Faker with deterministic seed
  const faker = new Faker({ locale: [en] });
  faker.seed(seedValue);

  // Helper for deterministic ObjectId generation based on seed and index
  const makeObjectId = (prefix: string, index: number): Types.ObjectId => {
    const raw = crypto
      .createHash("sha256")
      .update(`synthetic-${seedValue}-${prefix}-${index}`)
      .digest("hex")
      .substring(0, 24);
    return new Types.ObjectId(raw);
  };

  await connectDb(options.uri);

  log(`🌱 Starting deterministic synthetic data generation (Seed: ${seedValue})...`);

  // 2. Synthetic Institution Setup
  const instCode = `NIT-SYNTHETIC-${seedValue}`;
  const instId = makeObjectId("institution", 0);

  // Always clear existing data for this synthetic institution to ensure idempotency
  log(`🧹 Clearing synthetic data for institution ${instCode}...`);
  await Promise.all([
    HostelModel.deleteMany({ institution_id: instId }),
    BlockModel.deleteMany({ institution_id: instId }),
    RoomModel.deleteMany({ institution_id: instId }),
    BedModel.deleteMany({ institution_id: instId }),
    UserModel.deleteMany({ institution_id: instId }),
    AllocationCycleModel.deleteMany({ institution_id: instId }),
    ApplicationModel.deleteMany({ institution_id: instId }),
    PreferenceModel.deleteMany({ institution_id: instId }),
    GroupModel.deleteMany({ institution_id: instId }),
    CompatibilityResponseModel.deleteMany({ institution_id: instId }),
    ConsentRecordModel.deleteMany({ institution_id: instId }),
  ]);

  await InstitutionModel.findOneAndUpdate(
    { code: instCode },
    {
      $set: {
        name: `Synthetic National Institute (${seedValue})`,
        code: instCode,
        status: "active",
        domain: `synthetic${seedValue}.edu`,
        settings: { timezone: "Asia/Kolkata", currency: "INR" },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // 3. Generate Inventory (Hostels, Blocks, Rooms, Beds)
  const hostelConfigs: Array<{ name: string; gender_policy: GenderPolicy }> = [
    { name: "Ramanujan Male Hostel A", gender_policy: "male" },
    { name: "Bhabha Male Hostel B", gender_policy: "male" },
    { name: "Kalpana Chawla Female Hostel A", gender_policy: "female" },
    { name: "Gargi Female Hostel B", gender_policy: "female" },
    { name: "Visvesvaraya International Hostel (Coed)", gender_policy: "coed" },
    { name: "Aryabhata Research Hostel (Coed)", gender_policy: "coed" },
  ];

  const hostelDocs: Record<string, unknown>[] = [];
  const blockDocs: Record<string, unknown>[] = [];
  const roomDocs: Record<string, unknown>[] = [];
  const bedDocs: Record<string, unknown>[] = [];

  let generatedBedCount = 0;
  let accessibleBedsCount = 0;
  let outOfServiceBedsCount = 0;

  for (let hIdx = 0; hIdx < hostelConfigs.length; hIdx++) {
    const config = hostelConfigs[hIdx]!;
    const hId = makeObjectId("hostel", hIdx);
    hostelDocs.push({
      _id: hId,
      institution_id: instId,
      name: config.name,
      gender_policy: config.gender_policy,
      address: `Campus Sector ${hIdx + 1}, Synthetic University`,
      status: "active",
    });

    const blocksInHostel = 3;
    const totalFloors = 10;
    const roomsPerFloor =
      Math.ceil(bedTargetCount / (hostelConfigs.length * blocksInHostel * totalFloors * 1.9)) + 5;

    for (let bIdx = 0; bIdx < blocksInHostel; bIdx++) {
      const bId = makeObjectId(`block-${hIdx}`, bIdx);
      const blockLetter = String.fromCharCode(65 + bIdx); // A, B, C
      blockDocs.push({
        _id: bId,
        institution_id: instId,
        hostel_id: hId,
        name: `Block ${blockLetter}`,
        total_floors: totalFloors,
        status: "active",
      });

      for (let floor = 1; floor <= totalFloors; floor++) {
        for (let rIdx = 1; rIdx <= roomsPerFloor; rIdx++) {
          if (generatedBedCount >= bedTargetCount && hIdx < hostelConfigs.length - 1) {
            break;
          }
          if (generatedBedCount >= bedTargetCount) {
            break;
          }

          const rId = makeObjectId(`room-${hIdx}-${bIdx}-${floor}`, rIdx);
          const roomNum = `${blockLetter}-${floor * 100 + rIdx}`;

          // Distribute room types: 30% single (1), 50% double (2), 20% triple (3)
          const roomTypeRand = faker.number.float({ min: 0, max: 1 });
          let roomType: RoomType = "double";
          let capacity = 2;

          if (roomTypeRand < 0.3) {
            roomType = "single";
            capacity = 1;
          } else if (roomTypeRand < 0.8) {
            roomType = "double";
            capacity = 2;
          } else {
            roomType = "triple";
            capacity = 3;
          }

          // ~5% accessible rooms
          const isAccessible = faker.number.float({ min: 0, max: 1 }) < 0.05;

          roomDocs.push({
            _id: rId,
            institution_id: instId,
            hostel_id: hId,
            block_id: bId,
            room_number: roomNum,
            room_type: roomType,
            capacity,
            accessible: isAccessible,
            ac: faker.datatype.boolean(),
            status: "available",
          });

          // Generate Beds for this room
          for (let bedIdx = 1; bedIdx <= capacity; bedIdx++) {
            if (generatedBedCount >= bedTargetCount) break;

            const bedId = makeObjectId(`bed-${rId}`, bedIdx);
            const isOos = faker.number.float({ min: 0, max: 1 }) < 0.03; // ~3% out of service

            if (isAccessible) accessibleBedsCount++;
            if (isOos) outOfServiceBedsCount++;

            bedDocs.push({
              _id: bedId,
              institution_id: instId,
              room_id: rId,
              bed_no: `${roomNum}-${String.fromCharCode(64 + bedIdx)}`, // e.g. A-101-A
              status: isOos ? "out_of_service" : "available",
              attributes: {
                window: faker.datatype.boolean(),
                distance_to_blocks: faker.number.int({ min: 10, max: 200 }),
              },
            });

            generatedBedCount++;
          }
        }
      }
    }
  }

  log(
    `✓ Generated Inventory: ${hostelDocs.length} Hostels, ${blockDocs.length} Blocks, ${roomDocs.length} Rooms, ${bedDocs.length} Beds.`,
  );

  // 4. Generate Allocation Cycle
  const cycleId = makeObjectId("cycle", 1);
  const cycleDoc = {
    _id: cycleId,
    institution_id: instId,
    academic_year: "2026-2027",
    name: "Regular Autumn Allocation 2026",
    status: "open",
    window_open: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    window_close: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    quota_buckets: [
      { name: "Merit", total_seats: Math.floor(bedTargetCount * 0.5) },
      { name: "Reserved", total_seats: Math.floor(bedTargetCount * 0.3) },
      { name: "International", total_seats: Math.floor(bedTargetCount * 0.1) },
      { name: "Sports", total_seats: Math.floor(bedTargetCount * 0.1) },
    ],
    priority_tier_order: ["tier_1_merit", "tier_1_accessibility", "tier_2_regular"],
  };

  // 5. Generate Applicants (Users, Applications, Preferences, Groups, Encrypted Questionnaires)
  const userDocs: Record<string, unknown>[] = [];
  const appDocs: Record<string, unknown>[] = [];
  const prefDocs: Record<string, unknown>[] = [];
  const consentDocs: Record<string, unknown>[] = [];
  const compatibilityDocs: Record<string, unknown>[] = [];

  const programmes = ["BTech", "MTech", "MBA", "PhD"];
  const years = [1, 2, 3, 4];
  const feeCategories = ["General", "Reserved", "International", "Sponsored"];

  let exactTiesCount = 0;
  let unmetAccessAppId = "";

  for (let i = 0; i < applicantCount; i++) {
    const sId = makeObjectId("student", i);
    const gender = i % 2 === 0 ? "male" : "female";
    const firstName = faker.person.firstName(gender === "male" ? "male" : "female");
    const lastName = faker.person.lastName();
    const email = `synthetic.student.${i + 1}@synthetic${seedValue}.edu`;

    const hasHold = faker.number.float({ min: 0, max: 1 }) < 0.02; // ~2% holds
    const accessibilityNeed = faker.number.float({ min: 0, max: 1 }) < 0.03; // ~3% accessibility

    if (accessibilityNeed && !unmetAccessAppId) {
      unmetAccessAppId = sId.toString();
    }

    // Determine priority tier (including deliberate exact ties for first 5 students)
    let priorityTier = "tier_2_regular";
    if (i < 5) {
      priorityTier = "tier_1_merit"; // Exact tie!
      exactTiesCount++;
    } else if (accessibilityNeed) {
      priorityTier = "tier_1_accessibility";
    }

    userDocs.push({
      _id: sId,
      institution_id: instId,
      email,
      name: `${firstName} ${lastName}`,
      passwordHash:
        "$argon2id$v=19$m=65536,p=4,t=3$/aEDYPkaP7x/AkWVbdI6bA$IAHpSXfJvy1fKgpbRECs3Yq5gjmIp+QPtdCB0ofSch0",
      roles: ["student"],
      status: "active",
      is_synthetic: true,
    });

    const appId = makeObjectId("application", i);
    appDocs.push({
      _id: appId,
      institution_id: instId,
      cycle_id: cycleId,
      student_id: sId,
      reference_number: `APP-SYN-${seedValue}-${String(i + 1).padStart(5, "0")}`,
      status: "submitted",
      eligibility_result: {
        eligible: !hasHold,
        reasons: hasHold ? ["Active academic/administrative hold on profile"] : [],
      },
      priority_tier: priorityTier,
      form_data: {
        programme: faker.helpers.arrayElement(programmes),
        year: faker.helpers.arrayElement(years),
        feeCategory: faker.helpers.arrayElement(feeCategories),
        hasHold,
        accessibilityNeed,
        distanceKm: faker.number.int({ min: 10, max: 1500 }),
      },
      submitted_at: new Date(),
    });

    // Skewed hostel popularity distribution (Zipfian order)
    // Male students pick male/coed hostels, Female students pick female/coed hostels
    const matchingHostels = hostelDocs.filter(
      (h) => h.gender_policy === gender || h.gender_policy === "coed",
    );

    const prefCount = Math.min(3, matchingHostels.length);
    for (let r = 1; r <= prefCount; r++) {
      const prefHostel = matchingHostels[(r - 1) % matchingHostels.length]!;
      prefDocs.push({
        _id: makeObjectId(`pref-${i}`, r),
        institution_id: instId,
        application_id: appId,
        student_id: sId,
        rank: r,
        hostel_id: prefHostel._id,
        room_type: r === 1 ? "double" : r === 2 ? "single" : "triple",
        roommate_ids: [],
      });
    }

    // Questionnaire & Consent (Correlated responses)
    const answers: QuestionnaireAnswers = {
      sleep: {
        value: faker.number.int({ min: 1, max: 5 }),
        importance: faker.number.int({ min: 1, max: 3 }),
      },
      study: {
        value: faker.number.int({ min: 1, max: 5 }),
        importance: faker.number.int({ min: 1, max: 3 }),
      },
      tidiness: {
        value: faker.number.int({ min: 1, max: 5 }),
        importance: faker.number.int({ min: 1, max: 3 }),
      },
      noise: {
        value: faker.number.int({ min: 1, max: 5 }),
        importance: faker.number.int({ min: 1, max: 3 }),
      },
      guests: {
        value: faker.number.int({ min: 1, max: 5 }),
        importance: faker.number.int({ min: 1, max: 3 }),
      },
      temperature: {
        value: faker.number.int({ min: 1, max: 5 }),
        importance: faker.number.int({ min: 1, max: 3 }),
      },
      social: {
        value: faker.number.int({ min: 1, max: 5 }),
        importance: faker.number.int({ min: 1, max: 3 }),
      },
      sharing: {
        value: faker.number.int({ min: 1, max: 5 }),
        importance: faker.number.int({ min: 1, max: 3 }),
      },
      smoking: {
        value: faker.number.float({ min: 0, max: 1 }) < 0.85 ? "non_smoker" : "smoker",
        importance: faker.number.int({ min: 1, max: 3 }),
        dealBreaker: faker.datatype.boolean(),
      },
    };

    const encrypted = encryptPayload(answers, instId.toString(), sId.toString());

    consentDocs.push({
      _id: makeObjectId("consent", i),
      institution_id: instId,
      student_id: sId,
      purpose: "compatibility_questionnaire",
      text_version: "1.0",
      granted_at: new Date(),
    });

    compatibilityDocs.push({
      _id: makeObjectId("compat", i),
      institution_id: instId,
      student_id: sId,
      key_id: encrypted.keyId,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
      ciphertext: encrypted.ciphertext,
    });
  }

  log(`✓ Generated ${userDocs.length} Applicants & Encrypted Questionnaires.`);

  // 6. Generate Roommate Groups (~10% of applicants) + Edge Cases
  const groupDocs: Record<string, unknown>[] = [];
  const groupableStudents = userDocs.slice(100, Math.floor(applicantCount * 0.1) + 100);

  let groupIdx = 0;
  for (let g = 0; g < groupableStudents.length; g += 3) {
    const membersSlice = groupableStudents.slice(g, g + 3);
    if (membersSlice.length < 2) break;

    const leader = membersSlice[0]!;
    const groupId = makeObjectId("group", groupIdx++);

    groupDocs.push({
      _id: groupId,
      institution_id: instId,
      cycle_id: cycleId,
      leader_id: leader._id,
      invite_code: `GRP-SYN-${seedValue}-${groupIdx}`,
      members: membersSlice.map((m) => ({
        student_id: m._id,
        email: m.email,
        status: "accepted",
        joined_at: new Date(),
      })),
      status: "confirmed",
    });
  }

  // Edge Case 1: Oversized Group (5 students requesting a room together, max room cap is 3)
  const oversizedMembers = userDocs.slice(10, 15);
  const oversizedGroupId = makeObjectId("group-oversized", 999);
  groupDocs.push({
    _id: oversizedGroupId,
    institution_id: instId,
    cycle_id: cycleId,
    leader_id: oversizedMembers[0]!._id,
    invite_code: `GRP-OVERSIZED-5-${seedValue}`,
    members: oversizedMembers.map((m) => ({
      student_id: m._id,
      email: m.email,
      status: "accepted",
      joined_at: new Date(),
    })),
    status: "confirmed",
  });

  // Edge Case 2: Mutual Deal-Breaker Conflict Pair (Student 15 & 16 in same group with conflicting deal-breaker smoking preferences)
  const dbStudentA = userDocs[15]!;
  const dbStudentB = userDocs[16]!;
  const dealBreakerGroupId = makeObjectId("group-dealbreaker", 998);

  groupDocs.push({
    _id: dealBreakerGroupId,
    institution_id: instId,
    cycle_id: cycleId,
    leader_id: dbStudentA._id,
    invite_code: `GRP-DEALBREAKER-PAIR-${seedValue}`,
    members: [
      {
        student_id: dbStudentA._id,
        email: dbStudentA.email,
        status: "accepted",
        joined_at: new Date(),
      },
      {
        student_id: dbStudentB._id,
        email: dbStudentB.email,
        status: "accepted",
        joined_at: new Date(),
      },
    ],
    status: "confirmed",
  });

  // Override compatibility records for Student 15 & 16 with explicit dealbreaker smoking
  const encA = encryptPayload(
    { smoking: { value: "smoker", importance: 3, dealBreaker: true } },
    instId.toString(),
    (dbStudentA._id as Types.ObjectId).toString(),
  );
  const encB = encryptPayload(
    { smoking: { value: "non_smoker", importance: 3, dealBreaker: true } },
    instId.toString(),
    (dbStudentB._id as Types.ObjectId).toString(),
  );

  compatibilityDocs[15] = {
    ...compatibilityDocs[15],
    key_id: encA.keyId,
    iv: encA.iv,
    auth_tag: encA.authTag,
    ciphertext: encA.ciphertext,
  };
  compatibilityDocs[16] = {
    ...compatibilityDocs[16],
    key_id: encB.keyId,
    iv: encB.iv,
    auth_tag: encB.authTag,
    ciphertext: encB.ciphertext,
  };

  log(`✓ Generated ${groupDocs.length} Roommate Groups & Edge Case Scenarios.`);

  // 7. High-Performance Bulk Inserts using insertMany
  log("⚡ Executing high-speed bulk database operations...");
  const bulkBatchSize = 2000;

  const bulkInsert = async (
    model: { insertMany: (docs: unknown[], options?: unknown) => Promise<unknown> },
    docs: unknown[],
  ) => {
    for (let i = 0; i < docs.length; i += bulkBatchSize) {
      const chunk = docs.slice(i, i + bulkBatchSize);
      await model.insertMany(chunk, { ordered: false });
    }
  };

  await Promise.all([
    HostelModel.insertMany(hostelDocs, { ordered: false }),
    BlockModel.insertMany(blockDocs, { ordered: false }),
    AllocationCycleModel.insertMany([cycleDoc], { ordered: false }),
  ]);

  await bulkInsert(RoomModel, roomDocs);
  await bulkInsert(BedModel, bedDocs);
  await bulkInsert(UserModel, userDocs);
  await bulkInsert(ApplicationModel, appDocs);
  await bulkInsert(PreferenceModel, prefDocs);
  await bulkInsert(GroupModel, groupDocs);
  await bulkInsert(ConsentRecordModel, consentDocs);
  await bulkInsert(CompatibilityResponseModel, compatibilityDocs);

  const durationSeconds = Math.round(((Date.now() - startTime) / 1000) * 100) / 100;

  // Compute deterministic hash of generated counts & metadata
  const summaryRaw = JSON.stringify({
    seed: seedValue,
    institution: instCode,
    hostels: hostelDocs.length,
    rooms: roomDocs.length,
    beds: bedDocs.length,
    applicants: userDocs.length,
    applications: appDocs.length,
    groups: groupDocs.length,
  });

  const dataHash = crypto.createHash("sha256").update(summaryRaw).digest("hex").substring(0, 16);

  const summary: SyntheticSeedSummary = {
    seed: seedValue,
    executionTimeSeconds: durationSeconds,
    dataHash,
    counts: {
      institution: 1,
      hostels: hostelDocs.length,
      blocks: blockDocs.length,
      rooms: roomDocs.length,
      beds: bedDocs.length,
      accessibleBeds: accessibleBedsCount,
      outOfServiceBeds: outOfServiceBedsCount,
      applicants: userDocs.length,
      applications: appDocs.length,
      groups: groupDocs.length,
      questionnairesEncrypted: compatibilityDocs.length,
    },
    edgeCases: {
      exactPriorityTiesCount: exactTiesCount,
      oversizedGroupSize: 5,
      unmetAccessibilityApplicantId: unmetAccessAppId,
      dealBreakerPairCount: 1,
    },
  };

  if (!silent) {
    console.log("\n==========================================================================");
    console.log(`🎉 SYNTHETIC SEED COMPLETED IN ${durationSeconds}s (Data Hash: ${dataHash})`);
    console.log("==========================================================================");
    console.table({
      "Seed Value": summary.seed,
      "Execution Time (s)": summary.executionTimeSeconds,
      "Data Hash (SHA-256)": summary.dataHash,
      "Hostels Generated": summary.counts.hostels,
      "Blocks Generated": summary.counts.blocks,
      "Rooms Generated": summary.counts.rooms,
      "Total Beds": summary.counts.beds,
      "Accessible Beds": summary.counts.accessibleBeds,
      "Out of Service Beds": summary.counts.outOfServiceBeds,
      "Applicants Seeded": summary.counts.applicants,
      "Applications Submitted": summary.counts.applications,
      "Roommate Groups": summary.counts.groups,
      "Encrypted Questionnaires": summary.counts.questionnairesEncrypted,
      "Edge Case: Priority Ties": summary.edgeCases.exactPriorityTiesCount,
      "Edge Case: Oversized Group": `${summary.edgeCases.oversizedGroupSize} members (Max room capacity 3)`,
      "Edge Case: Deal-Breaker Pair": `${summary.edgeCases.dealBreakerPairCount} mutual conflict pair`,
    });
    console.log("==========================================================================\n");
  }

  return summary;
}

// Parse CLI flags if invoked directly: pnpm seed:synthetic --applicants 8000 --beds 8000 --seed 42 --reset
if (process.argv[1]?.endsWith("synthetic.ts") || process.argv[1]?.endsWith("synthetic.js")) {
  const args = process.argv.slice(2);
  const parseArg = (flag: string, fallback: number): number => {
    const idx = args.indexOf(flag);
    if (idx !== -1 && args[idx + 1]) {
      return parseInt(args[idx + 1]!, 10);
    }
    return fallback;
  };

  const applicants = parseArg("--applicants", 8000);
  const beds = parseArg("--beds", 8000);
  const seed = parseArg("--seed", 42);
  const reset = args.includes("--reset");

  generateSyntheticData({ applicants, beds, seed, reset })
    .then(async () => {
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Synthetic data generation failed:", err);
      process.exit(1);
    });
}
