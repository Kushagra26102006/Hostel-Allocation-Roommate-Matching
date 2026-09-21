import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Types } from "mongoose";
import { setupTestDatabase, teardownTestDatabase } from "./test-helper.js";
import {
  AllocationCycleModel,
  AllocationDraftModel,
  AllocationRunModel,
  HostelModel,
  BlockModel,
  RoomModel,
  BedModel,
  ApplicationModel,
  PreferenceModel,
  InstitutionModel,
  UserModel,
  DraftWorkflowService,
  WorkflowError,
  SimulatorService,
  SimulationBatchModel,
  AuditEntryModel,
} from "../index.js";

describe("Prompt 26: What-If Simulator Integration Tests", () => {
  let institutionId: Types.ObjectId;
  let cycleId: Types.ObjectId;
  let hostelId: Types.ObjectId;
  let block1Id: Types.ObjectId;
  let block2Id: Types.ObjectId;
  let simulatorService: SimulatorService;
  let workflowService: DraftWorkflowService;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await InstitutionModel.deleteMany({});
    await AllocationCycleModel.deleteMany({});
    await AllocationRunModel.deleteMany({});
    await AllocationDraftModel.deleteMany({});
    await SimulationBatchModel.deleteMany({});
    await HostelModel.deleteMany({});
    await BlockModel.deleteMany({});
    await RoomModel.deleteMany({});
    await BedModel.deleteMany({});
    await ApplicationModel.deleteMany({});
    await PreferenceModel.deleteMany({});
    await UserModel.deleteMany({});

    institutionId = new Types.ObjectId();
    cycleId = new Types.ObjectId();
    hostelId = new Types.ObjectId();
    block1Id = new Types.ObjectId();
    block2Id = new Types.ObjectId();

    await InstitutionModel.create({
      _id: institutionId,
      name: "Test University",
      code: `TEST_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
      domain: "test.edu",
    });

    await AllocationCycleModel.create({
      _id: cycleId,
      institution_id: institutionId,
      name: "Fall 2026 Regular Allocation",
      academic_year: "2026-2027",
      semester: "autumn",
      status: "draft",
      window_open: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      window_close: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      quota_buckets: [
        { name: "General", capacity: 10 },
        { name: "OBC", capacity: 5 },
      ],
    });

    await HostelModel.create({
      _id: hostelId,
      institution_id: institutionId,
      name: "Aryabhata Hall",
      gender_policy: "coed",
      address: "Campus North",
      status: "active",
    });

    await BlockModel.create([
      {
        _id: block1Id,
        institution_id: institutionId,
        hostel_id: hostelId,
        name: "Block A",
        floor_no: 1,
        wing: "North",
      },
      {
        _id: block2Id,
        institution_id: institutionId,
        hostel_id: hostelId,
        name: "Block B",
        floor_no: 1,
        wing: "South",
      },
    ]);

    // Create 4 rooms: 2 in Block A, 2 in Block B
    const roomA1 = new Types.ObjectId();
    const roomA2 = new Types.ObjectId();
    const roomB1 = new Types.ObjectId();
    const roomB2 = new Types.ObjectId();

    await RoomModel.create([
      {
        _id: roomA1,
        institution_id: institutionId,
        hostel_id: hostelId,
        block_id: block1Id,
        room_number: "A-101",
        capacity: 2,
        room_type: "double",
        floor: 1,
      },
      {
        _id: roomA2,
        institution_id: institutionId,
        hostel_id: hostelId,
        block_id: block1Id,
        room_number: "A-102",
        capacity: 2,
        room_type: "double",
        floor: 1,
      },
      {
        _id: roomB1,
        institution_id: institutionId,
        hostel_id: hostelId,
        block_id: block2Id,
        room_number: "B-101",
        capacity: 2,
        room_type: "double",
        floor: 1,
      },
      {
        _id: roomB2,
        institution_id: institutionId,
        hostel_id: hostelId,
        block_id: block2Id,
        room_number: "B-102",
        capacity: 2,
        room_type: "double",
        floor: 1,
      },
    ]);

    // Create 8 beds (4 in Block A, 4 in Block B)
    const bedDocs: Array<Record<string, unknown>> = [];
    for (const [rId, prefix] of [
      [roomA1, "A101"],
      [roomA2, "A102"],
      [roomB1, "B101"],
      [roomB2, "B102"],
    ] as const) {
      for (let i = 1; i <= 2; i++) {
        bedDocs.push({
          institution_id: institutionId,
          room_id: rId,
          bed_no: `${prefix}-${i}`,
          status: "available",
        });
      }
    }
    await BedModel.create(bedDocs);

    // Create 6 student applications
    for (let i = 1; i <= 6; i++) {
      const sId = new Types.ObjectId();
      await UserModel.create({
        _id: sId,
        institution_id: institutionId,
        email: `student${i}@test.edu`,
        name: `Student ${i}`,
        roles: ["student"],
      });

      const appDoc = await ApplicationModel.create({
        institution_id: institutionId,
        cycle_id: cycleId,
        student_id: sId,
        status: "approved",
        reference_number: `APP-2026-00${i}`,
        priority_tier: "general",
        form_data: {
          quota_category: i <= 4 ? "General" : "OBC",
          gender: i % 2 === 0 ? "female" : "male",
        },
      });

      await PreferenceModel.create({
        institution_id: institutionId,
        application_id: appDoc._id,
        student_id: sId,
        hostel_id: hostelId,
        room_type: "double",
        rank: 1,
      });
    }

    simulatorService = new SimulatorService();
    workflowService = new DraftWorkflowService();
  });

  describe("Requirement 1: Dry-Run Drafts Safety Invariant", () => {
    it("prevents approving a dry-run draft at the service layer", async () => {
      const runId = new Types.ObjectId();
      const dryDraft = await AllocationDraftModel.create({
        institution_id: institutionId,
        cycle_id: cycleId,
        run_id: runId,
        status: "DRAFT_READY",
        input_hash: "dummy_hash",
        seed: 12345,
        dry_run: true,
      });

      const approver = {
        id: new Types.ObjectId().toString(),
        email: "warden@test.edu",
        role: "warden" as const,
      };

      await expect(workflowService.approveDraft(dryDraft._id, approver)).rejects.toThrowError(
        WorkflowError,
      );

      await expect(workflowService.approveDraft(dryDraft._id, approver)).rejects.toThrow(
        "A dry-run draft cannot be approved or published",
      );
    });

    it("prevents publishing a dry-run draft at the service layer", async () => {
      const runId = new Types.ObjectId();
      const dryDraft = await AllocationDraftModel.create({
        institution_id: institutionId,
        cycle_id: cycleId,
        run_id: runId,
        status: "DRAFT_READY",
        input_hash: "dummy_hash",
        seed: 12345,
        dry_run: true,
      });

      const actor = {
        id: new Types.ObjectId().toString(),
        email: "chief@test.edu",
        role: "chief_warden" as const,
      };

      await expect(workflowService.publishDraft(dryDraft._id, actor)).rejects.toThrow(
        "A dry-run draft cannot be approved or published",
      );
    });

    it("prevents approving or publishing a dry-run draft at the database validation layer (schema & pre-save)", async () => {
      const runId = new Types.ObjectId();
      const dryDraft = new AllocationDraftModel({
        institution_id: institutionId,
        cycle_id: cycleId,
        run_id: runId,
        status: "APPROVED", // Illegal for dry_run
        input_hash: "dummy_hash",
        seed: 12345,
        dry_run: true,
      });

      await expect(dryDraft.save()).rejects.toThrow(
        /Database validation failed: a dry-run draft cannot be approved or published/,
      );
    });

    it("prevents updating an existing dry-run draft to APPROVED or PUBLISHED via updateOne", async () => {
      const runId = new Types.ObjectId();
      const dryDraft = await AllocationDraftModel.create({
        institution_id: institutionId,
        cycle_id: cycleId,
        run_id: runId,
        status: "DRAFT_READY",
        input_hash: "dummy_hash",
        seed: 12345,
        dry_run: true,
      });

      await expect(
        AllocationDraftModel.updateOne({ _id: dryDraft._id }, { status: "APPROVED" }),
      ).rejects.toThrow(
        /Database validation failed: a dry-run draft cannot be approved or published/,
      );

      await expect(
        AllocationDraftModel.updateOne({ _id: dryDraft._id }, { status: "PUBLISHED" }),
      ).rejects.toThrow(
        /Database validation failed: a dry-run draft cannot be approved or published/,
      );
    });
  });

  describe("Requirement 2 & 3: Determinism & Non-Mutating Scenarios", () => {
    it("identical scenarios give identical results when executed with the same seed", async () => {
      const actor = {
        id: new Types.ObjectId().toString(),
        email: "chief@test.edu",
        role: "chief_warden",
      };

      const result = await simulatorService.runSimulationBatch(
        institutionId.toString(),
        {
          cycleId: cycleId.toString(),
          seed: 424242,
          scenarios: [
            { id: "sc-1", name: "Scenario 1: Base Config" },
            { id: "sc-2", name: "Scenario 2: Exact Duplicate" },
          ],
        },
        actor,
      );

      expect(result.scenarios).toHaveLength(2);
      const sc1 = result.scenarios[0]!;
      const sc2 = result.scenarios[1]!;

      // Verify exact equality of deterministic allocations
      expect(sc1.totalPlaced).toBe(sc2.totalPlaced);
      expect(sc1.totalWaitlisted).toBe(sc2.totalWaitlisted);
      expect(sc1.firstChoiceRate).toBe(sc2.firstChoiceRate);
      expect(sc1.giniCoefficient).toBe(sc2.giniCoefficient);
      expect(sc1.priorityInversions).toBe(0);
      expect(sc2.priorityInversions).toBe(0);

      // Verify zero divergence across identical scenarios
      expect(result.comparison.divergentStudentsCount).toBe(0);
      expect(result.comparison.divergentStudents).toHaveLength(0);
    });

    it("scenarios do not modify live data (beds, cycles, drafts remain untouched)", async () => {
      const actor = {
        id: new Types.ObjectId().toString(),
        email: "chief@test.edu",
        role: "chief_warden",
      };

      const initialAvailableBeds = await BedModel.countDocuments({
        institution_id: institutionId,
        status: "available",
      });
      expect(initialAvailableBeds).toBe(8);

      const initialCycle = await AllocationCycleModel.findById(cycleId).lean();
      expect(initialCycle?.quota_buckets?.[0]?.capacity).toBe(10);

      // Run simulation where Scenario A closes Block A and cuts General quota to 2
      const simResult = await simulatorService.runSimulationBatch(
        institutionId.toString(),
        {
          cycleId: cycleId.toString(),
          seed: 99999,
          scenarios: [
            { id: "sc-base", name: "Base Scenario" },
            {
              id: "sc-restricted",
              name: "Close Block A & Lower Quota",
              capacityOverrides: {
                closedBlockIds: [block1Id.toString()],
              },
              quotaOverrides: {
                General: 2,
              },
            },
          ],
        },
        actor,
      );

      expect(simResult.scenarios).toHaveLength(2);

      // 1. Live beds count and status MUST be untouched
      const postSimAvailableBeds = await BedModel.countDocuments({
        institution_id: institutionId,
        status: "available",
      });
      expect(postSimAvailableBeds).toBe(8);

      // 2. Live cycle quota buckets MUST be untouched
      const postSimCycle = await AllocationCycleModel.findById(cycleId).lean();
      expect(postSimCycle?.quota_buckets?.[0]?.capacity).toBe(10);

      // 3. Any draft created by simulation MUST have dry_run = true
      const createdDrafts = await AllocationDraftModel.find({
        institution_id: institutionId,
        run_id: { $in: simResult.scenarios.map((s) => new Types.ObjectId(s.runId)) },
      });
      expect(createdDrafts).toHaveLength(2);
      for (const d of createdDrafts) {
        expect(d.dry_run).toBe(true);
      }
    });

    it("audits every simulation execution in the tamper-evident hash chain", async () => {
      const actor = {
        id: new Types.ObjectId().toString(),
        email: "chief@test.edu",
        role: "chief_warden",
      };

      const simResult = await simulatorService.runSimulationBatch(
        institutionId.toString(),
        {
          cycleId: cycleId.toString(),
          seed: 123456,
          scenarios: [{ id: "sc-test", name: "Test Scenario" }],
        },
        actor,
      );

      expect(simResult.batchId).toBeDefined();

      // Verify audit entry
      const auditEntry = await AuditEntryModel.findOne({
        institution_id: institutionId,
        action: "SIMULATION_EXECUTED",
      });

      expect(auditEntry).toBeDefined();
      expect((auditEntry?.actor as Record<string, unknown>)?.["email"]).toBe("chief@test.edu");
      expect((auditEntry?.target as Record<string, unknown>)?.["batch_id"]).toBe(simResult.batchId);
    });

    it("retrieves available scenario options for the scenario builder", async () => {
      const options = await simulatorService.getScenarioOptions(
        institutionId.toString(),
        cycleId.toString(),
      );

      expect(options.cycleId).toBe(cycleId.toString());
      expect(options.hostels).toHaveLength(1);
      expect(options.hostels[0]?.name).toBe("Aryabhata Hall");
      expect(options.blocks).toHaveLength(2);
      expect(options.quotaBuckets).toHaveLength(2);
    });
  });
});
