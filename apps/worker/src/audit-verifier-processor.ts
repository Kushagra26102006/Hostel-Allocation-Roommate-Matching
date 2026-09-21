/**
 * @hostelhub/worker — audit-verifier-processor.ts
 *
 * BullMQ repeatable job that runs nightly to verify the cryptographic
 * tamper-evident hash chain for each institution.
 * If any hash break, missing link, or sequence corruption is detected,
 * immediately emits an "auditchain.failed" alert.
 */

import { Worker, Queue, type Job } from "bullmq";
import type { Redis } from "ioredis";
import { NOTIFICATIONS_QUEUE_NAME, createLogger } from "@hostelhub/shared";
import { AuditService, AuditChainHeadModel, InstitutionModel } from "@hostelhub/db";

export const AUDIT_VERIFIER_QUEUE_NAME = "audit-chain-verifier";

const log = createLogger("audit-verifier");

export interface AuditVerificationSummary {
  verifiedCount: number;
  failedInstitutions: Array<{
    institutionId: string;
    sequence?: number;
    hash?: string;
  }>;
}

/**
 * Runs verifyChain across all institutions with an audit chain.
 * Dispatches an "auditchain.failed" event to notification queue on any break.
 */
export async function verifyAllAuditChains(
  notificationQueue?: Queue,
): Promise<AuditVerificationSummary> {
  // 1. Find all distinct institution IDs that have an audit chain or registered institution
  const chainHeads = await AuditChainHeadModel.distinct("institution_id");
  const institutionDocs = await InstitutionModel.distinct("_id");

  const combinedIds = Array.from(
    new Set([...chainHeads.map(String), ...institutionDocs.map(String)]),
  ).filter(Boolean);

  const summary: AuditVerificationSummary = {
    verifiedCount: combinedIds.length,
    failedInstitutions: [],
  };

  for (const instId of combinedIds) {
    try {
      const brokenEntry = await AuditService.verifyChain(instId);

      if (brokenEntry) {
        log.error(
          {
            institutionId: instId,
            brokenSequence: brokenEntry.sequence,
            brokenHash: brokenEntry.hash,
          },
          "CRITICAL: Audit chain verification failed! Tampering or sequence break detected.",
        );

        summary.failedInstitutions.push({
          institutionId: instId,
          sequence: brokenEntry.sequence,
          hash: brokenEntry.hash,
        });

        // Emit high-priority auditchain.failed alert
        if (notificationQueue) {
          await notificationQueue.add("auditchain.failed", {
            eventType: "auditchain.failed",
            recipientId: "sys_admin",
            data: {
              institutionId: instId,
              brokenSequence: brokenEntry.sequence,
              brokenHash: brokenEntry.hash,
              action: brokenEntry.action,
              detectedAt: new Date().toISOString(),
            },
            priority: "urgent",
          });
        }
      } else {
        log.info({ institutionId: instId }, "Audit chain verified successfully: intact.");
      }
    } catch (err: unknown) {
      log.error(
        { institutionId: instId, err: err instanceof Error ? err.message : String(err) },
        "Error while verifying audit chain for institution.",
      );
      summary.failedInstitutions.push({ institutionId: instId });
    }
  }

  return summary;
}

export function setupAuditVerifierWorker(redis: Redis): {
  worker: Worker;
  queue: Queue;
} {
  const queue = new Queue(AUDIT_VERIFIER_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });

  const notificationQueue = new Queue(NOTIFICATIONS_QUEUE_NAME, {
    connection: redis,
  });

  // Schedule nightly at 02:00 AM UTC
  void queue.add(
    "verify-nightly-audit-chains",
    {},
    {
      repeat: {
        pattern: "0 2 * * *",
      },
      jobId: "audit-verifier-nightly-cron",
    },
  );

  const worker = new Worker(
    AUDIT_VERIFIER_QUEUE_NAME,
    async (job: Job) => {
      log.info({ jobId: job.id }, "Starting nightly audit chain verification job...");
      const result = await verifyAllAuditChains(notificationQueue);
      log.info(
        { verifiedCount: result.verifiedCount, failedCount: result.failedInstitutions.length },
        "Nightly audit chain verification finished.",
      );
      return result;
    },
    {
      connection: redis,
      concurrency: 1,
    },
  );

  return { worker, queue };
}
