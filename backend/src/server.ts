import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { closeRedisClient } from "./config/redis.js";
import {
  startAllocationWorker,
  startLettersWorker,
  startNotificationsWorker,
  startAuditWorker,
  startSchedulerWorker,
} from "./workers/index.js";

async function bootstrap() {
  try {
    logger.info("Starting HostelHub Backend Server initialization...");

    // 1. Connect MongoDB
    await connectDatabase();

    // 2. Start Background Workers
    const allocationWorker = startAllocationWorker();
    const lettersWorker = startLettersWorker();
    const notificationsWorker = startNotificationsWorker();
    const auditWorker = startAuditWorker();
    const schedulerWorker = startSchedulerWorker();
    logger.info("Background BullMQ workers launched successfully");

    // 3. Create Express app and listen
    const app = createApp();
    const server = app.listen(env.PORT, env.HOST, () => {
      logger.info(`🚀 HostelHub API server running on http://${env.HOST}:${env.PORT}/api/v1`);
      logger.info(`Health check available at http://${env.HOST}:${env.PORT}/health`);
    });

    // 4. Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, "Graceful shutdown initiated...");

      server.close(async () => {
        logger.info("HTTP server closed");
        try {
          await Promise.all([
            allocationWorker.close(),
            lettersWorker.close(),
            notificationsWorker.close(),
            auditWorker.close(),
            schedulerWorker.close(),
          ]);
          logger.info("All workers shut down");

          await closeRedisClient();
          await disconnectDatabase();
          logger.info("Database & cache connections cleanly closed");
          process.exit(0);
        } catch (err) {
          logger.error({ err }, "Error during graceful shutdown");
          process.exit(1);
        }
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.fatal({ error }, "Failed to start server");
    process.exit(1);
  }
}

bootstrap();
