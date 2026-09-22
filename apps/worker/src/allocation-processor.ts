import { Worker, Queue, type Job } from "bullmq";
import type { Redis } from "ioredis";
import { Types } from "mongoose";
import {
  connectDb,
  runInTransaction,
  AllocationRunModel,
  AllocationDraftModel,
  AllocationAssignmentModel,
  WaitlistEntryModel,
  WeightsVersionModel,
  AllocationCycleModel,
  HostelModel,
  RoomModel,
  BedModel,
  ApplicationModel,
  PreferenceModel,
  GroupModel,
  CompatibilityReader,
  getHostelWalkingMinutesMap,
} from "@hostelhub/db";
import {
  allocate,
  DEFAULT_WEIGHTS,
  InvariantError,
  type Snapshot,
  type PriorityUnit,
  type Unit,
  type Hostel,
  type Room,
  type Bed,
  type BedStatus,
  type Gender,
  type AllocateResult,
  type Weights,
} from "@hostelhub/domain";
import {
  createLogger,
  ALLOCATION_QUEUE_NAME,
  getAllocationEventChannel,
  getAllocationCancelKey,
  type AllocationJobPayload,
  type AllocationProgressEvent,
  type AllocationStageCode,
  STAGE_CONFIGS,
} from "@hostelhub/shared";

const log = createLogger("allocation-worker");

export class AllocationCancelledError extends Error {
  constructor(message = "Allocation run was cancelled by user request.") {
    super(message);
    this.name = "AllocationCancelledError";
  }
}

/**
 * Creates BullMQ Queue instance for allocation runs.
 */
export function createAllocationQueue(redis: Redis): Queue<AllocationJobPayload> {
  return new Queue<AllocationJobPayload>(ALLOCATION_QUEUE_NAME, {
    connection: redis as never,
  });
}

/**
 * Maps engine stage codes to user-facing stages and calculates overall progress percent.
 */
function computeProgress(
  stageCode: AllocationStageCode,
  current?: number,
  total?: number,
): { percent: number; stageLabel: string } {
  const config = STAGE_CONFIGS[stageCode] ?? { label: stageCode, basePercent: 0, maxPercent: 100 };
  const span = config.maxPercent - config.basePercent;
  let fraction = 1;
  if (total !== undefined && total > 0 && current !== undefined) {
    fraction = Math.min(1, Math.max(0, current / total));
  }
  const percent = Math.round(config.basePercent + span * fraction);
  return { percent, stageLabel: config.label };
}

/**
 * Publishes progress update to Redis pub/sub channel and updates Mongo document.
 */
export async function emitProgress(
  redis: Redis,
  runId: string,
  event: Omit<AllocationProgressEvent, "runId" | "timestamp">,
): Promise<void> {
  const fullEvent: AllocationProgressEvent = {
    ...event,
    runId,
    timestamp: new Date().toISOString(),
  };

  const channel = getAllocationEventChannel(runId);
  try {
    await redis.publish(channel, JSON.stringify(fullEvent));
  } catch (err) {
    log.warn({ err, runId }, "Failed to publish progress event to Redis");
  }

  // Update Mongo document progress state
  try {
    await AllocationRunModel.updateOne(
      { _id: new Types.ObjectId(runId) },
      {
        $set: {
          progress: {
            stage: event.stageCode,
            percent: event.percent,
            message: event.message,
            ...(event.current !== undefined ? { current: event.current } : {}),
            ...(event.total !== undefined ? { total: event.total } : {}),
          },
        },
      },
    );
  } catch (err) {
    log.warn({ err, runId }, "Failed to update run progress in database");
  }
}

/**
 * Checks if the run has been cancelled via Redis flag.
 */
export async function checkCancelled(redis: Redis, runId: string): Promise<boolean> {
  const key = getAllocationCancelKey(runId);
  const val = await redis.get(key);
  return val !== null;
}

/**
 * Builds the pure domain Snapshot and PriorityUnit list from MongoDB models.
 */
