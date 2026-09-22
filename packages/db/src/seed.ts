import { Types } from "mongoose";
import { connectDb, disconnectDb } from "./connection.js";
import { InstitutionModel } from "./models/institution.model.js";
import { UserModel, type UserRole } from "./models/user.model.js";
import { HostelModel, type GenderPolicy } from "./models/hostel.model.js";
import { BlockModel } from "./models/block.model.js";
import { RoomModel, type RoomType } from "./models/room.model.js";
import { BedModel } from "./models/bed.model.js";
import { AllocationCycleModel } from "./models/allocation-cycle.model.js";
import { ApplicationModel } from "./models/application.model.js";
import { PreferenceModel } from "./models/preference.model.js";
import { CompatibilityResponseModel } from "./models/compatibility-response.model.js";
import { AcademicBlockModel } from "./models/academic-block.model.js";
import { AuditService } from "./services/audit.service.js";
import { precomputeOfflineWalkingDistances } from "./services/walking-distance.service.js";
import { encryptPayload } from "@hostelhub/shared";

export interface SeedResult {
  institutionId: Types.ObjectId;
  institutionCode: string;
  usersCreatedOrUpdated: number;
  hostelsCount: number;
  roomsCount: number;
  bedsCount: number;
}

const PASSWORD_HASH =
  "$argon2id$v=19$m=65536,p=4,t=3$WkymmI+IR1Ib1qIcLm04Rw$keTkByJn7uRdrv7wdMA7UV1gDVwJI5YB3jjVmtdlEcg";

