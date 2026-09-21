import { Types } from "mongoose";
import { randomInt } from "node:crypto";
import {
  allocate,
  DEFAULT_WEIGHTS,
  compareScenarios,
  calculateGini,
  calculateQuotaFairness,
  detectPriorityInversions,
  calculateCompatibilityStats,
  type Snapshot,
  type PriorityUnit,
  type Unit,
  type Gender,
  type Hostel,
  type Room,
  type Bed,
  type BedStatus,
  type Weights,
  type ScenarioDefinition,
  type SimulationResult,
  type StudentPlacementOutcome,
  type ScenarioComparison,
  type AssignmentUnitFairnessInput,
} from "@hostelhub/domain";

import { AllocationCycleModel } from "../models/allocation-cycle.model.js";
import { HostelModel } from "../models/hostel.model.js";
import { BlockModel } from "../models/block.model.js";
import { RoomModel } from "../models/room.model.js";
import { BedModel } from "../models/bed.model.js";
import { ApplicationModel } from "../models/application.model.js";
import { PreferenceModel } from "../models/preference.model.js";
import { GroupModel } from "../models/group.model.js";
import { WeightsVersionModel } from "../models/weights-version.model.js";
import { AllocationRunModel } from "../models/allocation-run.model.js";
import { AllocationDraftModel } from "../models/allocation-draft.model.js";
import {
  SimulationBatchModel,
  type SimulationBatchDocument,
} from "../models/simulation-batch.model.js";
import { CompatibilityReader } from "./compatibility-reader.js";
import { AuditService } from "./audit.service.js";

export interface RunSimulationBatchParams {
  cycleId: string;
  baseRunId?: string | undefined;
  seed?: number | undefined;
  scenarios: ScenarioDefinition[];
}

export interface SimulationActor {
  id: string;
  email: string;
  role: string;
}

export interface ScenarioOptions {
  cycleId: string;
  cycleName: string;
  hostels: Array<{ id: string; name: string }>;
  blocks: Array<{ id: string; name: string; hostelId: string }>;
  quotaBuckets: Array<{ name: string; capacity: number }>;
  weightsVersions: Array<{ id: string; name: string; version: string }>;
}

export class SimulatorService {
  private getAudit(institutionId: Types.ObjectId | string): AuditService {
    return new AuditService(new Types.ObjectId(institutionId));
  }