export async function buildSnapshotAndUnits(
  institutionIdStr: string,
  cycleIdStr: string,
): Promise<{
  snapshot: Snapshot;
  units: PriorityUnit[];
  studentAppMap: Map<string, Types.ObjectId>;
  applicationStudentMap: Map<string, Types.ObjectId>;
}> {
  const institutionId = new Types.ObjectId(institutionIdStr);
  const cycleId = new Types.ObjectId(cycleIdStr);

  const [cycle, hostelDocs, roomDocs, bedDocs, appDocs, prefDocs, groupDocs, walkingMinutesMap] =
    await Promise.all([
      AllocationCycleModel.findById(cycleId).exec(),
      HostelModel.find({ institution_id: institutionId }).exec(),
      RoomModel.find({ institution_id: institutionId }).exec(),
      BedModel.find({
        institution_id: institutionId,
        status: { $in: ["available", "reserved"] },
      }).exec(),
      ApplicationModel.find({
        institution_id: institutionId,
        cycle_id: cycleId,
        status: { $in: ["submitted", "under_review", "approved"] },
      }).exec(),
      PreferenceModel.find({ institution_id: institutionId }).exec(),
      GroupModel.find({
        institution_id: institutionId,
        cycle_id: cycleId,
        status: "confirmed",
      }).exec(),
      getHostelWalkingMinutesMap(institutionId),
    ]);

  if (!cycle) {
    throw new Error(`AllocationCycle not found: ${cycleIdStr}`);
  }

  // 1. Hostels map
  const hostels = new Map<string, Hostel>();
  for (const h of hostelDocs) {
    const hId = h._id.toString();
    hostels.set(hId, {
      id: hId,
      name: h.name,
      genderPolicy: h.gender_policy,
      walkingMinutes: walkingMinutesMap.get(hId) ?? 15,
    });
  }

  // 2. Rooms map
  const rooms = new Map<string, Room>();
  for (const r of roomDocs) {
    rooms.set(r._id.toString(), {
      id: r._id.toString(),
      hostelId: r.hostel_id.toString(),
      roomNumber: r.room_number,
      roomType: r.room_type,
      capacity: r.capacity,
      block: r.block_id ? r.block_id.toString() : "Block-A",
      floor: 1,
      accessible: r.accessible ?? false,
    });
  }

  // 3. Beds map
  const beds = new Map<string, Bed>();
  for (const b of bedDocs) {
    const status: BedStatus = b.status === "held" ? "reserved" : (b.status as BedStatus);
    const accessible = Boolean(
      b.attributes &&
      typeof b.attributes === "object" &&
      (b.attributes as Record<string, unknown>).accessible,
    );
    beds.set(b._id.toString(), {
      id: b._id.toString(),
      roomId: b.room_id.toString(),
      status,
      accessible,
    });
  }

  // 4. Quotas map
  const quotaBudget = new Map<string, number>();
  for (const q of cycle.quota_buckets ?? []) {
    quotaBudget.set(q.name, q.capacity);
  }

  // Group membership lookup
  const studentToGroup = new Map<string, string>();
  const groupMembersMap = new Map<string, string[]>();
  for (const g of groupDocs) {
    const gId = g._id.toString();
    const members = (g.members ?? []).map((m) => m.student_id.toString());
    groupMembersMap.set(gId, members);
    for (const m of members) {
      studentToGroup.set(m, gId);
    }
  }

  // Preferences map by studentId -> ordered list of hostel IDs
  const studentPreferences = new Map<string, string[]>();
  const sortedPrefs = [...prefDocs].sort((a, b) => a.rank - b.rank);
  for (const p of sortedPrefs) {
    const sId = p.student_id.toString();
    const list = studentPreferences.get(sId) ?? [];
    list.push(p.hostel_id.toString());
    studentPreferences.set(sId, list);
  }

  // Decrypt questionnaire answers inside the worker using CompatibilityReader
  // DO NOT LOG THESE ANSWERS
  const compatibilityReader = new CompatibilityReader(institutionId);

  const studentAppMap = new Map<string, Types.ObjectId>();
  const applicationStudentMap = new Map<string, Types.ObjectId>();

  const processedUnits = new Set<string>();
  const units: PriorityUnit[] = [];
  const unitsMap = new Map<string, Unit>();

  for (const app of appDocs) {
    const studentId = app.student_id.toString();
    const appId = app._id as Types.ObjectId;
    studentAppMap.set(studentId, appId);
    applicationStudentMap.set(appId.toString(), app.student_id as Types.ObjectId);

    const formData = (app.form_data ?? {}) as Record<string, unknown>;
    const cgpa = typeof formData.cgpa === "number" ? formData.cgpa : 8.0;
    const score = Math.round(cgpa * 10);
    const gender: Gender = formData.gender === "female" ? "female" : "male";
    const accessibilityNeed =
      app.priority_tier === "tier_1_pwd" ||
      Boolean(formData.accessibilityNeed || formData.accessibility_need);
    const hasHold = Boolean(formData.hasHold || formData.has_hold);
    const programme = typeof formData.programme === "string" ? formData.programme : "BTECH";
    const year = typeof formData.year === "number" ? formData.year : 1;
    const feeCategory = typeof formData.feeCategory === "string" ? formData.feeCategory : "general";
    const quotaBucket =
      typeof formData.quotaBucket === "string"
        ? formData.quotaBucket
        : typeof formData.category === "string"
          ? formData.category
          : "General";

    const groupId = studentToGroup.get(studentId);
    if (groupId) {
      if (processedUnits.has(groupId)) {
        continue;
      }
      processedUnits.add(groupId);

      const members = groupMembersMap.get(groupId) ?? [studentId];
      const primaryStudentId = [...members].sort()[0] ?? studentId;

      // Group answers and preferences from primary
      const answers = (await compatibilityReader.getDecryptedAnswers(primaryStudentId)) ?? {};
      const prefs =
        studentPreferences.get(primaryStudentId) ?? studentPreferences.get(studentId) ?? [];

      const unit: Unit = {
        id: primaryStudentId,
        memberIds: members,
        gender,
        programme,
        year,
        feeCategory,
        quotaBucket,
        hasHold,
        accessibilityNeed: false,
        preferenceHostelIds: prefs,
        questionnaire: answers,
        groupId,
      };

      unitsMap.set(unit.id, unit);
      units.push({
        unit,
        priorityTier: app.priority_tier || "tier_3_regular",
        priorityScore: score,
      });
    } else {
      if (processedUnits.has(studentId)) {
        continue;
      }
      processedUnits.add(studentId);

      // Decrypt in-memory without logging
      const answers = (await compatibilityReader.getDecryptedAnswers(studentId)) ?? {};
      const prefs = studentPreferences.get(studentId) ?? [];

      const unit: Unit = {
        id: studentId,
        memberIds: [studentId],
        gender,
        programme,
        year,
        feeCategory,
        quotaBucket,
        hasHold,
        accessibilityNeed,
        preferenceHostelIds: prefs,
        questionnaire: answers,
      };

      unitsMap.set(unit.id, unit);
      units.push({
        unit,
        priorityTier: app.priority_tier || "tier_3_regular",
        priorityScore: score,
      });
    }
  }

  const snapshot: Snapshot = {
    cycleId: cycleIdStr,
    hostels,
    rooms,
    beds,
    units: unitsMap,
    quotaBudget,
    quotaUsage: new Map(),
    assignments: new Map(),
    nowIso: new Date().toISOString(),
  };

  return { snapshot, units, studentAppMap, applicationStudentMap };
}