export async function seedDatabase(uri?: string): Promise<SeedResult> {
  await connectDb(uri);

  console.log("🌱 Starting idempotent database seed for HostelHub...");

  // 1. Upsert Demo Institution
  const demoInstitution = await InstitutionModel.findOneAndUpdate(
    { code: "NIT-DEMO" },
    {
      $set: {
        name: "National Institute of Technology (Demo)",
        code: "NIT-DEMO",
        status: "active",
        domain: "nit.edu",
        settings: {
          timezone: "Asia/Kolkata",
          currency: "INR",
          allowStudentRegistration: true,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const institutionId = demoInstitution._id as Types.ObjectId;
  console.log(
    `✓ Demo Institution verified: ${demoInstitution.name} (${demoInstitution.code}) [${institutionId}]`,
  );

  // 2. Demo Users for each of the roles
  const demoUsers: Array<{
    email: string;
    name: string;
    roles: UserRole[];
    hostelAssignments?: string[];
    mfaEnabled: boolean;
  }> = [
    {
      email: "student.demo@nit.edu",
      name: "Aarav Sharma",
      roles: ["student"],
      mfaEnabled: false,
    },
    {
      email: "warden.demo@nit.edu",
      name: "Dr. Rajesh Kumar",
      roles: ["warden"],
      hostelAssignments: ["Aryabhata Hall", "Ramanujan Tower"],
      mfaEnabled: true,
    },
    {
      email: "chief.warden@nit.edu",
      name: "Prof. Sunita Verma",
      roles: ["chief_warden"],
      hostelAssignments: [
        "Aryabhata Hall",
        "Gargi Residence",
        "Ramanujan Tower",
        "Kalpana Chawla Hall",
      ],
      mfaEnabled: true,
    },
    {
      email: "admin.hostel@nit.edu",
      name: "Vikram Singh",
      roles: ["hostel_admin"],
      mfaEnabled: true,
    },
    {
      email: "dean.welfare@nit.edu",
      name: "Prof. Harpreet Kaur",
      roles: ["dean"],
      mfaEnabled: true,
    },
    {
      email: "sysadmin@nit.edu",
      name: "Amitabh Sen",
      roles: ["sys_admin"],
      mfaEnabled: true,
    },
  ];

  const userMap = new Map<string, Types.ObjectId>();
  let userCount = 0;

  for (const u of demoUsers) {
    const doc = await UserModel.findOneAndUpdate(
      { institution_id: institutionId, email: u.email.toLowerCase() },
      {
        $set: {
          name: u.name,
          email: u.email.toLowerCase(),
          passwordHash: PASSWORD_HASH,
          roles: u.roles,
          institution_id: institutionId,
          hostelAssignments: u.hostelAssignments ?? [],
          status: "active",
          mfa: {
            enabled: u.mfaEnabled,
            method: "totp",
            backupCodes: u.mfaEnabled ? ["DEMO1234", "DEMO5678"] : [],
          },
        },
        $setOnInsert: {
          version: 1,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    userMap.set(u.email.toLowerCase(), doc._id as Types.ObjectId);
    userCount++;
    console.log(`  ✓ User upserted: ${u.name} <${u.email}> [${u.roles.join(", ")}]`);
  }

  // 3. Seed Hostels
  const hostelConfigs: Array<{
    name: string;
    gender_policy: GenderPolicy;
    address: string;
    location: { lat: number; lng: number };
  }> = [
    {
      name: "Aryabhata Hall (Block A)",
      gender_policy: "male",
      address: "North Campus Sector 1, Academic Zone",
      location: { lat: 29.8628, lng: 77.895 },
    },
    {
      name: "Gargi Residence (Block B)",
      gender_policy: "female",
      address: "South Campus Sector 2, Lake Road",
      location: { lat: 29.8668, lng: 77.8958 },
    },
    {
      name: "Ramanujan Tower (Block C)",
      gender_policy: "coed",
      address: "East Campus Sector 3, Innovation Enclave",
      location: { lat: 29.8644, lng: 77.8962 },
    },
    {
      name: "Kalpana Chawla Hall (Block D)",
      gender_policy: "female",
      address: "West Campus Sector 4, Sports Arena Road",
      location: { lat: 29.8658, lng: 77.8945 },
    },
  ];

  const hostelDocs: Types.ObjectId[] = [];
  const seededHostelObjects: Array<{
    _id: Types.ObjectId;
    name: string;
    location: { lat: number; lng: number };
  }> = [];
  for (const hc of hostelConfigs) {
    const h = await HostelModel.findOneAndUpdate(
      { institution_id: institutionId, name: hc.name },
      {
        $set: {
          name: hc.name,
          gender_policy: hc.gender_policy,
          address: hc.address,
          status: "active",
          location: hc.location,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const id = h._id as Types.ObjectId;
    hostelDocs.push(id);
    seededHostelObjects.push({ _id: id, name: hc.name, location: hc.location });
  }
  console.log(`✓ Seeded ${hostelDocs.length} Hostels with coordinates for NIT-DEMO`);

  // 3b. Seed Academic Blocks
  const academicBlockConfigs = [
    {
      name: "Computer Science & Engineering",
      short_code: "CSE",
      location: { lat: 29.8648, lng: 77.897 },
    },
    { name: "Electrical Engineering", short_code: "ECE", location: { lat: 29.8655, lng: 77.8965 } },
    { name: "Main Central Library", short_code: "LIB", location: { lat: 29.865, lng: 77.8955 } },
    { name: "Administrative Complex", short_code: "ADM", location: { lat: 29.8645, lng: 77.895 } },
    { name: "Lecture Hall Complex", short_code: "LHC", location: { lat: 29.866, lng: 77.8975 } },
  ];

  const seededBlocks: Array<{
    _id: Types.ObjectId;
    name: string;
    short_code: string;
    location: { lat: number; lng: number };
  }> = [];
  for (const abc of academicBlockConfigs) {
    const b = await AcademicBlockModel.findOneAndUpdate(
      { institution_id: institutionId, short_code: abc.short_code },
      {
        $set: {
          name: abc.name,
          short_code: abc.short_code,
          location: abc.location,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    seededBlocks.push({
      _id: b._id as Types.ObjectId,
      name: abc.name,
      short_code: abc.short_code,
      location: abc.location,
    });
  }
  console.log(`✓ Seeded ${seededBlocks.length} Academic Blocks for NIT-DEMO`);

  // 3c. Pre-compute and cache walking distances offline
  const cachedPairs = await precomputeOfflineWalkingDistances(
    institutionId,
    seededHostelObjects,
    seededBlocks,
  );
  console.log(`✓ Pre-computed and cached ${cachedPairs} walking distance pairs`);

  // 4. Seed Blocks for each hostel
  const blockDocs: Array<{ id: Types.ObjectId; hostelId: Types.ObjectId; name: string }> = [];
  for (let i = 0; i < hostelDocs.length; i++) {
    const hostelId = hostelDocs[i]!;
    const blockLetter = String.fromCharCode(65 + i); // A, B, C, D
    const b = await BlockModel.findOneAndUpdate(
      { institution_id: institutionId, hostel_id: hostelId, name: `Tower ${blockLetter}` },
      {
        $set: {
          name: `Tower ${blockLetter}`,
          total_floors: 5,
          status: "active",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    blockDocs.push({ id: b._id as Types.ObjectId, hostelId, name: `Tower ${blockLetter}` });
  }

  // 5. Seed Rooms & Beds
  let roomsCount = 0;
  let bedsCount = 0;
  let allocatedRoomId: Types.ObjectId | null = null;
  let allocatedBedA1: Types.ObjectId | null = null;
  let allocatedBedA2: Types.ObjectId | null = null;

  for (const block of blockDocs) {
    for (let floor = 1; floor <= 4; floor++) {
      for (let r = 1; r <= 4; r++) {
        const roomNumber = `${floor}0${r}`;
        const roomType: RoomType = r === 1 ? "single" : r === 4 ? "triple" : "double";
        const capacity = roomType === "single" ? 1 : roomType === "double" ? 2 : 3;
        const accessible = floor === 1 && r === 1;
        const ac = floor >= 3;

        const room = await RoomModel.findOneAndUpdate(
          { institution_id: institutionId, block_id: block.id, room_number: roomNumber },
          {
            $set: {
              hostel_id: block.hostelId,
              room_type: roomType,
              capacity,
              accessible,
              ac,
              status: "available",
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        roomsCount++;

        // Designate Room 304 in Tower A as Aarav's allocated room
        const isAaravRoom = block.name === "Tower A" && roomNumber === "304";
        if (isAaravRoom) {
          allocatedRoomId = room._id as Types.ObjectId;
        }

        for (let b = 1; b <= capacity; b++) {
          const bedNo = `${roomNumber}-${b}`;
          let status: "available" | "occupied" = "available";

          if (isAaravRoom && b <= 2) {
            status = "occupied";
          }

          const bed = await BedModel.findOneAndUpdate(
            { institution_id: institutionId, room_id: room._id, bed_no: bedNo },
            {
              $set: {
                status,
                attributes: {
                  window: b === 1,
                  desk: true,
                  wardrobe: true,
                  lanPort: true,
                },
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );
          bedsCount++;

          if (isAaravRoom && b === 1) allocatedBedA1 = bed._id as Types.ObjectId;
          if (isAaravRoom && b === 2) allocatedBedA2 = bed._id as Types.ObjectId;
        }
      }
    }
  }
  console.log(`✓ Seeded ${roomsCount} Rooms and ${bedsCount} Beds across all towers`);

  // 6. Seed Active Allocation Cycle
  const windowOpen = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14 days ago
  const windowClose = new Date(Date.now() + 16 * 24 * 60 * 60 * 1000); // 16 days in future

  const cycle = await AllocationCycleModel.findOneAndUpdate(
    { institution_id: institutionId, academic_year: "2026-2027" },
    {
      $set: {
        name: "Autumn 2026 Hostel Allocation Cycle",
        academic_year: "2026-2027",
        window_open: windowOpen,
        window_close: windowClose,
        status: "open",
        quota_buckets: [
          { name: "General", capacity: 400 },
          { name: "Merit", capacity: 80 },
          { name: "Reserved", capacity: 120 },
          { name: "International", capacity: 40 },
          { name: "Sports", capacity: 40 },
        ],
        document_requirements: [
          { type: "student_id", label: "College ID Card", required: true },
          { type: "fee_receipt", label: "Semester Tuition Fee Receipt", required: true },
          { type: "aadhaar", label: "Government Photo Identity", required: true },
        ],
        priority_tier_order: ["tier_1_pwd", "tier_2_merit", "tier_3_regular", "tier_4_waitlist"],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const cycleId = cycle._id as Types.ObjectId;
  console.log(`✓ Active Allocation Cycle configured: "${cycle.name}"`);

  // 7. Seed Student Applications
  const aaravId = userMap.get("student.demo@nit.edu")!;
  const kabirId = new Types.ObjectId("000000000000000000000002");
  const priyaId = new Types.ObjectId("000000000000000000000003");
  const rohanId = new Types.ObjectId("000000000000000000000004");

  // Aarav's application (Allocated)
  await ApplicationModel.findOneAndUpdate(
    { institution_id: institutionId, reference_number: "NIT-APP-2026-0001" },
    {
      $set: {
        cycle_id: cycleId,
        student_id: aaravId,
        reference_number: "NIT-APP-2026-0001",
        status: "approved",
        priority_tier: "tier_2_merit",
        eligibility_result: { eligible: true, reasons: [] },
        form_data: {
          fullName: "Aarav Sharma",
          rollNo: "22BCS042",
          programme: "BTech",
          department: "Computer Science & Engineering",
          semester: 5,
          cgpa: 8.92,
          gender: "male",
          phone: "+91 98765 43210",
          emergencyContact: "+91 98765 43219",
          homeState: "Delhi NCR",
          distanceKm: 420,
          roomTypePreference: "double",
          allocatedRoomId,
          allocatedBedId: allocatedBedA1,
        },
        submitted_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // Kabir's application (Allocated Roommate)
  await ApplicationModel.findOneAndUpdate(
    { institution_id: institutionId, reference_number: "NIT-APP-2026-0002" },
    {
      $set: {
        cycle_id: cycleId,
        student_id: kabirId,
        reference_number: "NIT-APP-2026-0002",
        status: "approved",
        priority_tier: "tier_2_merit",
        eligibility_result: { eligible: true, reasons: [] },
        form_data: {
          fullName: "Kabir Mehta",
          rollNo: "22BCS058",
          programme: "BTech",
          department: "Computer Science & Engineering",
          semester: 5,
          cgpa: 8.78,
          gender: "male",
          phone: "+91 98765 43211",
          emergencyContact: "+91 98765 43218",
          homeState: "Maharashtra",
          distanceKm: 860,
          roomTypePreference: "double",
          allocatedRoomId,
          allocatedBedId: allocatedBedA2,
        },
        submitted_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // Priya's application (Under Review)
  await ApplicationModel.findOneAndUpdate(
    { institution_id: institutionId, reference_number: "NIT-APP-2026-0003" },
    {
      $set: {
        cycle_id: cycleId,
        student_id: priyaId,
        reference_number: "NIT-APP-2026-0003",
        status: "under_review",
        priority_tier: "tier_3_regular",
        eligibility_result: { eligible: true, reasons: [] },
        form_data: {
          fullName: "Priya Patel",
          rollNo: "23BEC015",
          programme: "BTech",
          department: "Electronics & Communication",
          semester: 3,
          cgpa: 9.14,
          gender: "female",
          phone: "+91 98765 43212",
          homeState: "Gujarat",
          distanceKm: 650,
          roomTypePreference: "single",
        },
        submitted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // Rohan's application (Submitted)
  await ApplicationModel.findOneAndUpdate(
    { institution_id: institutionId, reference_number: "NIT-APP-2026-0004" },
    {
      $set: {
        cycle_id: cycleId,
        student_id: rohanId,
        reference_number: "NIT-APP-2026-0004",
        status: "submitted",
        priority_tier: "tier_3_regular",
        eligibility_result: { eligible: true, reasons: [] },
        form_data: {
          fullName: "Rohan Verma",
          rollNo: "24BME088",
          programme: "BTech",
          department: "Mechanical Engineering",
          semester: 1,
          cgpa: 8.1,
          gender: "male",
          phone: "+91 98765 43213",
          homeState: "Punjab",
          distanceKm: 310,
          roomTypePreference: "triple",
        },
        submitted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`✓ Student applications populated with live reference numbers`);

  // 8. Seed Preferences
  const aaravApp = await ApplicationModel.findOne({
    institution_id: institutionId,
    student_id: aaravId,
  });
  if (aaravApp) {
    await PreferenceModel.findOneAndUpdate(
      { institution_id: institutionId, application_id: aaravApp._id, student_id: aaravId, rank: 1 },
      {
        $set: {
          rank: 1,
          hostel_id: hostelDocs[0]!,
          room_type: "double",
          roommate_ids: [kabirId],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    await PreferenceModel.findOneAndUpdate(
      { institution_id: institutionId, application_id: aaravApp._id, student_id: aaravId, rank: 2 },
      {
        $set: {
          rank: 2,
          hostel_id: hostelDocs[2]!,
          room_type: "single",
          roommate_ids: [],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  // 9. Seed Questionnaire & Compatibility Responses
  const aaravAnswers = {
    sleepSchedule: "night_owl",
    cleanliness: "high",
    studyNoise: "moderate",
    guestPolicy: "weekends_only",
    acPreference: "cool_22c",
    foodHabit: "vegetarian",
    smoking: false,
    drinking: false,
  };
  const kabirAnswers = {
    sleepSchedule: "night_owl",
    cleanliness: "high",
    studyNoise: "moderate",
    guestPolicy: "weekends_only",
    acPreference: "cool_22c",
    foodHabit: "vegetarian",
    smoking: false,
    drinking: false,
  };

  const encAarav = encryptPayload(aaravAnswers, institutionId.toString(), aaravId.toString());
  const encKabir = encryptPayload(kabirAnswers, institutionId.toString(), kabirId.toString());

  await CompatibilityResponseModel.findOneAndUpdate(
    { institution_id: institutionId, student_id: aaravId },
    {
      $set: {
        key_id: encAarav.keyId,
        ciphertext: encAarav.ciphertext,
        iv: encAarav.iv,
        auth_tag: encAarav.authTag,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await CompatibilityResponseModel.findOneAndUpdate(
    { institution_id: institutionId, student_id: kabirId },
    {
      $set: {
        key_id: encKabir.keyId,
        ciphertext: encKabir.ciphertext,
        iv: encKabir.iv,
        auth_tag: encKabir.authTag,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`✓ Encrypted roommate compatibility questionnaires stored`);

  // 10. Audit log entry
  try {
    await AuditService.append({
      institution_id: institutionId,
      actor: { id: "seed_script", role: "system" },
      action: "DATABASE_SEED",
      target: { institution_code: "NIT-DEMO", users_seeded: userCount, rooms_seeded: roomsCount },
      before: null,
      after: { seeded: true, timestamp: new Date().toISOString() },
    });
    console.log("✓ Audit log chain updated with DATABASE_SEED entry");
  } catch (err) {
    console.warn("Notice: Audit entry append during seed:", (err as Error).message);
  }

  console.log(`\n🎉 Full website seeding complete!`);
  console.log(`  - Institution:  NIT-DEMO (${institutionId})`);
  console.log(`  - Users:        ${userCount} demo accounts ready`);
  console.log(
    `  - Inventory:    ${hostelDocs.length} Hostels, ${roomsCount} Rooms, ${bedsCount} Beds`,
  );
  console.log(`  - Active Cycle: ${cycle.name} (Open)`);
  console.log(`  - Aarav Room:   Aryabhata Hall, Tower A, Room 304 (Bed A-304-1)`);

  return {
    institutionId,
    institutionCode: "NIT-DEMO",
    usersCreatedOrUpdated: userCount,
    hostelsCount: hostelDocs.length,
    roomsCount,
    bedsCount,
  };
}

// Allow direct execution: tsx src/seed.ts
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedDatabase()
    .then(async () => {
      await disconnectDb();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("❌ Seed failed:", error);
      await disconnectDb();
      process.exit(1);
    });
}
