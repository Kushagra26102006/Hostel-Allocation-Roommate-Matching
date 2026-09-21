/**
 * @hostelhub/worker — simulator-processor.ts
 *
 * BullMQ processor for what-if simulation batch runs.
 * Executes up to 3 scenarios in parallel with identical PRNG seed.
 */

import { Worker, Queue, type Job } from "bullmq";
import type { Redis } from "ioredis";
import { SimulatorService } from "@hostelhub/db";
import type { ScenarioDefinition } from "@hostelhub/domain";
import {
  createLogger,
  SIMULATION_QUEUE_NAME,
  NOTIFICATIONS_QUEUE_NAME,
  type SimulationJobPayload,
} from "@hostelhub/shared";

const log = createLogger("simulator-worker");

export function createSimulationQueue(redis: Redis): Queue<SimulationJobPayload> {
  return new Queue<SimulationJobPayload>(SIMULATION_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  });
}

export function setupSimulationWorker(redis: Redis): {
  worker: Worker<SimulationJobPayload>;
  queue: Queue<SimulationJobPayload>;
} {
  const simulatorService = new SimulatorService();
  const queue = createSimulationQueue(redis);
  const notificationsQueue = new Queue(NOTIFICATIONS_QUEUE_NAME, { connection: redis });

  const worker = new Worker<SimulationJobPayload>(
    SIMULATION_QUEUE_NAME,
    async (job: Job<SimulationJobPayload>) => {
      const { institutionId, cycleId, baseRunId, seed, scenarios, actor } = job.data;
      log.info(
        { institutionId, cycleId, scenariosCount: scenarios.length, seed },
        "Processing what-if simulation batch",
      );

      await job.updateProgress(10);

      const result = await simulatorService.runSimulationBatch(
        institutionId,
        {
          cycleId,
          baseRunId,
          seed,
          scenarios: scenarios as unknown as ScenarioDefinition[],
        },
        actor,
      );

      await job.updateProgress(100);

      // Notify the requester that simulation batch has completed
      try {
        await notificationsQueue.add("simulation-completed", {
          institutionId,
          userId: actor.id,
          type: "IN_APP",
          templateCode: "SYSTEM_NOTIFICATION",
          data: {
            title: "What-If Simulation Completed",
            body: `Comparison for ${scenarios.length} scenario(s) is ready for review.`,
            link: `/staff/chief-warden/simulator?batchId=${result.batchId}`,
          },
        });
      } catch (notifyErr) {
        log.warn({ notifyErr }, "Failed to enqueue simulation completion notification");
      }

      log.info({ batchId: result.batchId }, "Simulation batch finished successfully");
      return result;
    },
    {
      connection: redis,
      concurrency: 3,
    },
  );

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, err }, "Simulation worker job failed");
  });

  return { worker, queue };
}
