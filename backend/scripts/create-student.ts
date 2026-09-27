import argon2 from "argon2";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { UserModel, InstitutionModel } from "@hostelhub/db";
import { logger } from "../src/config/logger.js";

async function main() {
  const email = (process.argv[2] || "student.demo@nit.edu").trim().toLowerCase();
  const password = process.argv[3] || "HostelHub2026!MasterPass";
  const name = process.argv[4] || "Aarav Sharma";

  try {
    await connectDatabase();

    let inst = await InstitutionModel.findOne({ code: "NIT-DEMO" });
    if (!inst) {
      inst = await InstitutionModel.create({
        name: "National Institute of Technology (Demo)",
        code: "NIT-DEMO",
        status: "active",
        domain: "nit.edu",
      });
    }

    const passwordHash = await argon2.hash(password);

    const user = await UserModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        institution_id: inst._id,
        email: email.toLowerCase(),
        name,
        roles: ["student"],
        passwordHash,
        mfa: {
          enabled: false,
          method: "totp",
        },
        status: "active",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    console.log("\n=======================================================");
    console.log("🎓 STUDENT USER CREATED / UPDATED SUCCESSFULLY IN DATABASE");
    console.log("=======================================================");
    console.log(`User ID  : ${user._id}`);
    console.log(`Name     : ${user.name}`);
    console.log(`Email    : ${user.email}`);
    console.log(`Password : ${password}`);
    console.log(`Role     : ${user.roles.join(", ")}`);
    console.log(`Status   : ${user.status}`);
    console.log(`Institute: ${inst.name} (${inst.code})`);
    console.log("=======================================================\n");

    logger.info(
      {
        id: user._id,
        email: user.email,
        roles: user.roles,
      },
      "Student user created/updated successfully.",
    );

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.fatal({ error }, "Failed to create student user");
    console.error("Error creating student:", error);
    process.exit(1);
  }
}

main();
