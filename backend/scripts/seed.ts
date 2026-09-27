import { seedDatabase } from "@hostelhub/db";
import { logger } from "../src/config/logger.js";
import { env } from "../src/config/env.js";

async function main() {
  try {
    logger.info({ uri: env.MONGODB_URI }, "Starting database seeding...");
    const result = await seedDatabase(env.MONGODB_URI);
    logger.info(
      {
        institution: result.institutionCode,
        users: result.usersCreatedOrUpdated,
        hostels: result.hostelsCount,
        rooms: result.roomsCount,
        beds: result.bedsCount,
      },
      "🎉 Database seeded successfully with realistic development data!",
    );
    process.exit(0);
  } catch (error) {
    logger.fatal({ error }, "Database seed failed");
    process.exit(1);
  }
}

main();
