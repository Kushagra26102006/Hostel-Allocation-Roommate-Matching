import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Types } from "mongoose";
import { setupTestDatabase, teardownTestDatabase } from "./test-helper.js";
import {
  InstitutionModel,
  AllocationDraftModel,
  AllocationAssignmentModel,
  BedModel,
  RoomModel,
  BlockModel,
  HostelModel,
  ApplicationModel,
  UserModel,
  AuditEntryModel,
  SwapRequestModel,
  SwapService,
  SwapServiceError,
} from "../index.js";

describe("Prompt 24: Atomic Swap Workflow Integration Tests", () => {
  let institutionId: Types.ObjectId;
  let cycleId: Types.ObjectId;
  let runId: Types.ObjectId;
  let draftId: Types.ObjectId;
  let hostel1Id: Types.ObjectId;
  let hostel2Id: Types.ObjectId;
  let block1Id: Types.ObjectId;
  let block2Id: Types.ObjectId;
  let room1Id: Types.ObjectId;
  let room2Id: Types.ObjectId;
  let bed1Id: Types.ObjectId;
  let bed2Id: Types.ObjectId;
  let student1Id: Types.ObjectId;
  let student2Id: Types.ObjectId;
  let student3Id: Types.ObjectId;
  let swapService: SwapService;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await InstitutionModel.deleteMany({});
    await AllocationDraftModel.deleteMany({});
    await AllocationAssignmentModel.deleteMany({});
    await SwapRequestModel.deleteMany({});
    await BedModel.deleteMany({});
    await RoomModel.deleteMany({});
    await BlockModel.deleteMany({});
    await HostelModel.deleteMany({});
    await ApplicationModel.deleteMany({});
    await UserModel.deleteMany({});

    institutionId = new Types.ObjectId();
    cycleId = new Types.ObjectId();
    runId = new Types.ObjectId();
    draftId = new Types.ObjectId();
    hostel1Id = new Types.ObjectId();
    hostel2Id = new Types.ObjectId();
    block1Id = new Types.ObjectId();
    block2Id = new Types.ObjectId();
    room1Id = new Types.ObjectId();
    room2Id = new Types.ObjectId();
    bed1Id = new Types.ObjectId();
    bed2Id = new Types.ObjectId();
    student1Id = new Types.ObjectId();
    student2Id = new Types.ObjectId();
    student3Id = new Types.ObjectId();

    await InstitutionModel.create({
      _id: institutionId,
      name: "Apex University",
      code: "APEX",
      domain: "apex.edu",
    });

    await HostelModel.create({
      _id: hostel1Id,
      institution_id: institutionId,
      name: "Hostel Alpha",
      code: "HA",
      address: "Campus North Sector 1",
      gender_policy: "male",
      status: "active",
    });

    await HostelModel.create({
      _id: hostel2Id,
      institution_id: institutionId,
      name: "Hostel Beta",
      code: "HB",
      address: "Campus South Sector 2",
      gender_policy: "male",
      status: "active",
    });

    await BlockModel.create({
      _id: block1Id,
      institution_id: institutionId,
      hostel_id: hostel1Id,
      name: "Block 1",
      floor_no: 1,
      wing: "A",
      lift_access: false,
    });

    await BlockModel.create({
      _id: block2Id,
      institution_id: institutionId,
      hostel_id: hostel2Id,
      name: "Block 2",
      floor_no: 1,
      wing: "B",
      lift_access: false,
    });

    await RoomModel.create({
      _id: room1Id,
      institution_id: institutionId,
      hostel_id: hostel1Id,
      block_id: block1Id,
      room_number: "101",
      capacity: 1,
      room_type: "single",
      accessible: false,
      ac: false,
      status: "available",
    });

    await RoomModel.create({
      _id: room2Id,
      institution_id: institutionId,
      hostel_id: hostel2Id,
      block_id: block2Id,
      room_number: "201",
      capacity: 1,
      room_type: "single",
      accessible: false,
      ac: false,
      status: "available",
    });

    await BedModel.create({
      _id: bed1Id,
      institution_id: institutionId,
      room_id: room1Id,
      bed_no: "101-A",
      status: "occupied",
    });

    await BedModel.create({
      _id: bed2Id,
      institution_id: institutionId,
      room_id: room2Id,
      bed_no: "201-A",
      status: "occupied",
    });

    await UserModel.create({
      _id: student1Id,
      institution_id: institutionId,
      email: "student1@apex.edu",
      name: "Student One",
      roles: ["student"],
      status: "active",
      mfa: { enabled: false },
      hostelAssignments: [],
    });

    await UserModel.create({
      _id: student2Id,
      institution_id: institutionId,
      email: "student2@apex.edu",
      name: "Student Two",
      roles: ["student"],
      status: "active",
      mfa: { enabled: false },
      hostelAssignments: [],
    });

    await UserModel.create({
      _id: student3Id,
      institution_id: institutionId,
      email: "student3@apex.edu",
      name: "Student Three",
      roles: ["student"],
      status: "active",
      mfa: { enabled: false },
      hostelAssignments: [],
    });

    const app1 = await ApplicationModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      student_id: student1Id,
      reference_number: `APP-S1-${Date.now()}`,
      status: "approved",
      priority_tier: "general",
      form_data: {
        gender: "male",
        programme: "BTech",
        year: 2,
        quota_bucket: "General",
        accessibility_need: false,
      },
      submitted_at: new Date(),
    });

    const app2 = await ApplicationModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      student_id: student2Id,
      reference_number: `APP-S2-${Date.now()}`,
      status: "approved",
      priority_tier: "general",
      form_data: {
        gender: "male",
        programme: "BTech",
        year: 2,
        quota_bucket: "General",
        accessibility_need: false,
      },
      submitted_at: new Date(),
    });

    await AllocationDraftModel.create({
      _id: draftId,
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: runId,
      status: "PUBLISHED",
      approval_id: new Types.ObjectId(),
      version_number: 1,
      input_hash: "draft-swap-hash-1",
      seed: 100,
    });

    await AllocationAssignmentModel.create({
      institution_id: institutionId,
      draft_id: draftId,
      run_id: runId,
      application_id: app1._id,
      student_id: student1Id,
      bed_id: bed1Id,
      room_id: room1Id,
      hostel_id: hostel1Id,
      score: 90,
      explanation: "Assigned Bed 1",
      status: "confirmed",
    });

    await AllocationAssignmentModel.create({
      institution_id: institutionId,
      draft_id: draftId,
      run_id: runId,
      application_id: app2._id,
      student_id: student2Id,
      bed_id: bed2Id,
      room_id: room2Id,
      hostel_id: hostel2Id,
      score: 88,
      explanation: "Assigned Bed 2",
      status: "confirmed",
    });

    swapService = new SwapService();
  });

  it("prevents proposing a swap with oneself", async () => {
    await expect(
      swapService.proposeSwap(
        student1Id.toString(),
        student1Id.toString(),
        institutionId.toString(),
      ),
    ).rejects.toThrow(SwapServiceError);
  });

  it("proposes a valid swap and marks initiator as accepted", async () => {
    const swap = await swapService.proposeSwap(
      student1Id.toString(),
      student2Id.toString(),
      institutionId.toString(),
    );

    expect(swap).toBeDefined();
    expect(swap.status).toBe("proposed");
    expect(swap.initiator_accepted).toBe(true);
    expect(swap.counterpart_accepted).toBe(false);
    expect(swap.initiator_bed_id.toString()).toBe(bed1Id.toString());
    expect(swap.counterpart_bed_id.toString()).toBe(bed2Id.toString());

    // Audited
    const audit = await AuditEntryModel.findOne({
      institution_id: institutionId,
      action: "SWAP_PROPOSED",
    });
    expect(audit).toBeDefined();
  });

  it("prevents non-counterpart student from accepting the swap", async () => {
    const swap = await swapService.proposeSwap(
      student1Id.toString(),
      student2Id.toString(),
      institutionId.toString(),
    );

    // Student 3 tries to accept Student 1 & 2's swap
    await expect(
      swapService.acceptSwap(swap._id.toString(), student3Id.toString(), institutionId.toString()),
    ).rejects.toThrow(/Only the counterpart can accept this swap/);
  });

  it("validates and completes swap atomically when both students satisfy constraints", async () => {
    const swap = await swapService.proposeSwap(
      student1Id.toString(),
      student2Id.toString(),
      institutionId.toString(),
    );

    // Counterpart accepts
    const accepted = await swapService.acceptSwap(
      swap._id.toString(),
      student2Id.toString(),
      institutionId.toString(),
    );

    expect(accepted.status).toBe("completed");
    expect(accepted.counterpart_accepted).toBe(true);
    expect(accepted.validation_result?.valid).toBe(true);

    const audit = await AuditEntryModel.findOne({
      institution_id: institutionId,
      action: "SWAP_COMPLETED",
    });
    expect(audit).toBeDefined();
  });

  it("atomic failure: if one side fails constraint validation, entire swap is marked failed and audited", async () => {
    // Update Hostel Alpha to be 'female' only (so student 2 moving to Hostel Alpha fails HC4)
    await HostelModel.findByIdAndUpdate(hostel1Id, { gender_policy: "female" });

    const swap = await swapService.proposeSwap(
      student1Id.toString(),
      student2Id.toString(),
      institutionId.toString(),
    );

    const result = await swapService.acceptSwap(
      swap._id.toString(),
      student2Id.toString(),
      institutionId.toString(),
    );

    // Entire swap fails atomically
    expect(result.status).toBe("failed");
    expect(result.failure_reason).toMatch(/gender policy/i);

    const audit = await AuditEntryModel.findOne({
      institution_id: institutionId,
      action: "SWAP_VALIDATION_FAILED",
    });
    expect(audit).toBeDefined();
    expect(audit?.after?.failure_reason).toMatch(/gender policy/i);
  });

  it("allows either party to cancel a proposed swap", async () => {
    const swap = await swapService.proposeSwap(
      student1Id.toString(),
      student2Id.toString(),
      institutionId.toString(),
    );

    const cancelled = await swapService.cancelSwap(
      swap._id.toString(),
      student1Id.toString(),
      "Changed my mind",
      institutionId.toString(),
    );

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancellation_reason).toBe("Changed my mind");

    const audit = await AuditEntryModel.findOne({
      institution_id: institutionId,
      action: "SWAP_CANCELLED",
    });
    expect(audit).toBeDefined();
  });
});