  /**
   * Builds an in-memory Snapshot for a cycle without modifying any live data.
   */
  async buildBaseSnapshot(
    institutionId: string,
    cycleIdStr: string,
  ): Promise<{
    snapshot: Snapshot;
    priorityUnits: PriorityUnit[];
    studentMetaMap: Map<
      string,
      { name: string; rollNumber: string; quota: string; priorityScore: number }
    >;
    roomLookup: Map<string, { roomNumber: string; hostelId: string; hostelName: string }>;
  }> {
    const instId = new Types.ObjectId(institutionId);
    const cycleId = new Types.ObjectId(cycleIdStr);

    const [cycle, hostelDocs, roomDocs, bedDocs, appDocs, prefDocs, groupDocs] = await Promise.all([
      AllocationCycleModel.findById(cycleId).exec(),
      HostelModel.find({ institution_id: instId }).lean(),
      RoomModel.find({ institution_id: instId }).lean(),
      BedModel.find({
        institution_id: instId,
        status: { $in: ["available", "reserved", "held"] },
      }).lean(),
      ApplicationModel.find({
        institution_id: instId,
        cycle_id: cycleId,
        status: { $in: ["submitted", "under_review", "approved"] },
      })
        .populate<{ student_id: { _id: Types.ObjectId; name?: string; roll_number?: string } }>(
          "student_id",
        )
        .lean(),
      PreferenceModel.find({ institution_id: instId }).lean(),
      GroupModel.find({
        institution_id: instId,
        cycle_id: cycleId,
        status: "confirmed",
      }).lean(),
    ]);

    if (!cycle) {
      throw new Error(`Allocation cycle not found: ${cycleIdStr}`);
    }

    // 1. Hostels map
    const hostels = new Map<string, Hostel>();
    const hostelNameMap = new Map<string, string>();
    for (const h of hostelDocs) {
      const hId = h._id.toString();
      hostelNameMap.set(hId, h.name);
      hostels.set(hId, {
        id: hId,
        name: h.name,
        genderPolicy: h.gender_policy,
        walkingMinutes: 5,
      });
    }

    // 2. Rooms map & room lookup
    const rooms = new Map<string, Room>();
    const roomLookup = new Map<
      string,
      { roomNumber: string; hostelId: string; hostelName: string }
    >();
    for (const r of roomDocs) {
      const rId = r._id.toString();
      const hId = r.hostel_id.toString();
      const hName = hostelNameMap.get(hId) || "Hostel";

      roomLookup.set(rId, {
        roomNumber: r.room_number,
        hostelId: hId,
        hostelName: hName,
      });

      rooms.set(rId, {
        id: rId,
        hostelId: hId,
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
      const bId = b._id.toString();
      const rId = b.room_id.toString();
      const status: BedStatus = b.status === "held" ? "reserved" : (b.status as BedStatus);
      const accessible = Boolean(
        b.attributes &&
        typeof b.attributes === "object" &&
        (b.attributes as Record<string, unknown>)["accessible"],
      );
      beds.set(bId, {
        id: bId,
        roomId: rId,
        status,
        accessible,
      });
    }

    // 4. Quotas map
    const quotaBudget = new Map<string, number>();
    for (const q of cycle.quota_buckets ?? []) {
      quotaBudget.set(q.name, q.capacity);
    }

    // 5. Preferences map
    const studentPreferences = new Map<string, string[]>();
    const sortedPrefs = [...prefDocs].sort((a, b) => a.rank - b.rank);
    for (const p of sortedPrefs) {
      const sId = p.student_id.toString();
      const list = studentPreferences.get(sId) ?? [];
      list.push(p.hostel_id.toString());
      studentPreferences.set(sId, list);
    }

    // 6. Group mapping
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

    // 7. Student metadata & priority units
    const compatibilityReader = new CompatibilityReader(institutionId);
    const priorityUnits: PriorityUnit[] = [];
    const unitsMap = new Map<string, Unit>();
    const studentMetaMap = new Map<
      string,
      { name: string; rollNumber: string; quota: string; priorityScore: number }
    >();

    for (const app of appDocs) {
      const sId = app.student_id
        ? app.student_id._id
          ? app.student_id._id.toString()
          : app.student_id.toString()
        : app._id.toString();
      const studentName =
        app.student_id && typeof app.student_id === "object" && "name" in app.student_id
          ? String(app.student_id.name || "Student")
          : "Student";
      const rollNo =
        app.student_id && typeof app.student_id === "object" && "roll_number" in app.student_id
          ? String(app.student_id.roll_number || "")
          : "";

      const appRec = app as unknown as Record<string, unknown>;
      const formData = app.form_data as Record<string, unknown> | undefined;
      const quota =
        (typeof appRec["quota_category"] === "string" ? appRec["quota_category"] : undefined) ||
        (typeof formData?.["quota_category"] === "string"
          ? formData["quota_category"]
          : undefined) ||
        (typeof formData?.["quota_bucket"] === "string" ? formData["quota_bucket"] : undefined) ||
        "General";

      const priorityScore =
        typeof appRec["priority_score"] === "number"
          ? (appRec["priority_score"] as number)
          : typeof formData?.["priority_score"] === "number"
            ? (formData["priority_score"] as number)
            : 75;

      studentMetaMap.set(sId, {
        name: studentName,
        rollNumber: rollNo,
        quota,
        priorityScore,
      });

      const gender =
        (app.form_data as Record<string, unknown> | undefined)?.["gender"] === "female"
          ? "female"
          : "male";
      const specialNeeds = Boolean(
        (app.form_data as Record<string, unknown> | undefined)?.["has_disability"],
      );
      const prefs = studentPreferences.get(sId) ?? [];

      const answers = (await compatibilityReader.getDecryptedAnswers(sId)) ?? {};

      const unit: Unit = {
        id: sId,
        memberIds: [sId],
        gender: gender as Gender,
        programme: "BTech",
        year: 1,
        feeCategory: "regular",
        quotaBucket: quota,
        hasHold: false,
        accessibilityNeed: specialNeeds,
        preferenceHostelIds: prefs,
        questionnaire: answers,
      };

      unitsMap.set(unit.id, unit);
      priorityUnits.push({
        unit,
        priorityTier: app.priority_tier || "tier_3_regular",
        priorityScore,
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
      nowIso: cycle.window_open ? cycle.window_open.toISOString() : new Date().toISOString(),
    };

    return { snapshot, priorityUnits, studentMetaMap, roomLookup };
  }

  /**
   * Applies scenario configuration overrides to an in-memory clone of a Snapshot and PriorityUnits.
   */
  applyScenarioOverrides(
    baseSnapshot: Snapshot,
    baseUnits: PriorityUnit[],
    scenario: ScenarioDefinition,
  ): { clonedSnapshot: Snapshot; clonedUnits: PriorityUnit[]; weights: Weights } {
    // 1. Deep clone hostels
    const hostels = new Map<string, Hostel>();
    const closedHostels = new Set(scenario.capacityOverrides?.closedHostelIds ?? []);
    for (const [id, h] of baseSnapshot.hostels) {
      if (!closedHostels.has(id)) {
        hostels.set(id, { ...h });
      }
    }

    // 2. Deep clone rooms, filtering closed blocks, hostels, or individual rooms
    const rooms = new Map<string, Room>();
    const closedBlocks = new Set(scenario.capacityOverrides?.closedBlockIds ?? []);
    const closedRooms = new Set(scenario.capacityOverrides?.closedRoomIds ?? []);

    for (const [id, r] of baseSnapshot.rooms) {
      if (!closedHostels.has(r.hostelId) && !closedBlocks.has(r.block) && !closedRooms.has(id)) {
        rooms.set(id, { ...r });
      }
    }

    // 3. Deep clone beds, retaining only beds belonging to open rooms
    const beds = new Map<string, Bed>();
    for (const [id, b] of baseSnapshot.beds) {
      if (rooms.has(b.roomId)) {
        const bedClone = { ...b };
        // If accessibilityReservationDate specified, adjust reservation
        if (scenario.accessibilityReservationDate) {
          const cutoff = new Date(scenario.accessibilityReservationDate).getTime();
          const snapshotDate = new Date(baseSnapshot.nowIso).getTime();
          if (snapshotDate > cutoff && bedClone.accessible && bedClone.status === "reserved") {
            // Cutoff has passed: release unallocated reserved accessible bed to general availability
            bedClone.status = "available";
          }
        }
        beds.set(id, bedClone);
      }
    }

    // 4. Deep clone quotaBudget and apply overrides
    const quotaBudget = new Map<string, number>(baseSnapshot.quotaBudget);
    if (scenario.quotaOverrides) {
      for (const [category, capacity] of Object.entries(scenario.quotaOverrides)) {
        quotaBudget.set(category, Math.max(0, capacity));
      }
    }

    // 5. Clone priorityUnits and units map
    const clonedUnits: PriorityUnit[] = baseUnits.map((pu) => ({
      ...pu,
      unit: {
        ...pu.unit,
        memberIds: [...pu.unit.memberIds],
        preferenceHostelIds: [...pu.unit.preferenceHostelIds],
      },
    }));

    const unitsMap = new Map<string, Unit>();
    for (const pu of clonedUnits) {
      unitsMap.set(pu.unit.id, pu.unit);
    }

    const clonedSnapshot: Snapshot = {
      cycleId: baseSnapshot.cycleId,
      hostels,
      rooms,
      beds,
      units: unitsMap,
      quotaBudget,
      quotaUsage: new Map(),
      assignments: new Map(),
      nowIso: baseSnapshot.nowIso,
    };

    // 6. Resolve weights
    const weights: Weights = {
      ...DEFAULT_WEIGHTS,
      ...(scenario.customWeights || {}),
    };

    return { clonedSnapshot, clonedUnits, weights };
  }

  /**
   * Executes a simulation batch of up to 3 scenarios in parallel using the same seed.
   */
  async runSimulationBatch(
    institutionId: string,
    params: RunSimulationBatchParams,
    actor: SimulationActor,
  ): Promise<{ batchId: string; comparison: ScenarioComparison; scenarios: SimulationResult[] }> {
    const instId = new Types.ObjectId(institutionId);
    const cycleId = new Types.ObjectId(params.cycleId);

    if (!params.scenarios || params.scenarios.length === 0) {
      throw new Error("At least one scenario must be provided for simulation.");
    }
    if (params.scenarios.length > 3) {
      throw new Error("Maximum of 3 scenarios can be simulated in parallel.");
    }

    // 1. Shared seed across all scenarios
    const seed = params.seed !== undefined ? params.seed : randomInt(1, 2147483647);

    // 2. Build base in-memory snapshot
    const {
      snapshot: baseSnapshot,
      priorityUnits: basePriorityUnits,
      studentMetaMap,
      roomLookup,
    } = await this.buildBaseSnapshot(institutionId, params.cycleId);

    // 3. Run all scenarios in parallel with Promise.all
    const simulationPromises = params.scenarios.map(async (scenario, index) => {
      const startTime = Date.now();
      const { clonedSnapshot, clonedUnits, weights } = this.applyScenarioOverrides(
        baseSnapshot,
        basePriorityUnits,
        scenario,
      );

      // Deterministic allocation with identical seed
      const result = allocate(clonedSnapshot, clonedUnits, { seed, weights });
      const durationMs = Date.now() - startTime;

      // Save AllocationRun with dry_run = true
      const runDoc = await AllocationRunModel.create({
        institution_id: instId,
        cycle_id: cycleId,
        created_by: new Types.ObjectId(actor.id),
        seed,
        weights_version: scenario.weightsVersion || "scenario_weights",
        rules_version: "1.0",
        engine_version: "1.0.0",
        status: "completed",
        metrics: result.metrics,
        input_hash: result.inputHash,
        dry_run: true,
        started_at: new Date(startTime),
        completed_at: new Date(),
        progress: {
          stage: "persist",
          percent: 100,
          message: `Simulation scenario ${scenario.name} finished in ${durationMs}ms`,
        },
      });

      // Save AllocationDraft with dry_run = true
      const draftDoc = await AllocationDraftModel.create({
        institution_id: instId,
        cycle_id: cycleId,
        run_id: runDoc._id,
        status: "DRAFT_READY",
        version_number: index + 1,
        input_hash: result.inputHash,
        seed,
        metrics: result.metrics,
        dry_run: true,
        scenario_name: scenario.name,
      });

      // Build outcomes map
      const outcomes: Record<string, StudentPlacementOutcome> = {};

      for (const asg of result.assignments) {
        const studentId = asg.unitId;
        const meta = studentMetaMap.get(studentId) || {
          name: "Student",
          rollNumber: "",
          quota: "General",
          priorityScore: 70,
        };
        const rInfo = roomLookup.get(asg.roomId);

        outcomes[studentId] = {
          studentId,
          studentName: meta.name,
          rollNumber: meta.rollNumber,
          quotaCategory: meta.quota,
          priorityScore: meta.priorityScore,
          status: "placed",
          hostelId: rInfo?.hostelId,
          hostelName: rInfo?.hostelName,
          roomId: asg.roomId,
          roomNumber: rInfo?.roomNumber,
          bedId: asg.bedId,
          rankSatisfied: asg.explanation?.rankSatisfied ?? null,
          score: asg.score,
        };
      }

      result.waitlist.forEach((wl, idx) => {
        const studentId = wl.unitId;
        const meta = studentMetaMap.get(studentId) || {
          name: "Student",
          rollNumber: "",
          quota: "General",
          priorityScore: 70,
        };

        outcomes[studentId] = {
          studentId,
          studentName: meta.name,
          rollNumber: meta.rollNumber,
          quotaCategory: meta.quota,
          priorityScore: meta.priorityScore,
          status: "waitlisted",
          waitlistRank: idx + 1,
        };
      });

      result.rejected.forEach((rej) => {
        const studentId = rej.unitId;
        const meta = studentMetaMap.get(studentId) || {
          name: "Student",
          rollNumber: "",
          quota: "General",
          priorityScore: 70,
        };

        outcomes[studentId] = {
          studentId,
          studentName: meta.name,
          rollNumber: meta.rollNumber,
          quotaCategory: meta.quota,
          priorityScore: meta.priorityScore,
          status: "rejected",
        };
      });

      // Compute pure fairness metrics
      const fairnessUnits: AssignmentUnitFairnessInput[] = Object.values(outcomes).map((o) => ({
        unitId: o.studentId,
        quotaBucket: o.quotaCategory,
        priorityTier: "P2",
        priorityScore: o.priorityScore,
        rankSatisfied: o.status === "placed" ? (o.rankSatisfied ?? 1) : null,
        score: o.score ?? 70,
      }));

      const scores = result.assignments.map((a) => a.score);
      const gini = calculateGini(scores);
      const { categoryParityGap, overallFirstChoiceRate } = calculateQuotaFairness(fairnessUnits);
      const inversionResult = detectPriorityInversions(fairnessUnits);
      const compatStats = calculateCompatibilityStats(scores.map((s) => Math.min(1, s / 100)));

      const simResult: SimulationResult = {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        description: scenario.description,
        config: scenario,
        runId: runDoc._id.toString(),
        draftId: draftDoc._id.toString(),
        seed,
        durationMs,
        metrics: result.metrics,
        totalPlaced: result.assignments.length,
        totalWaitlisted: result.waitlist.length,
        firstChoiceRate: overallFirstChoiceRate,
        meanCompatibility: compatStats.meanCompatibility,
        parityGap: categoryParityGap,
        priorityInversions: inversionResult.count,
        giniCoefficient: gini,
        outcomes,
      };

      return simResult;
    });

    const scenarioResults = await Promise.all(simulationPromises);

    // 4. Generate side-by-side comparison
    const comparison = compareScenarios(scenarioResults);

    // 5. Persist SimulationBatch document
    const batchDoc: SimulationBatchDocument = await SimulationBatchModel.create({
      institution_id: instId,
      base_cycle_id: cycleId,
      base_run_id: params.baseRunId ? new Types.ObjectId(params.baseRunId) : undefined,
      seed,
      scenarios: scenarioResults.map((s) => ({
        scenario_id: s.scenarioId,
        name: s.scenarioName,
        description: s.description,
        config: s.config,
        run_id: new Types.ObjectId(s.runId),
        draft_id: s.draftId ? new Types.ObjectId(s.draftId) : undefined,
        metrics: s.metrics,
      })),
      comparison,
      created_by: new Types.ObjectId(actor.id),
      status: "completed",
    });

    // 6. Audit every simulation in the hash chain
    await this.getAudit(instId).append({
      actor: { user_id: actor.id, email: actor.email, roles: [actor.role] },
      action: "SIMULATION_EXECUTED",
      target: {
        batch_id: batchDoc._id.toString(),
        cycle_id: cycleId.toString(),
      },
      after: {
        seed,
        scenarios_count: scenarioResults.length,
        scenario_names: scenarioResults.map((s) => s.scenarioName),
        divergent_students_count: comparison.divergentStudentsCount,
      },
    });

    return {
      batchId: batchDoc._id.toString(),
      comparison,
      scenarios: scenarioResults,
    };
  }

  /**
   * Retrieves a saved simulation batch and its comparison view.
   */
  async getSimulationBatch(
    institutionId: string,
    batchId: string,
  ): Promise<SimulationBatchDocument | null> {
    const instId = new Types.ObjectId(institutionId);
    return SimulationBatchModel.findOne({
      _id: new Types.ObjectId(batchId),
      institution_id: instId,
    }).lean<SimulationBatchDocument>();
  }

  /**
   * Retrieves available options (hostels, blocks, quotas, weights) for the scenario builder.
   */
  async getScenarioOptions(
    institutionId: string,
    cycleIdStr?: string | undefined,
  ): Promise<ScenarioOptions> {
    const instId = new Types.ObjectId(institutionId);
    let cycle = null;
    if (cycleIdStr) {
      cycle = await AllocationCycleModel.findById(new Types.ObjectId(cycleIdStr)).lean();
    } else {
      cycle = await AllocationCycleModel.findOne({ institution_id: instId })
        .sort({ createdAt: -1 })
        .lean();
    }

    const [hostels, blocks, weights] = await Promise.all([
      HostelModel.find({ institution_id: instId }).select("_id name").lean(),
      BlockModel.find({ institution_id: instId }).select("_id name hostel_id").lean(),
      WeightsVersionModel.find({ institution_id: instId }).select("_id name version").lean(),
    ]);

    if (!cycle) {
      return {
        cycleId: cycleIdStr || "",
        cycleName: "No Active Cycle",
        hostels: hostels.map((h) => ({ id: h._id.toString(), name: h.name })),
        blocks: blocks.map((b) => ({
          id: b._id.toString(),
          name: b.name,
          hostelId: b.hostel_id.toString(),
        })),
        quotaBuckets: [],
        weightsVersions: weights.map((w) => ({
          id: w._id.toString(),
          name: w.description || w.version_label,
          version: w.version_label,
        })),
      };
    }

    return {
      cycleId: cycle._id.toString(),
      cycleName: cycle.name || cycle.academic_year || "Current Cycle",
      hostels: hostels.map((h) => ({ id: h._id.toString(), name: h.name })),
      blocks: blocks.map((b) => ({
        id: b._id.toString(),
        name: b.name,
        hostelId: b.hostel_id.toString(),
      })),
      quotaBuckets: (cycle.quota_buckets ?? []).map((q) => ({
        name: q.name,
        capacity: q.capacity,
      })),
      weightsVersions: weights.map((w) => ({
        id: w._id.toString(),
        name: w.description || w.version_label,
        version: w.version_label,
      })),
    };
  }
}
