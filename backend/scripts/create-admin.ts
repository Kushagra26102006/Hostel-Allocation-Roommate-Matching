import argon2 from "argon2";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { UserModel, InstitutionModel, type UserRole } from "@hostelhub/db";
import { generateTotpSecret } from "../src/common/security/totp.js";
import { logger } from "../src/config/logger.js";

async function main() {
  const email = process.argv[2] || "admin@hostelhub.local";
  const password = process.argv[3] || "AdminPass123!";
  const role = (process.argv[4] || "sys_admin") as UserRole;

  try {
    await connectDatabase();

    let inst = await InstitutionModel.findOne({ code: "NIT-DEMO" });
    if (!inst) {
      inst = await InstitutionModel.create({
        name: "Demo University",
        code: "NIT-DEMO",
        status: "active",
        domain: "hostelhub.local",
      });
    }

    const passwordHash = await argon2.hash(password);
    const mfaSecret = generateTotpSecret();

    const user = await UserModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        institution_id: inst._id,
        email: email.toLowerCase(),
        name: "System Administrator",
        roles: [role],
        passwordHash,
        mfa: {
          enabled: true,
          secret: mfaSecret,
          method: "totp",
        },
        status: "active",
      },
      { upsert: true, new: true },
    );

    logger.info(
      {
        id: user._id,
        email: user.email,
        roles: user.roles,
      },
      `Admin user created/updated successfully.`,
    );

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.fatal({ error }, "Failed to create admin user");
    process.exit(1);
  }
}

main();
