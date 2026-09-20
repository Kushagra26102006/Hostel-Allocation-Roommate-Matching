import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Types } from "mongoose";
import { setupTestDatabase, teardownTestDatabase } from "./test-helper.js";
import {
  AllocationDraftModel,
  AllocationAssignmentModel,
  OverrideModel,
  ApprovalRecordModel,
  BedModel,
  RoomModel,
  HostelModel,
  ApplicationModel,
  DraftWorkflowService,
  WorkflowError,
  InstitutionModel,
} from "../index.js";

describe("Prompt 19: Draft Workflow, Overrides, Approval and Publish Gate", () => {
  let institutionId: Types.ObjectId;
  let cycleId: Types.ObjectId;
  let runId: Types.ObjectId;
  let workflowService: DraftWorkflowService;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clear collections
    await InstitutionModel.deleteMany({});
    await AllocationDraftModel.deleteMany({});
    await AllocationAssignmentModel.deleteMany({});
    await OverrideModel.deleteMany({});
    await ApprovalRecordModel.deleteMany({});
    await BedModel.deleteMany({});
    await RoomModel.deleteMany({});
    await HostelModel.deleteMany({});
    await ApplicationModel.deleteMany({});

    institutionId = new Types.ObjectId();
    cycleId = new Types.ObjectId();
    runId = new Types.ObjectId();

    await InstitutionModel.create({
      _id: institutionId,
      name: "Test University",
      code: `TEST_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
      domain: "test.edu",
    });

    workflowService = new DraftWorkflowService();
  });

  it("1. Publishing without approval fails at the service level", async () => {
    const draft = await AllocationDraftModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: runId,
      status: "UNDER_REVIEW",
      version_number: 1,
      input_hash: "test-hash-123",
      seed: 42,
    });

    const actor = {
      id: "warden_1",
      email: "warden@test.edu",
      role: "warden" as const,
    };

    await expect(workflowService.publishDraft(draft._id, actor)).rejects.toThrow(
      "Draft cannot be published from status 'UNDER_REVIEW'",
    );
  });

  it("2. Publishing without approval fails when writing directly to the model (Layer b)", async () => {
    // Attempt to save a document directly with status PUBLISHED without approval_id
    const draft = new AllocationDraftModel({
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: new Types.ObjectId(),
      status: "PUBLISHED",
      version_number: 1,
      input_hash: "direct-write-hash",
      seed: 42,
    });

    await expect(draft.save()).rejects.toThrow(
      /Database validation failed: status PUBLISHED requires approval_id/,
    );
  });

  it("3. Override without reason (or reason < 10 chars) is rejected", async () => {
    const draft = await AllocationDraftModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: runId,
      status: "UNDER_REVIEW",
      version_number: 1,
      input_hash: "hash",
      seed: 1,
    });

    const actor = {
      id: "warden_1",
      email: "warden@test.edu",
      role: "warden" as const,
    };

    await expect(
      workflowService.applyOverride(
        draft._id,
        {
          assignmentId: new Types.ObjectId(),
          toBedId: new Types.ObjectId(),
          reason: "short",
          expectedVersion: 1,
        },
        actor,
      ),
    ).rejects.toThrow(/at least 10 characters/);
  });

  it("4. Override that violates a hard constraint is rejected with clear code", async () => {
    // Setup male hostel and female hostel
    const maleHostel = await HostelModel.create({
      institution_id: institutionId,
      name: "Boys Hostel A",
      gender_policy: "male",
      address: "North Campus",
      status: "active",
    });

    const femaleHostel = await HostelModel.create({
      institution_id: institutionId,
      name: "Girls Hostel B",
      gender_policy: "female",
      address: "South Campus",
      status: "active",
    });

    const maleRoom = await RoomModel.create({
      institution_id: institutionId,
      block_id: new Types.ObjectId(),
      hostel_id: maleHostel._id,
      room_number: "M101",
      room_type: "single",
      capacity: 1,
      accessible: false,
      ac: false,
      status: "available",
    });

    const femaleRoom = await RoomModel.create({
      institution_id: institutionId,
      block_id: new Types.ObjectId(),
      hostel_id: femaleHostel._id,
      room_number: "F101",
      room_type: "single",
      capacity: 1,
      accessible: false,
      ac: false,
      status: "available",
    });

    const fromBed = await BedModel.create({
      institution_id: institutionId,
      room_id: maleRoom._id,
      bed_no: "B1",
      status: "available",
      attributes: {},
    });

    const toBedInFemaleHostel = await BedModel.create({
      institution_id: institutionId,
      room_id: femaleRoom._id,
      bed_no: "G1",
      status: "available",
      attributes: {},
    });

    const studentId = new Types.ObjectId();
    const app = await ApplicationModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      student_id: studentId,
      reference_number: "APP-MALE-1",
      status: "approved",
      form_data: {
        personal_info: { gender: "male" },
      },
    });

    const draft = await AllocationDraftModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: runId,
      status: "UNDER_REVIEW",
      version_number: 1,
      input_hash: "hash",
      seed: 1,
    });

    const assignment = await AllocationAssignmentModel.create({
      institution_id: institutionId,
      draft_id: draft._id,
      run_id: runId,
      application_id: app._id,
      student_id: studentId,
      bed_id: fromBed._id,
      room_id: maleRoom._id,
      hostel_id: maleHostel._id,
      score: 80,
      explanation: "Initial placement",
    });

    const actor = {
      id: "warden_1",
      email: "warden@test.edu",
      role: "warden" as const,
    };

    // Attempt to move male student to female hostel
    try {
      await workflowService.applyOverride(
        draft._id,
        {
          assignmentId: assignment._id,
          toBedId: toBedInFemaleHostel._id,
          reason: "Administrative transfer request for student",
          expectedVersion: 1,
        },
        actor,
      );
      expect.unreachable("Should have thrown WorkflowError with HC4_GENDER_MISMATCH");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(WorkflowError);
      const wfErr = err as WorkflowError;
      expect(wfErr.code).toBe("HC4_GENDER_MISMATCH");
      expect(wfErr.message).toMatch(/gender/i);
    }
  });

  it("5. Second-approver rule (Maker-Checker): escalated override requires distinct second approver", async () => {
    const draft = await AllocationDraftModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: runId,
      status: "UNDER_REVIEW",
      version_number: 1,
      input_hash: "hash",
      seed: 1,
    });

    // Create an escalated override (e.g. accessibility / quota)
    await OverrideModel.create({
      institution_id: institutionId,
      draft_id: draft._id,
      assignment_id: new Types.ObjectId(),
      application_id: new Types.ObjectId(),
      actor: { id: "warden_1", role: "warden", email: "warden@test.edu" },
      from_bed_id: new Types.ObjectId(),
      to_bed_id: new Types.ObjectId(),
      reason: "Moving accessibility student to accessible ground floor bed",
      escalated: true,
      escalation_reasons: [
        "Override involves an accessible bed or applicant with accessibility requirements.",
      ],
    });

    const warden = {
      id: "warden_1",
      email: "warden@test.edu",
      role: "warden" as const,
    };

    // Single approver must fail with SECOND_APPROVER_REQUIRED
    await expect(
      workflowService.approveDraft(draft._id, warden, undefined, "Warden approval"),
    ).rejects.toThrow(/Maker-Checker/);

    // Same approver provided twice must fail
    await expect(
      workflowService.approveDraft(draft._id, warden, warden, "Warden approval"),
    ).rejects.toThrow(/different users/);

    // Two distinct approvers succeeds
    const chiefWarden = {
      id: "chief_warden_1",
      email: "chief@test.edu",
      role: "chief_warden" as const,
    };

    const approvalResult = await workflowService.approveDraft(
      draft._id,
      warden,
      chiefWarden,
      "Dual approval verified",
    );

    expect(approvalResult.draft.status).toBe("APPROVED");
    expect(approvalResult.approvalRecord.second_approver?.id).toBe("chief_warden_1");
  });

  it("6. Edit or delete of a published draft is blocked (Layer c)", async () => {
    const approvalRecord = await ApprovalRecordModel.create({
      institution_id: institutionId,
      draft_id: new Types.ObjectId(),
      approver: { id: "warden_1", role: "warden", email: "warden@test.edu" },
      comment: "Approved",
      approved_at: new Date(),
    });

    const publishedDraft = await AllocationDraftModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: runId,
      status: "PUBLISHED",
      version_number: 1,
      approval_id: approvalRecord._id.toString(),
      published_at: new Date(),
      input_hash: "hash",
      seed: 1,
    });

    // Attempting to update a published draft directly should be blocked
    await expect(
      AllocationDraftModel.updateOne({ _id: publishedDraft._id }, { $set: { seed: 999 } }),
    ).rejects.toThrow(/Published drafts are read-only and cannot be updated/);

    // Attempting to delete a published draft directly should be blocked
    await expect(AllocationDraftModel.deleteOne({ _id: publishedDraft._id })).rejects.toThrow(
      /Published drafts are read-only and cannot be deleted/,
    );
  });

  it("7. Concurrent publish race: exactly one publish call succeeds", async () => {
    const approvalRecord = await ApprovalRecordModel.create({
      institution_id: institutionId,
      draft_id: new Types.ObjectId(),
      approver: { id: "chief_1", role: "chief_warden", email: "chief@test.edu" },
      comment: "Approved",
      approved_at: new Date(),
    });

    const approvedDraft = await AllocationDraftModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: runId,
      status: "APPROVED",
      version_number: 1,
      approval_id: approvalRecord._id.toString(),
      input_hash: "hash",
      seed: 1,
    });

    const actor1 = {
      id: "chief_1",
      email: "chief1@test.edu",
      role: "chief_warden" as const,
    };
    const actor2 = {
      id: "chief_2",
      email: "chief2@test.edu",
      role: "chief_warden" as const,
    };

    // Run both publishes simultaneously
    const results = await Promise.allSettled([
      workflowService.publishDraft(approvedDraft._id, actor1),
      workflowService.publishDraft(approvedDraft._id, actor2),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly one winner, one rejected
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const finalDraft = await AllocationDraftModel.findById(approvedDraft._id);
    expect(finalDraft?.status).toBe("PUBLISHED");
  });
});
