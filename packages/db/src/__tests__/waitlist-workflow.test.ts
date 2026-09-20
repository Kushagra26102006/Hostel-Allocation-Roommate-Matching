import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Types } from "mongoose";
import { setupTestDatabase, teardownTestDatabase } from "./test-helper.js";
import {
  AllocationDraftModel,
  AllocationAssignmentModel,
  AllocationCycleModel,
  WaitlistEntryModel,
  PromotionProposalModel,
  ApprovalRecordModel,
  BedModel,
  RoomModel,
  HostelModel,
  ApplicationModel,
  UserModel,
  InstitutionModel,
  PromotionService,
  PromotionServiceError,
} from "../index.js";

describe("Prompt 21: Waitlist Promotion & Reconciliation Workflow", () => {
  let institutionId: Types.ObjectId;
  let cycleId: Types.ObjectId;
  let runId: Types.ObjectId;
  let hostelId: Types.ObjectId;
  let roomId: Types.ObjectId;
  let bed1Id: Types.ObjectId;
  let bed2Id: Types.ObjectId;
  let promotionService: PromotionService;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await InstitutionModel.deleteMany({});
    await AllocationDraftModel.deleteMany({});
    await AllocationDraftModel.collection.dropIndexes().catch(() => {});
    await AllocationDraftModel.syncIndexes().catch(() => {});
    await AllocationCycleModel.deleteMany({});
    await AllocationAssignmentModel.deleteMany({});
    await WaitlistEntryModel.deleteMany({});
    await PromotionProposalModel.deleteMany({});
    await BedModel.deleteMany({});
    await RoomModel.deleteMany({});
    await HostelModel.deleteMany({});
    await ApplicationModel.deleteMany({});
    await UserModel.deleteMany({});

    institutionId = new Types.ObjectId();
    cycleId = new Types.ObjectId();
    runId = new Types.ObjectId();
    hostelId = new Types.ObjectId();
    roomId = new Types.ObjectId();
    bed1Id = new Types.ObjectId();
    bed2Id = new Types.ObjectId();

    await InstitutionModel.create({
      _id: institutionId,
      name: "Test University",
      code: `TEST_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
      domain: "test.edu",
    });

    await AllocationCycleModel.create({
      _id: cycleId,
      institution_id: institutionId,
      academic_year: "2026-2027",
      name: "Fall 2026",
      window_open: new Date("2026-08-01"),
      window_close: new Date("2026-08-15"),
      status: "open",
      promotion_policy: "auto_confirm",
    });

    await HostelModel.create({
      _id: hostelId,
      institution_id: institutionId,
      name: "Aryabhata Hall",
      gender_policy: "male",
      address: "Campus North Sector 4",
      status: "active",
    });

    const blockId = new Types.ObjectId();
    await RoomModel.create({
      _id: roomId,
      institution_id: institutionId,
      hostel_id: hostelId,
      block_id: blockId,
      room_number: "101",
      room_type: "double",
      capacity: 2,
      accessible: false,
      status: "available",
    });

    await BedModel.create({
      _id: bed1Id,
      institution_id: institutionId,
      room_id: roomId,
      bed_no: "A",
      status: "occupied",
    });

    await BedModel.create({
      _id: bed2Id,
      institution_id: institutionId,
      room_id: roomId,
      bed_no: "B",
      status: "available",
    });

    promotionService = new PromotionService();
  });

  let appSeq = 0;
  async function createTestApp(
    studentId: Types.ObjectId,
    firstName: string,
    gender: "male" | "female",
    programme: string = "CS",
  ) {
    appSeq++;
    return await ApplicationModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      student_id: studentId,
      reference_number: `APP-2026-${Date.now()}-${appSeq}`,
      status: "submitted",
      priority_tier: "general",
      eligibility_result: { eligible: true, reasons: [] },
      form_data: {
        personal_info: { first_name: firstName, last_name: "Test", gender },
        academic_info: { programme, year: 1 },
        quota_category: "General",
      },
    });
  }

  it("1. Vacates a bed and auto-promotes top eligible waitlisted student", async () => {
    const draft = await AllocationDraftModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: runId,
      status: "DRAFT_READY",
      version_number: 1,
      input_hash: "hash123",
      seed: 42,
    });

    const student1 = new Types.ObjectId();
    const app1Doc = await createTestApp(student1, "Original", "male");

    // Existing assignment on bed 1
    await AllocationAssignmentModel.create({
      institution_id: institutionId,
      draft_id: draft._id,
      run_id: runId,
      application_id: app1Doc._id,
      student_id: student1,
      bed_id: bed1Id,
      room_id: roomId,
      hostel_id: hostelId,
      score: 95,
      explanation: "Original assignment",
    });

    // Waitlisted student
    const waitlistStudent = new Types.ObjectId();
    const waitlistAppDoc = await createTestApp(waitlistStudent, "Promoted", "male");

    const waitlistDoc = await WaitlistEntryModel.create({
      institution_id: institutionId,
      draft_id: draft._id,
      run_id: runId,
      application_id: waitlistAppDoc._id,
      student_id: waitlistStudent,
      position: 1,
      priority_score: 90,
      quota_bucket: "General",
      status: "waiting",
    });

    const result = await promotionService.handleVacatedBed(draft._id, bed1Id, "withdrawal", {
      id: "warden-1",
      email: "warden@test.edu",
      role: "warden",
    });

    expect(result.promotionResult.action).toBe("promoted");
    expect(result.promotionResult.promotedStudentId).toBe(waitlistStudent.toString());

    // Verify assignment updated
    const newAssignment = await AllocationAssignmentModel.findOne({
      draft_id: draft._id,
      bed_id: bed1Id,
    });
    expect(newAssignment).not.toBeNull();
    expect(newAssignment?.student_id.toString()).toBe(waitlistStudent.toString());

    // Verify waitlist doc updated
    const updatedWaitlist = await WaitlistEntryModel.findById(waitlistDoc._id);
    expect(updatedWaitlist?.status).toBe("promoted");
  });

  it("2. Skips unfit waitlisted student (gender mismatch) and promotes next eligible candidate", async () => {
    const draft = await AllocationDraftModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: runId,
      status: "DRAFT_READY",
      version_number: 1,
      input_hash: "hash123",
      seed: 42,
    });

    // Student 1: Female (Hostel is male only -> MUST BE SKIPPED)
    const femaleStudent = new Types.ObjectId();
    const femaleAppDoc = await createTestApp(femaleStudent, "Alice", "female");

    await WaitlistEntryModel.create({
      institution_id: institutionId,
      draft_id: draft._id,
      run_id: runId,
      application_id: femaleAppDoc._id,
      student_id: femaleStudent,
      position: 1,
      priority_score: 99,
      quota_bucket: "General",
      status: "waiting",
    });

    // Student 2: Male (Eligible)
    const maleStudent = new Types.ObjectId();
    const maleAppDoc = await createTestApp(maleStudent, "Bob", "male");

    const waitlist2 = await WaitlistEntryModel.create({
      institution_id: institutionId,
      draft_id: draft._id,
      run_id: runId,
      application_id: maleAppDoc._id,
      student_id: maleStudent,
      position: 2,
      priority_score: 85,
      quota_bucket: "General",
      status: "waiting",
    });

    const result = await promotionService.promoteVacatedBed(draft._id, bed2Id, "no_show", {
      id: "warden-1",
      email: "warden@test.edu",
      role: "warden",
    });

    expect(result.action).toBe("promoted");
    expect(result.candidate?.id).toBe(maleStudent.toString());
    expect(result.skippedUnits).toHaveLength(1);
    expect(result.skippedUnits[0]?.reasonCode).toBe("HC4_GENDER_MISMATCH");

    const updatedWaitlist2 = await WaitlistEntryModel.findById(waitlist2._id);
    expect(updatedWaitlist2?.status).toBe("promoted");
  });

  it("3. Proposal required policy creates pending proposal; warden confirmation promotes student", async () => {
    // Update cycle policy to proposal_required
    await AllocationCycleModel.findByIdAndUpdate(cycleId, {
      $set: { promotion_policy: "proposal_required" },
    });

    const draft = await AllocationDraftModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: runId,
      status: "DRAFT_READY",
      version_number: 1,
      input_hash: "hash123",
      seed: 42,
    });

    const student = new Types.ObjectId();
    const appDoc = await createTestApp(student, "Rahul", "male", "EE");

    const waitlistDoc = await WaitlistEntryModel.create({
      institution_id: institutionId,
      draft_id: draft._id,
      run_id: runId,
      application_id: appDoc._id,
      student_id: student,
      position: 1,
      priority_score: 88,
      quota_bucket: "General",
      status: "waiting",
    });

    // Run promotion: should produce a proposal
    const result = await promotionService.promoteVacatedBed(draft._id, bed2Id, "override_freed", {
      id: "warden-1",
      email: "warden@test.edu",
      role: "warden",
    });

    expect(result.action).toBe("proposal_created");
    expect(result.proposal).toBeDefined();
    expect(result.proposal?.status).toBe("pending");

    const waitlistAfterProposal = await WaitlistEntryModel.findById(waitlistDoc._id);
    expect(waitlistAfterProposal?.status).toBe("proposal_pending");

    // Warden confirms proposal
    const confirmation = await promotionService.confirmProposal(
      result.proposal!._id,
      { id: "warden-1", email: "warden@test.edu", role: "warden" },
      "Approved promotion due to high merit",
    );

    expect(confirmation.proposal.status).toBe("confirmed");
    expect(confirmation.assignmentId).toBeDefined();

    const waitlistAfterConfirm = await WaitlistEntryModel.findById(waitlistDoc._id);
    expect(waitlistAfterConfirm?.status).toBe("promoted");
  });

  it("4. Promotion after publication creates an amendment with version bump", async () => {
    // Create an approval record first so draft can be published
    const approval = await ApprovalRecordModel.create({
      institution_id: institutionId,
      draft_id: new Types.ObjectId(),
      status: "approved",
      approver: {
        id: "warden-1",
        email: "warden@test.edu",
        role: "warden",
      },
      comment: "Initial approval",
      approved_at: new Date(),
    });

    const publishedDraft = await AllocationDraftModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: runId,
      status: "PUBLISHED",
      approval_id: approval._id.toString(),
      version_number: 1,
      input_hash: "hash_published",
      seed: 123,
      published_at: new Date(),
    });

    approval.draft_id = publishedDraft._id;
    await approval.save();

    const student = new Types.ObjectId();
    const appDoc = await createTestApp(student, "PostPub", "male");

    await WaitlistEntryModel.create({
      institution_id: institutionId,
      draft_id: publishedDraft._id,
      run_id: runId,
      application_id: appDoc._id,
      student_id: student,
      position: 1,
      priority_score: 91,
      quota_bucket: "General",
      status: "waiting",
    });

    const result = await promotionService.promoteVacatedBed(
      publishedDraft._id,
      bed2Id,
      "appeal_granted",
      { id: "admin-1", email: "admin@test.edu", role: "admin" },
    );

    expect(result.action).toBe("promoted");
    expect(result.amendedDraft).toBeDefined();
    expect(result.amendedDraft?.version_number).toBe(2);

    // Old draft must be archived
    const oldDraft = await AllocationDraftModel.findById(publishedDraft._id);
    expect(oldDraft?.status).toBe("ARCHIVED");
  });

  it("5. Reordering waitlist requires >= 10 char reason and updates positions", async () => {
    const draft = await AllocationDraftModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: runId,
      status: "DRAFT_READY",
      version_number: 1,
      input_hash: "hash_reorder",
      seed: 99,
    });

    const entry1 = await WaitlistEntryModel.create({
      institution_id: institutionId,
      draft_id: draft._id,
      run_id: runId,
      application_id: new Types.ObjectId(),
      student_id: new Types.ObjectId(),
      position: 1,
      priority_score: 90,
      quota_bucket: "General",
      status: "waiting",
    });

    const entry2 = await WaitlistEntryModel.create({
      institution_id: institutionId,
      draft_id: draft._id,
      run_id: runId,
      application_id: new Types.ObjectId(),
      student_id: new Types.ObjectId(),
      position: 2,
      priority_score: 80,
      quota_bucket: "General",
      status: "waiting",
    });

    // Reason < 10 characters should fail
    await expect(
      promotionService.reorderWaitlist(draft._id, entry2._id, 1, "Short", {
        id: "warden-1",
        email: "warden@test.edu",
        role: "warden",
      }),
    ).rejects.toThrowError(PromotionServiceError);

    // Valid reorder
    const updatedEntries = await promotionService.reorderWaitlist(
      draft._id,
      entry2._id,
      1,
      "Medical necessity prioritized by Dean committee",
      { id: "warden-1", email: "warden@test.edu", role: "warden" },
    );

    const doc2 = updatedEntries.find((e) => e._id.toString() === entry2._id.toString());
    const doc1 = updatedEntries.find((e) => e._id.toString() === entry1._id.toString());

    expect(doc2?.position).toBe(1);
    expect(doc1?.position).toBe(2);
    expect(doc2?.reorder_history).toHaveLength(1);
    expect(doc2?.reorder_history?.[0]?.reason).toBe(
      "Medical necessity prioritized by Dean committee",
    );
  });

  it("6. Reconciles hostel occupancy exactly against assignments", async () => {
    const draft = await AllocationDraftModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: runId,
      status: "DRAFT_READY",
      version_number: 1,
      input_hash: "hash_reconcile",
      seed: 77,
    });

    await AllocationAssignmentModel.create({
      institution_id: institutionId,
      draft_id: draft._id,
      run_id: runId,
      application_id: new Types.ObjectId(),
      student_id: new Types.ObjectId(),
      bed_id: bed1Id,
      room_id: roomId,
      hostel_id: hostelId,
      score: 90,
      explanation: "Test occupant",
    });

    const report = await promotionService.reconcileHostelOccupancy(hostelId, draft._id);
    expect(report.totalHostelCapacity).toBe(2);
    expect(report.totalAllocated).toBe(1);
    expect(report.totalAvailable).toBe(1);
    expect(report.isExactMatch).toBe(true);
    expect(report.discrepancies).toHaveLength(0);
  });
});