/**
 * Main worker job execution logic.
 */
export async function processAllocationJob(
  job: Job<AllocationJobPayload>,
  redis: Redis,
): Promise<{ runId: string; draftId?: string; metrics?: unknown }> {
  const { runId, cycleId, institutionId, seed, weightsVersion, dryRun = false } = job.data;
  log.info({ runId, cycleId, seed, dryRun }, "Processing allocation job");

  await connectDb();

  // 1. Mark run as running
  await AllocationRunModel.updateOne(
    { _id: new Types.ObjectId(runId) },
    {
      $set: {
        status: "running",
        started_at: new Date(),
        progress: {
          stage: "freeze",
          percent: 5,
          message: "Freezing snapshot and decrypting cohort data...",
        },
      },
    },
  );

  const emit = async (stage: AllocationStageCode, msg: string, curr?: number, tot?: number) => {
    const { percent, stageLabel } = computeProgress(stage, curr, tot);
    await emitProgress(redis, runId, {
      stageCode: stage,
      stageLabel,
      percent,
      message: msg,
      current: curr,
      total: tot,
    });
  };

  await emit("freeze", "Building snapshot from database...", 0, 1);

  if (await checkCancelled(redis, runId)) {
    throw new AllocationCancelledError();
  }

  // 2. Fetch weights
  let weights: Weights = { ...DEFAULT_WEIGHTS };
  if (weightsVersion) {
    const wv = await WeightsVersionModel.findOne({
      institution_id: new Types.ObjectId(institutionId),
      version_label: weightsVersion,
    }).exec();
    if (wv) {
      weights = { ...wv.weights };
      // Mark as used
      if (!wv.used) {
        await WeightsVersionModel.updateOne({ _id: wv._id }, { $set: { used: true } });
      }
    }
  }

  // 3. Build snapshot & units
  const { snapshot, units, studentAppMap } = await buildSnapshotAndUnits(institutionId, cycleId);
  await emit(
    "freeze",
    `Snapshot frozen with ${snapshot.beds.size} beds and ${units.length} priority units.`,
    1,
    1,
  );

  if (await checkCancelled(redis, runId)) {
    throw new AllocationCancelledError();
  }

  // 4. Run the pure allocation engine with live progress callbacks
  let result: AllocateResult;
  try {
    result = allocate(snapshot, units, {
      seed,
      weights,
      onProgress: (stage, current, total) => {
        // Asynchronous non-blocking emit
        const stageCode = (stage === "sort" ? "sort" : stage) as AllocationStageCode;
        void emit(
          stageCode,
          `Engine executing stage ${stageCode}: ${current}/${total}`,
          current,
          total,
        );
      },
    });
  } catch (err) {
    if (err instanceof InvariantError || (err as Error).name === "InvariantError") {
      log.error({ err, runId }, "Allocation engine invariant violated");
      await AllocationRunModel.updateOne(
        { _id: new Types.ObjectId(runId) },
        {
          $set: {
            status: "failed",
            error: (err as Error).message,
            completed_at: new Date(),
            progress: {
              stage: "invariants",
              percent: 92,
              message: `Invariant check failed: ${(err as Error).message}`,
            },
          },
        },
      );
      await emitProgress(redis, runId, {
        stageCode: "invariants",
        stageLabel: "Validate",
        percent: 92,
        message: `Engine invariant violated: ${(err as Error).message}`,
        error: (err as Error).message,
      });
      // Throw so BullMQ knows it failed
      throw err;
    }
    throw err;
  }

  if (await checkCancelled(redis, runId)) {
    throw new AllocationCancelledError();
  }

  await emit(
    "persist",
    "Persisting allocation draft and assignments in MongoDB transaction...",
    0,
    1,
  );

  // 5. Persist the result in ONE MongoDB transaction
  let createdDraftId: Types.ObjectId | undefined;

  if (dryRun) {
    await AllocationRunModel.updateOne(
      { _id: new Types.ObjectId(runId) },
      {
        $set: {
          status: "completed",
          metrics: result.metrics,
          input_hash: result.inputHash,
          completed_at: new Date(),
          progress: {
            stage: "persist",
            percent: 100,
            message: "Dry run completed successfully.",
          },
        },
      },
    );
  } else {
    await runInTransaction(async (session) => {
      // Find current version number for draft
      const draftCount = await AllocationDraftModel.countDocuments({
        institution_id: new Types.ObjectId(institutionId),
        cycle_id: new Types.ObjectId(cycleId),
      }).session(session);

      const [draft] = await AllocationDraftModel.create(
        [
          {
            institution_id: new Types.ObjectId(institutionId),
            cycle_id: new Types.ObjectId(cycleId),
            run_id: new Types.ObjectId(runId),
            status: "draft",
            version_number: draftCount + 1,
            input_hash: result.inputHash,
            seed,
            metrics: result.metrics,
          },
        ],
        { session },
      );

      if (!draft) throw new Error("Failed to create AllocationDraft");
      createdDraftId = draft._id as Types.ObjectId;

      // Prepare chunked assignments
      const assignmentsToInsert = [];
      for (const assignment of result.assignments) {
        const studentIdStr = assignment.unitId;
        const appId = studentAppMap.get(studentIdStr);
        if (!appId) continue;

        const bed = snapshot.beds.get(assignment.bedId);
        const room = bed ? snapshot.rooms.get(bed.roomId) : undefined;

        assignmentsToInsert.push({
          institution_id: new Types.ObjectId(institutionId),
          draft_id: createdDraftId,
          run_id: new Types.ObjectId(runId),
          application_id: appId,
          student_id: new Types.ObjectId(studentIdStr),
          bed_id: new Types.ObjectId(assignment.bedId),
          room_id: room ? new Types.ObjectId(room.id) : new Types.ObjectId(),
          hostel_id: room ? new Types.ObjectId(room.hostelId) : new Types.ObjectId(),
          score: assignment.score,
          explanation:
            typeof assignment.explanation === "object"
              ? (assignment.explanation?.sentence ?? JSON.stringify(assignment.explanation))
              : String(assignment.explanation ?? ""),
        });
      }

      // Chunked inserts inside same session (chunks of 500)
      const CHUNK_SIZE = 500;
      for (let i = 0; i < assignmentsToInsert.length; i += CHUNK_SIZE) {
        const chunk = assignmentsToInsert.slice(i, i + CHUNK_SIZE);
        await AllocationAssignmentModel.insertMany(chunk, { session, ordered: false });
      }

      // Prepare Waitlist entries
      const waitlistToInsert = [];
      for (let i = 0; i < result.waitlist.length; i++) {
        const entry = result.waitlist[i];
        if (!entry) continue;
        const studentIdStr = entry.unitId;
        const appId = studentAppMap.get(studentIdStr);
        if (!appId) continue;

        waitlistToInsert.push({
          institution_id: new Types.ObjectId(institutionId),
          draft_id: createdDraftId,
          run_id: new Types.ObjectId(runId),
          application_id: appId,
          student_id: new Types.ObjectId(studentIdStr),
          position: i + 1,
          quota_bucket: entry.quotaBucket,
          reason: entry.sentence || entry.reasonCode,
        });
      }

      if (waitlistToInsert.length > 0) {
        for (let i = 0; i < waitlistToInsert.length; i += CHUNK_SIZE) {
          const chunk = waitlistToInsert.slice(i, i + CHUNK_SIZE);
          await WaitlistEntryModel.insertMany(chunk, { session, ordered: false });
        }
      }

      // Update AllocationRun
      await AllocationRunModel.updateOne(
        { _id: new Types.ObjectId(runId) },
        {
          $set: {
            status: "completed",
            draft_id: createdDraftId,
            metrics: result.metrics,
            input_hash: result.inputHash,
            completed_at: new Date(),
            progress: {
              stage: "persist",
              percent: 100,
              message: `Run completed. Generated draft v${draft.version_number} with ${assignmentsToInsert.length} assignments.`,
            },
          },
        },
      ).session(session);
    });
  }

  await emitProgress(redis, runId, {
    stageCode: "persist",
    stageLabel: "Persist",
    percent: 100,
    message: dryRun
      ? "Dry run completed successfully."
      : `Allocation run complete. Draft ${createdDraftId?.toString()} published.`,
    completed: true,
  });

  return {
    runId,
    ...(createdDraftId ? { draftId: createdDraftId.toString() } : {}),
    metrics: result.metrics,
  };
}

