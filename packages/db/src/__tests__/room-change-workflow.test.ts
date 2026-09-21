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
  RoomChangeRequestModel,
  RoomChangeService,
  RoomChangeServiceError,
} from "../index.js";

describe("Prompt 24: Room Change Workflow Integration Tests", () => {
  let institutionId: Types.ObjectId;
  let cycleId: Types.ObjectId;
  let draftId: Types.ObjectId;
  let hostelId: Types.ObjectId;
  let blockId: Types.ObjectId;
  let roomId1: Types.ObjectId;
  let roomId2: Types.ObjectId;
  let bed1Id: Types.ObjectId;
  let bed2Id: Types.ObjectId;
  let student1Id: Types.ObjectId;
  let student2Id: Types.ObjectId;
  let assignment1Id: Types.ObjectId;
  let roomChangeService: RoomChangeService;

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
    await RoomChangeRequestModel.deleteMany({});
    await BedModel.deleteMany({});
    await RoomModel.deleteMany({});
    await BlockModel.deleteMany({});
    await HostelModel.deleteMany({});
    await ApplicationModel.deleteMany({});
    await UserModel.deleteMany({});

    institutionId = new Types.ObjectId();
    cycleId = new Types.ObjectId();
    draftId = new Types.ObjectId();
    hostelId = new Types.ObjectId();
    blockId = new Types.ObjectId();
    roomId1 = new Types.ObjectId();
    roomId2 = new Types.ObjectId();
    bed1Id = new Types.ObjectId();
    bed2Id = new Types.ObjectId();
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
      _id: roomId1,
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

    await RoomModel.create({
      _id: roomId2,
      institution_id: institutionId,
      hostel_id: hostelId,
      block_id: blockId,
      room_number: "102",
      capacity: 1,
      room_type: "single",
      accessible: false,
      ac: false,
      status: "available",
    });

    await BedModel.create({
      _id: bed1Id,
      institution_id: institutionId,
      room_id: roomId1,
      bed_no: "101-A",
      status: "occupied",
    });

    await BedModel.create({
      _id: bed2Id,
      institution_id: institutionId,
      room_id: roomId2,
      bed_no: "102-A",
      status: "available",
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
      reference_number: `APP-${Date.now()}-1`,
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

    const runId = new Types.ObjectId();

    await AllocationDraftModel.create({
      _id: draftId,
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: runId,
      status: "PUBLISHED",
      approval_id: new Types.ObjectId(),
      version_number: 1,
      input_hash: "draft-input-hash-123",
      seed: 42,
    });

    await AllocationAssignmentModel.create({
      _id: assignment1Id,
      institution_id: institutionId,
      draft_id: draftId,
      run_id: runId,
      application_id: app1._id,
      student_id: student1Id,
      bed_id: bed1Id,
      room_id: roomId1,
      hostel_id: hostelId,
      score: 95,
      explanation: "Assigned by allocation engine based on preferences",
      status: "confirmed",
    });

    roomChangeService = new RoomChangeService();
  });

  it("allows student to create a room change request with reason and evidence", async () => {
    const request = await roomChangeService.createRequest(
      student1Id.toString(),
      assignment1Id.toString(),
      "Need quiet room due to intensive semester project research.",
      ["evidence/medical_doc_1.pdf"],
      institutionId.toString(),
    );

    expect(request).toBeDefined();
    expect(request.status).toBe("pending");
    expect(request.reason).toContain("Need quiet room");
    expect(request.evidence_keys).toContain("evidence/medical_doc_1.pdf");
    expect(request.from_bed_id.toString()).toBe(bed1Id.toString());

    // Verify audit record created
    const auditEntries = await AuditEntryModel.find({
      institution_id: institutionId,
      action: "ROOM_CHANGE_REQUESTED",
    });
    expect(auditEntries.length).toBe(1);
    expect((auditEntries[0]?.actor as Record<string, unknown>)?.["user_id"]).toBe(
      student1Id.toString(),
    );
  });

  it("prevents duplicate pending requests for the same assignment", async () => {
    await roomChangeService.createRequest(
      student1Id.toString(),
      assignment1Id.toString(),
      "First request for a room change with valid length.",
      [],
      institutionId.toString(),
    );

    await expect(
      roomChangeService.createRequest(
        student1Id.toString(),
        assignment1Id.toString(),
        "Second request for a room change while first is pending.",
        [],
        institutionId.toString(),
      ),
    ).rejects.toThrow(RoomChangeServiceError);
  });

  it("enforces student isolation: students cannot access or request changes for others", async () => {
    // Student 2 tries to request change on Student 1's assignment
    await expect(
      roomChangeService.createRequest(
        student2Id.toString(),
        assignment1Id.toString(),
        "Trying to change another student's assignment.",
        [],
        institutionId.toString(),
      ),
    ).rejects.toThrow(/You can only request changes for your own assignment/);

    // Create a request for student 1
    const req1 = await roomChangeService.createRequest(
      student1Id.toString(),
      assignment1Id.toString(),
      "Legitimate room change request by student 1.",
      [],
      institutionId.toString(),
    );

    // Student 2 cannot view Student 1's request detail
    await expect(
      roomChangeService.getRequest(req1._id.toString(), student2Id.toString(), "student"),
    ).rejects.toThrow(/You cannot view other students' requests/);

    // List filtering by student isolation
    const student2List = await roomChangeService.listRequests(
      { studentId: student2Id.toString() },
      "student",
    );
    expect(student2List.requests.length).toBe(0);

    const student1List = await roomChangeService.listRequests(
      { studentId: student1Id.toString() },
      "student",
    );
    expect(student1List.requests.length).toBe(1);
  });

  it("warden rejects a request with a written reason and audits the outcome", async () => {
    const request = await roomChangeService.createRequest(
      student1Id.toString(),
      assignment1Id.toString(),
      "Request to be moved closer to lab facilities.",
      [],
      institutionId.toString(),
    );

    const wardenActor = {
      id: "warden-101",
      email: "warden@apex.edu",
      role: "warden" as const,
    };

    const decided = await roomChangeService.decideRequest(
      request._id.toString(),
      "rejected",
      wardenActor,
      "No single rooms available in the requested block at this time.",
      undefined,
      institutionId.toString(),
    );

    expect(decided.status).toBe("rejected");
    expect(decided.decision_reason).toContain("No single rooms available");
    expect(decided.decided_by?.email).toBe("warden@apex.edu");

    const audit = await AuditEntryModel.findOne({
      institution_id: institutionId,
      action: "ROOM_CHANGE_REJECTED",
    });
    expect(audit).toBeDefined();
    expect((audit?.actor as Record<string, unknown>)?.["user_id"]).toBe("warden-101");
  });

  it("re-validates constraints on approval: blocks approval if target bed violates hard constraints", async () => {
    // Create another hostel with 'female' only policy
    const femaleHostelId = new Types.ObjectId();
    const femaleBlockId = new Types.ObjectId();
    const femaleRoomId = new Types.ObjectId();
    const femaleBedId = new Types.ObjectId();

    await HostelModel.create({
      _id: femaleHostelId,
      institution_id: institutionId,
      name: "Rose Hall",
      code: "RSE",
      address: "Campus South Sector 2",
      gender_policy: "female",
      status: "active",
    });

    await BlockModel.create({
      _id: femaleBlockId,
      institution_id: institutionId,
      hostel_id: femaleHostelId,
      name: "Rose Wing A",
      floor_no: 2,
      wing: "East",
      lift_access: true,
    });

    await RoomModel.create({
      _id: femaleRoomId,
      institution_id: institutionId,
      hostel_id: femaleHostelId,
      block_id: femaleBlockId,
      room_number: "201",
      capacity: 1,
      room_type: "single",
      accessible: false,
      ac: false,
      status: "available",
    });

    await BedModel.create({
      _id: femaleBedId,
      institution_id: institutionId,
      room_id: femaleRoomId,
      bed_no: "201-A",
      status: "available",
    });

    const request = await roomChangeService.createRequest(
      student1Id.toString(),
      assignment1Id.toString(),
      "Request transfer to Rose Hall quiet section.",
      [],
      institutionId.toString(),
    );

    const wardenActor = {
      id: "warden-101",
      email: "warden@apex.edu",
      role: "warden" as const,
    };

    // Attempting to move male student into female hostel should fail with CONSTRAINT_VIOLATION (HC4)
    await expect(
      roomChangeService.decideRequest(
        request._id.toString(),
        "approved",
        wardenActor,
        "Approving room change to Rose Hall.",
        femaleBedId.toString(),
        institutionId.toString(),
      ),
    ).rejects.toThrow(/HC4/);

    // Verify request is still pending
    const unchanged = await RoomChangeRequestModel.findById(request._id);
    expect(unchanged?.status).toBe("pending");
  });

  it("re-validates constraints on approval: approves when all hard constraints are satisfied and audits", async () => {
    const request = await roomChangeService.createRequest(
      student1Id.toString(),
      assignment1Id.toString(),
      "Request move from room 101 to 102.",
      [],
      institutionId.toString(),
    );

    const wardenActor = {
      id: "warden-101",
      email: "warden@apex.edu",
      role: "warden" as const,
    };

    const approved = await roomChangeService.decideRequest(
      request._id.toString(),
      "approved",
      wardenActor,
      "Single room 102 is vacant and meets all requirements.",
      bed2Id.toString(),
      institutionId.toString(),
    );

    expect(approved.status).toBe("approved");
    expect(approved.to_bed_id?.toString()).toBe(bed2Id.toString());
    expect(approved.decision_reason).toContain("Single room 102 is vacant");
    expect(approved.constraints_checked?.length).toBeGreaterThan(0);

    const audit = await AuditEntryModel.findOne({
      institution_id: institutionId,
      action: "ROOM_CHANGE_APPROVED",
    });
    expect(audit).toBeDefined();
    expect((audit?.actor as Record<string, unknown>)?.["user_id"]).toBe("warden-101");
  });
});
