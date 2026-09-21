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
  AppealModel,
  AppealService,
  AppealServiceError,
} from "../index.js";

describe("Prompt 24: Appeals & SLA Escalation Workflow Integration Tests", () => {
  let institutionId: Types.ObjectId;
  let cycleId: Types.ObjectId;
  let runId: Types.ObjectId;
  let draftId: Types.ObjectId;
  let hostelId: Types.ObjectId;
  let blockId: Types.ObjectId;
  let roomId: Types.ObjectId;
  let bedId: Types.ObjectId;
  let student1Id: Types.ObjectId;
  let student2Id: Types.ObjectId;
  let assignment1Id: Types.ObjectId;
  let appealService: AppealService;

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
    await AppealModel.deleteMany({});
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
    hostelId = new Types.ObjectId();
    blockId = new Types.ObjectId();
    roomId = new Types.ObjectId();
    bedId = new Types.ObjectId();
    student1Id = new Types.ObjectId();
    student2Id = new Types.ObjectId();
    assignment1Id = new Types.ObjectId();

    await InstitutionModel.create({
      _id: institutionId,
      name: "Apex University",
      code: "APEX",
      domain: "apex.edu",
    });

    await HostelModel.create({
      _id: hostelId,
      institution_id: institutionId,
      name: "Evergreen Hall",
      code: "EVG",
      address: "Campus North Sector 1",
      gender_policy: "male",
      status: "active",
    });

    await BlockModel.create({
      _id: blockId,
      institution_id: institutionId,
      hostel_id: hostelId,
      name: "Block A",
      floor_no: 1,
      wing: "North",
      lift_access: true,
    });

    await RoomModel.create({
      _id: roomId,
      institution_id: institutionId,
      hostel_id: hostelId,
      block_id: blockId,
      room_number: "101",
      capacity: 1,
      room_type: "single",
      accessible: false,
      ac: false,
      status: "available",
    });

    await BedModel.create({
      _id: bedId,
      institution_id: institutionId,
      room_id: roomId,
      bed_no: "101-A",
      status: "occupied",
    });

    await UserModel.create({
      _id: student1Id,
      institution_id: institutionId,
      email: "student1@apex.edu",
      name: "Aarav Sharma",
      roles: ["student"],
      status: "active",
      mfa: { enabled: false },
      hostelAssignments: [],
    });

    await UserModel.create({
      _id: student2Id,
      institution_id: institutionId,
      email: "student2@apex.edu",
      name: "Rohan Verma",
      roles: ["student"],
      status: "active",
      mfa: { enabled: false },
      hostelAssignments: [],
    });

    const app1 = await ApplicationModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      student_id: student1Id,
      reference_number: `APP-APL-${Date.now()}`,
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
      input_hash: "draft-appeal-hash-1",
      seed: 42,
    });

    await AllocationAssignmentModel.create({
      _id: assignment1Id,
      institution_id: institutionId,
      draft_id: draftId,
      run_id: runId,
      application_id: app1._id,
      student_id: student1Id,
      bed_id: bedId,
      room_id: roomId,
      hostel_id: hostelId,
      score: 85,
      explanation:
        "Assigned by allocation algorithm: Evergreen Hall Room 101 based on General quota match.",
      status: "confirmed",
    });

    appealService = new AppealService();
  });

  it("submits an appeal with statement and evidence, calculating SLA due date", async () => {
    const appeal = await appealService.submitAppeal(
      student1Id.toString(),
      assignment1Id.toString(),
      "I am appealing this allocation because my documented medical condition requires elevator access and ground floor proximity.",
      ["evidence/doctor_certificate.pdf"],
      institutionId.toString(),
    );

    expect(appeal).toBeDefined();
    expect(appeal.status).toBe("warden_review");
    expect(appeal.current_reviewer_role).toBe("warden");
    expect(appeal.sla_due_at).toBeDefined();
    expect(appeal.sla_config_days).toBe(3);
    expect(appeal.evidence_keys).toContain("evidence/doctor_certificate.pdf");

    // Check SLA date is in future
    expect(appeal.sla_due_at.getTime()).toBeGreaterThan(Date.now());

    // Audited
    const audit = await AuditEntryModel.findOne({
      institution_id: institutionId,
      action: "APPEAL_SUBMITTED",
    });
    expect(audit).toBeDefined();
  });

  it("rejects statement shorter than 20 characters", async () => {
    await expect(
      appealService.submitAppeal(
        student1Id.toString(),
        assignment1Id.toString(),
        "Too short",
        [],
        institutionId.toString(),
      ),
    ).rejects.toThrow(/at least 20 characters/);
  });

  it("prevents duplicate active appeals for the same assignment", async () => {
    await appealService.submitAppeal(
      student1Id.toString(),
      assignment1Id.toString(),
      "First appeal statement with sufficient length and detail.",
      [],
      institutionId.toString(),
    );

    await expect(
      appealService.submitAppeal(
        student1Id.toString(),
        assignment1Id.toString(),
        "Second duplicate appeal for the same student and assignment.",
        [],
        institutionId.toString(),
      ),
    ).rejects.toThrow(AppealServiceError);
  });

  it("enforces student isolation: student can only view own appeal with stored explanation", async () => {
    const appeal = await appealService.submitAppeal(
      student1Id.toString(),
      assignment1Id.toString(),
      "Appeal statement submitted by student 1 with sufficient detail.",
      [],
      institutionId.toString(),
    );

    // Student 2 cannot access Student 1's appeal
    await expect(
      appealService.getAppealWithExplanation(
        appeal._id.toString(),
        student2Id.toString(),
        "student",
      ),
    ).rejects.toThrow(/You cannot view other students' appeals/);

    // Student 1 can access with stored explanation
    const result = await appealService.getAppealWithExplanation(
      appeal._id.toString(),
      student1Id.toString(),
      "student",
    );

    expect(result.appeal._id.toString()).toBe(appeal._id.toString());
    expect(result.explanation).toContain("Evergreen Hall Room 101");
  });

  it("routing: warden rejects appeal, routing it automatically to chief_warden", async () => {
    const appeal = await appealService.submitAppeal(
      student1Id.toString(),
      assignment1Id.toString(),
      "I am appealing this allocation due to severe dust allergy in block A.",
      [],
      institutionId.toString(),
    );

    const wardenActor = {
      id: "warden-42",
      email: "warden@apex.edu",
      role: "warden" as const,
    };

    const decided = await appealService.decideAppeal(
      appeal._id.toString(),
      "rejected",
      "Warden found no medical documents supporting the allergy claim on record.",
      wardenActor,
      institutionId.toString(),
    );

    // Rejected by warden moves to chief_warden_review
    expect(decided.status).toBe("chief_warden_review");
    expect(decided.current_reviewer_role).toBe("chief_warden");
    expect(decided.warden_decision?.outcome).toBe("rejected");
    expect(decided.warden_decision?.reason).toContain("Warden found no medical documents");

    // Now chief warden can make final decision
    const chiefWardenActor = {
      id: "chief-warden-1",
      email: "chief.warden@apex.edu",
      role: "chief_warden" as const,
    };

    const finalDecision = await appealService.decideAppeal(
      appeal._id.toString(),
      "partly_upheld",
      "Chief Warden reviewed and granted transfer to low-dust floor in Block B.",
      chiefWardenActor,
      institutionId.toString(),
    );

    expect(finalDecision.status).toBe("partly_upheld");
    expect(finalDecision.final_outcome).toBe("partly_upheld");
    expect(finalDecision.chief_warden_decision?.outcome).toBe("partly_upheld");

    // All outcomes audited
    const auditRejected = await AuditEntryModel.findOne({
      institution_id: institutionId,
      action: "APPEAL_REJECTED",
    });
    const auditPartlyUpheld = await AuditEntryModel.findOne({
      institution_id: institutionId,
      action: "APPEAL_PARTLY_UPHELD",
    });
    expect(auditRejected).toBeDefined();
    expect(auditPartlyUpheld).toBeDefined();
  });

  it("warden upholds appeal directly with written reason", async () => {
    const appeal = await appealService.submitAppeal(
      student1Id.toString(),
      assignment1Id.toString(),
      "Medical condition verified by university health clinic needs special consideration.",
      [],
      institutionId.toString(),
    );

    const wardenActor = {
      id: "warden-42",
      email: "warden@apex.edu",
      role: "warden" as const,
    };

    const decided = await appealService.decideAppeal(
      appeal._id.toString(),
      "upheld",
      "Warden verified official medical note with clinic; appeal upheld.",
      wardenActor,
      institutionId.toString(),
    );

    expect(decided.status).toBe("upheld");
    expect(decided.final_outcome).toBe("upheld");
    expect(decided.warden_decision?.outcome).toBe("upheld");

    const audit = await AuditEntryModel.findOne({
      institution_id: institutionId,
      action: "APPEAL_UPHELD",
    });
    expect(audit).toBeDefined();
  });

  it("SLA escalation with a fake clock: overdue warden review auto-escalates to chief_warden", async () => {
    // Create an appeal with an explicit SLA date in the past
    const pastSlaDate = new Date("2026-09-15T10:00:00.000Z");
    const fakeClockNow = "2026-09-16T12:00:00.000Z";

    const appeal = await AppealModel.create({
      institution_id: institutionId,
      student_id: student1Id,
      assignment_id: assignment1Id,
      draft_id: draftId,
      statement: "Statement for SLA escalation testing with sufficient length.",
      evidence_keys: [],
      status: "warden_review",
      sla_due_at: pastSlaDate,
      sla_config_days: 3,
      current_reviewer_role: "warden",
    });

    // Run scheduled escalation job with fake clock
    const escalated = await appealService.escalateOverdueAppeals(fakeClockNow);

    expect(escalated.length).toBe(1);
    expect(escalated[0]!.appealId).toBe(appeal._id.toString());
    expect(escalated[0]!.previousStatus).toBe("warden_review");
    expect(escalated[0]!.newStatus).toBe("chief_warden_review");

    // Verify document was updated in database
    const updated = await AppealModel.findById(appeal._id);
    expect(updated?.status).toBe("chief_warden_review");
    expect(updated?.current_reviewer_role).toBe("chief_warden");
    expect(updated?.escalated_at).toBeDefined();
    expect(updated?.escalation_reason).toContain("SLA breach");

    // Verify SLA escalation audit record
    const audit = await AuditEntryModel.findOne({
      institution_id: institutionId,
      action: "APPEAL_SLA_ESCALATED",
    });
    expect(audit).toBeDefined();
    expect((audit?.actor as Record<string, unknown>)?.["user_id"]).toBe("system-sla-escalation");
  });

  it("does not escalate appeals that have not missed their SLA deadline", async () => {
    const futureSlaDate = new Date("2026-09-25T10:00:00.000Z");
    const fakeClockNow = "2026-09-20T12:00:00.000Z";

    await AppealModel.create({
      institution_id: institutionId,
      student_id: student1Id,
      assignment_id: assignment1Id,
      draft_id: draftId,
      statement: "Statement for SLA non-escalation testing with sufficient length.",
      evidence_keys: [],
      status: "warden_review",
      sla_due_at: futureSlaDate,
      sla_config_days: 3,
      current_reviewer_role: "warden",
    });

    const escalated = await appealService.escalateOverdueAppeals(fakeClockNow);
    expect(escalated.length).toBe(0);
  });
});
