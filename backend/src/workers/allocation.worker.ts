import { Worker, Queue, type Job } from "bullmq";
import { Types } from "mongoose";
import { getRedisClient } from "../config/redis.js";
import { logger } from "../config/logger.js";
import {
  AllocationRunModel,
  AllocationDraftModel,
  AllocationAssignmentModel,
  WaitlistEntryModel,
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
  type Snapshot,
  type PriorityUnit,
  type Unit,
  type Hostel,
  type Room,
  type Bed,
  type BedStatus,
  type Gender,
} from "@hostelhub/domain";
import {
  ALLOCATION_QUEUE_NAME,
  getAllocationEventChannel,
  getAllocationCancelKey,
  STAGE_CONFIGS,
  type AllocationJobPayload,
  type AllocationProgressEvent,
  type AllocationStageCode,
} from "@hostelhub/shared";
import { eventBus } from "../events/domain-events.js";

export function createAllocationQueue(): Queue<AllocationJobPayload> {
  const redis = getRedisClient();
  return new Queue<AllocationJobPayload>(ALLOCATION_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });
}

export function startAllocationWorker(): Worker<AllocationJobPayload> {
  const redis = getRedisClient();

  const worker = new Worker<AllocationJobPayload>(
    ALLOCATION_QUEUE_NAME,
    async (job: Job<AllocationJobPayload>) => {
      const { runId, cycleId: cycleIdStr, institutionId: institutionIdStr, dryRun } = job.data;
      logger.info(
        { runId, cycleId: cycleIdStr, institutionId: institutionIdStr },
        "Starting allocation job processing",
      );

      const emitProgress = async (
        stageCode: AllocationStageCode,
        percent: number,
        message: string,
        error?: string,
      ) => {
        const fullEvent: AllocationProgressEvent = {
          runId,
          stageCode,
          stageLabel: STAGE_CONFIGS[stageCode]?.label ?? stageCode,
          percent,
          timestamp: new Date().toISOString(),
          message,
          error,
        };

        const channel = getAllocationEventChannel(runId);
        await redis.publish(channel, JSON.stringify(fullEvent));
        await job.updateProgress(percent);
      };

      try {
        await emitProgress("freeze", 10, "Freezing cycle snapshot and validating inputs...");

        const institutionId = new Types.ObjectId(institutionIdStr);
        const cycleId = new Types.ObjectId(cycleIdStr);

        const [
          cycle,
          hostelDocs,
          roomDocs,
          bedDocs,
          appDocs,
          prefDocs,
          groupDocs,
          walkingMinutesMap,
        ] = await Promise.all([
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
          throw new Error(`Cycle ${cycleIdStr} not found`);
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
          beds.set(b._id.toString(), {
            id: b._id.toString(),
            roomId: b.room_id.toString(),
            status,
            accessible: false,
          });
        }

        // 4. Quotas map
        const quotaBudget = new Map<string, number>();
        for (const q of cycle.quota_buckets ?? []) {
          quotaBudget.set(q.name, q.capacity);
        }

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

        const studentPreferences = new Map<string, string[]>();
        const sortedPrefs = [...prefDocs].sort((a, b) => a.rank - b.rank);
        for (const p of sortedPrefs) {
          const sId = p.student_id.toString();
          const list = studentPreferences.get(sId) ?? [];
          list.push(p.hostel_id.toString());
          studentPreferences.set(sId, list);
        }

        const compatibilityReader = new CompatibilityReader(institutionId);
        const processedUnits = new Set<string>();
        const units: PriorityUnit[] = [];
        const unitsMap = new Map<string, Unit>();
        const studentAppMap = new Map<string, Types.ObjectId>();

        for (const app of appDocs) {
          const studentId = app.student_id.toString();
          const appId = app._id as Types.ObjectId;
          studentAppMap.set(studentId, appId);

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
          const feeCategory =
            typeof formData.feeCategory === "string" ? formData.feeCategory : "general";
          const quotaBucket =
            typeof formData.quotaBucket === "string"
              ? formData.quotaBucket
              : typeof formData.category === "string"
                ? formData.category
                : "General";

          if (processedUnits.has(studentId)) continue;
          processedUnits.add(studentId);

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

        await emitProgress("assign", 50, "Executing matching and soft scoring...");

        const isCancelled = await redis.get(getAllocationCancelKey(runId));
        if (isCancelled) {
          throw new Error("Allocation run cancelled by user.");
        }

        const seedNum =
          typeof job.data.seed === "number" ? job.data.seed : parseInt(runId.slice(-8), 16) || 42;
        const result = allocate(snapshot, units, {
          seed: seedNum,
          weights: DEFAULT_WEIGHTS,
        });

        await emitProgress("invariants", 80, "Validating invariants and persisting draft...");

        if (!dryRun) {
          const draft = await AllocationDraftModel.create({
            institution_id: institutionId,
            cycle_id: cycleId,
            run_id: new Types.ObjectId(runId),
            status: "DRAFT_READY",
            summary: {
              total_applicants: units.length,
              allocated_count: result.assignments.length,
              waitlisted_count: result.waitlist.length,
              unassigned_count: result.rejected.length,
            },
          });

          const assignmentDocs = result.assignments.map((a) => {
            const studentId = a.unitId;
            const appId = studentAppMap.get(studentId) ?? new Types.ObjectId();
            return {
              institution_id: institutionId,
              cycle_id: cycleId,
              draft_id: draft._id,
              application_id: appId,
              student_id: new Types.ObjectId(studentId),
              bed_id: new Types.ObjectId(a.bedId),
              room_id: new Types.ObjectId(a.roomId),
              hostel_id: new Types.ObjectId(a.hostelId),
              status: "proposed",
              score: a.score,
              explanation: a.explanation,
            };
          });

          if (assignmentDocs.length > 0) {
            await AllocationAssignmentModel.insertMany(assignmentDocs);
          }

          const waitlistDocs = result.waitlist.map((w, idx) => ({
            institution_id: institutionId,
            cycle_id: cycleId,
            application_id: studentAppMap.get(w.unitId) ?? new Types.ObjectId(),
            student_id: new Types.ObjectId(w.unitId),
            position: idx + 1,
            priority_score: w.priorityKey,
            status: "waiting",
          }));

          if (waitlistDocs.length > 0) {
            await WaitlistEntryModel.insertMany(waitlistDocs);
          }

          await AllocationRunModel.findByIdAndUpdate(runId, {
            status: "completed",
            completed_at: new Date(),
          });

          eventBus.publish({
            type: "run.completed",
            institutionId: institutionIdStr,
            timestamp: new Date(),
            payload: {
              runId,
              draftId: draft._id.toString(),
              assignmentsCount: result.assignments.length,
            },
          });
        }

        await emitProgress(
          "persist",
          100,
          `Allocation run finished. ${result.assignments.length} assigned.`,
        );

        logger.info(
          { runId, assigned: result.assignments.length },
          "Allocation run completed successfully",
        );
        return { success: true, assignmentsCount: result.assignments.length };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error({ err, runId }, "Allocation worker run failed");
        await AllocationRunModel.findByIdAndUpdate(runId, {
          status: "failed",
          error_message: errMsg,
        });

        await emitProgress("persist", 100, `Allocation failed: ${errMsg}`, errMsg);
        throw err;
      }
    },
    {
      connection: redis,
      concurrency: 2,
    },
  );

  return worker;
}