/**
 * Instantiates BullMQ Worker for the "allocation" queue.
 */
export function setupAllocationWorker(redis: Redis): Worker<AllocationJobPayload> {
  const worker = new Worker<AllocationJobPayload>(
    ALLOCATION_QUEUE_NAME,
    async (job) => {
      try {
        return await processAllocationJob(job, redis);
      } catch (error) {
        if (error instanceof AllocationCancelledError) {
          log.info({ runId: job.data.runId }, "Allocation run cancelled");
          await AllocationRunModel.updateOne(
            { _id: new Types.ObjectId(job.data.runId) },
            {
              $set: {
                status: "cancelled",
                cancelled_at: new Date(),
                progress: {
                  stage: "persist",
                  percent: 0,
                  message: "Allocation run was cancelled.",
                },
              },
            },
          );
          await emitProgress(redis, job.data.runId, {
            stageCode: "persist",
            stageLabel: "Cancelled",
            percent: 0,
            message: "Allocation run cancelled.",
            cancelled: true,
          });
          return { runId: job.data.runId, cancelled: true };
        }
        throw error;
      }
    },
    {
      connection: redis as never,
      concurrency: 2,
    },
  );

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, err }, "Allocation job failed");
  });

  worker.on("completed", (job) => {
    log.info({ jobId: job.id }, "Allocation job completed");
  });

  return worker;
}
