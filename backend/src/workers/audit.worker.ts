import { Worker, Queue, type Job } from "bullmq";
import { Types } from "mongoose";
import { getRedisClient } from "../config/redis.js";
import { logger } from "../config/logger.js";
import { AuditEntryModel, GENESIS_HASH } from "@hostelhub/db";
import { computeAuditHash } from "../common/utils/hash.js";

export const AUDIT_QUEUE_NAME = "audit-queue";

export interface AuditJobPayload {
  institutionId: string;
}

export function createAuditQueue(): Queue<AuditJobPayload> {
  const redis = getRedisClient();
  return new Queue<AuditJobPayload>(AUDIT_QUEUE_NAME, {
    connection: redis,
  });
}

export function startAuditWorker(): Worker<AuditJobPayload> {
  const redis = getRedisClient();

  return new Worker<AuditJobPayload>(
    AUDIT_QUEUE_NAME,
    async (job: Job<AuditJobPayload>) => {
      const { institutionId } = job.data;
      logger.info({ institutionId }, "Verifying audit trail hash chain integrity");

      const entries = await AuditEntryModel.find({
        institution_id: new Types.ObjectId(institutionId),
      }).sort({ sequence: 1 });

      let previousHash = GENESIS_HASH;
      let isCorrupted = false;
      let brokenSequence = -1;

      for (const entry of entries) {
        const actorObj =
          typeof entry.actor === "object" && entry.actor !== null
            ? (entry.actor as { userId: string; email: string; role: string })
            : { userId: String(entry.actor), email: "", role: "" };
        const targetObj =
          typeof entry.target === "object" && entry.target !== null
            ? (entry.target as { resourceType: string; resourceId: string })
            : { resourceType: "unknown", resourceId: String(entry.target ?? "") };

        const expectedHash = computeAuditHash({
          prevHash: previousHash,
          institutionId: entry.institution_id.toString(),
          actor: actorObj,
          action: entry.action,
          target: targetObj,
          before: entry.before,
          after: entry.after,
          timestamp: entry.timestamp,
        });

        if (entry.prev_hash !== previousHash || entry.hash !== expectedHash) {
          logger.error(
            { sequenceNumber: entry.sequence, entryId: entry._id },
            "🚨 AUDIT CHAIN BROKEN: Tampering or hash mismatch detected!",
          );
          isCorrupted = true;
          brokenSequence = entry.sequence;
          break;
        }

        previousHash = entry.hash;
      }

      if (!isCorrupted) {
        logger.info(
          { totalVerified: entries.length },
          "Audit chain integrity successfully verified",
        );
      }

      return { verifiedCount: entries.length, isCorrupted, brokenSequence };
    },
    { connection: redis, concurrency: 1 },
  );
}
