import type { Types } from "mongoose";
import { connectDb, disconnectDb } from "./connection.js";
import { InstitutionModel } from "./models/institution.model.js";
import { UserModel, type UserRole } from "./models/user.model.js";
import { AuditService } from "./services/audit.service.js";

export interface SeedResult {
  institutionId: Types.ObjectId;
  institutionCode: string;
  usersCreatedOrUpdated: number;
}

export async function seedDatabase(
  uri?: string,
): Promise<SeedResult> {
  await connectDb(uri);

  console.log("🌱 Starting idempotent database seed...");

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
  console.log(`✓ Demo Institution verified: ${demoInstitution.name} (${demoInstitution.code}) [${institutionId}]`);

  // 2. Demo Users for each of the 6 roles
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
      hostelAssignments: ["BH-1", "BH-2"],
      mfaEnabled: true,
    },
    {
      email: "chief.warden@nit.edu",
      name: "Prof. Sunita Verma",
      roles: ["chief_warden"],
      hostelAssignments: ["BH-1", "BH-2", "GH-1", "GH-2"],
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

  let count = 0;
  for (const u of demoUsers) {
    await UserModel.findOneAndUpdate(
      { institution_id: institutionId, email: u.email.toLowerCase() },
      {
        $set: {
          name: u.name,
          email: u.email.toLowerCase(),
          passwordHash:
            "$argon2id$v=19$m=65536,p=4,t=3$/aEDYPkaP7x/AkWVbdI6bA$IAHpSXfJvy1fKgpbRECs3Yq5gjmIp+QPtdCB0ofSch0",
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
    count++;
    console.log(`  ✓ User upserted: ${u.name} <${u.email}> [${u.roles.join(", ")}]`);
  }

  // 3. Add an audit entry for the seed operation
  try {
    await AuditService.append({
      institution_id: institutionId,
      actor: { id: "seed_script", role: "system" },
      action: "DATABASE_SEED",
      target: { institution_code: "NIT-DEMO", users_seeded: count },
      before: null,
      after: { seeded: true, timestamp: new Date().toISOString() },
    });
    console.log("✓ Audit log chain updated with DATABASE_SEED entry");
  } catch (err) {
    console.warn("Notice: Audit entry append during seed:", (err as Error).message);
  }

  console.log(`🎉 Seeding complete: 1 institution and ${count} role users ready.`);

  return {
    institutionId,
    institutionCode: "NIT-DEMO",
    usersCreatedOrUpdated: count,
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
