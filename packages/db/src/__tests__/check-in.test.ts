/**
 * @hostelhub/db — __tests__/check-in.test.ts
 *
 * Tests for Prompt O3: QR Check-In & Check-Out with Room Inspection (E11)
 * - Ed25519 Token verification & letter preparation
 * - Digital check-in with warden and configurable checklist
 * - Student mobile checklist acknowledgement
 * - Check-out with checklist repetition and difference highlighting
 * - No-show rule with waitlist promotion trigger
 * - Offline-tolerant scanning and idempotent batch sync
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import {
  signVerificationToken,
  getOrCreateDefaultTestKeyPair,
  hashAssignmentId,
} from "@hostelhub/domain";
import {
  InstitutionModel,
  AllocationCycleModel,
  AllocationDraftModel,
  AllocationAssignmentModel,
  AllocationLetterModel,
  HostelModel,
  BlockModel,
  RoomModel,
  BedModel,
  UserModel,
  WaitlistEntryModel,
  ApplicationModel,
  CheckInRecordModel,
  CheckInService,
  CheckInServiceError,
  AuditEntryModel,
} from "../index.js";

describe("Prompt O3: Digital QR Check-In, Room Inspection & Check-Out", () => {
  let replSet: MongoMemoryReplSet;
  let checkInService: CheckInService;

  const institutionId = new Types.ObjectId();
  const cycleId = new Types.ObjectId();
  const draftId = new Types.ObjectId();
  const runId = new Types.ObjectId();
  const approvalId = new Types.ObjectId();
  const hostelId = new Types.ObjectId();
  const blockId = new Types.ObjectId();
  const roomId = new Types.ObjectId();
  const bedId = new Types.ObjectId();
  const studentId = new Types.ObjectId();
  const wardenId = new Types.ObjectId();
  const waitlistStudentId = new Types.ObjectId();

  const wardenActor = {
    id: wardenId.toString(),
    email: "warden.ramanujan@campus.edu",
    role: "warden" as const,
    name: "Dr. Warden",
  };

  let signedToken: string;
  let letterNumber = "AL-2026-NIT-001";
  let assignmentId: Types.ObjectId;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    await mongoose.connect(replSet.getUri());
    checkInService = new CheckInService(institutionId);

    // 1. Institution
    await InstitutionModel.create({
      _id: institutionId,
      name: "National Institute of Technology",
      code: "NIT-TEST",
      institution_id: institutionId,
      status: "active",
    });

    // 2. Cycle & Draft
    await AllocationCycleModel.create({
      _id: cycleId,
      institution_id: institutionId,
      name: "Fall 2026",
      academic_year: "2026-27",
      status: "closed",
      window_open: new Date("2026-08-01"),
      window_close: new Date("2026-08-15"),
      promotion_policy: "auto_confirm",
    });

    await AllocationDraftModel.create({
      _id: draftId,
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: runId,
      status: "PUBLISHED",
      version_number: 1,
      seed: 42,
      input_hash: "hash-test-42",
      approval_id: approvalId,
      published_at: new Date(),
      statistics: {
        total_applicants: 2,
        allocated_count: 1,
        unallocated_count: 1,
        male_allocated: 1,
        female_allocated: 0,
        quota_breakdown: {},
        avg_rank_assigned: 1,
      },
    });

    // 3. Hostel with custom checklist template
    await HostelModel.create({
      _id: hostelId,
      institution_id: institutionId,
      name: "Ramanujan Hall",
      gender_policy: "male",
      address: "Campus North Zone",
      status: "active",
      inspection_checklist_template: [
        { id: "bed_mattress", label: "Bed & Mattress", category: "furniture", required: true },
        { id: "study_table", label: "Study Table", category: "furniture", required: true },
        { id: "ceiling_fan", label: "Ceiling Fan", category: "electrical", required: true },
      ],
    });

    await BlockModel.create({
      _id: blockId,
      institution_id: institutionId,
      hostel_id: hostelId,
      name: "Block A",
      floor_no: 1,
      wing: "North Wing",
      lift_access: true,
    });

    // 4. Room & Bed
    await RoomModel.create({
      _id: roomId,
      institution_id: institutionId,
      hostel_id: hostelId,
      block_id: blockId,
      room_number: "101",
      room_type: "single",
      capacity: 1,
      accessible: false,
      ac: false,
      status: "available",
    });

    await BedModel.create({
      _id: bedId,
      institution_id: institutionId,
      room_id: roomId,
      bed_no: "Bed 101-A",
      status: "occupied",
    });

    // 5. Users
    await UserModel.create([
      {
        _id: studentId,
        institution_id: institutionId,
        email: "student.aarav@campus.edu",
        name: "Aarav Sharma",
        roles: ["student"],
        status: "active",
      },
      {
        _id: wardenId,
        institution_id: institutionId,
        email: "warden.ramanujan@campus.edu",
        name: "Dr. Warden",
        roles: ["warden"],
        status: "active",
      },
      {
        _id: waitlistStudentId,
        institution_id: institutionId,
        email: "waitlist.rohan@campus.edu",
        name: "Rohan Verma",
        roles: ["student"],
        status: "active",
      },
    ]);

    // 6. Assignment
    const studentAppId = new Types.ObjectId();
    await ApplicationModel.create({
      _id: studentAppId,
      institution_id: institutionId,
      cycle_id: cycleId,
      student_id: studentId,
      reference_number: "APP-NIT-001",
      status: "approved",
    });

    assignmentId = new Types.ObjectId();
    await AllocationAssignmentModel.create({
      _id: assignmentId,
      institution_id: institutionId,
      draft_id: draftId,
      run_id: runId,
      application_id: studentAppId,
      hostel_id: hostelId,
      room_id: roomId,
      bed_id: bedId,
      student_id: studentId,
      score: 95,
      explanation: "Merit allocation",
    });

    // 7. Signed Token & Letter
    const testKeys = getOrCreateDefaultTestKeyPair();
    signedToken = signVerificationToken(
      {
        lid: letterNumber,
        ah: hashAssignmentId(assignmentId.toString()),
        iat: Math.floor(Date.now() / 1000),
        iss: "NIT-TEST",
      },
      testKeys.privateKeyPem,
      testKeys.kid,
    );

    await AllocationLetterModel.create({
      institution_id: institutionId,
      draft_id: draftId,
      assignment_id: assignmentId,
      student_id: studentId,
      letter_number: letterNumber,
      token: signedToken,
      s3_key: "letters/NIT-TEST/AL-2026-NIT-001.pdf",
      status: "generated",
      metadata: {
        student_name: "Aarav Sharma",
        student_email: "student.aarav@campus.edu",
        roll_number: "22BCS001",
        institution_name: "National Institute of Technology",
        cycle_name: "Fall 2026",
        academic_year: "2026-27",
        hostel_name: "Ramanujan Hall",
        block_name: "Block A",
        floor_number: 1,
        room_number: "101",
        bed_no: "Bed 101-A",
        issued_date: "2026-08-26",
        move_in_start_date: "2026-09-01",
        move_in_end_date: "2026-09-10",
        terms_version: "2026.1",
      },
    });

    // 8. Waitlist entry for waitlisted student
    const waitlistAppId = new Types.ObjectId();
    await ApplicationModel.create({
      _id: waitlistAppId,
      institution_id: institutionId,
      cycle_id: cycleId,
      student_id: waitlistStudentId,
      reference_number: "APP-WL-001",
      status: "waitlisted",
    });

    await WaitlistEntryModel.create({
      institution_id: institutionId,
      cycle_id: cycleId,
      draft_id: draftId,
      run_id: runId,
      application_id: waitlistAppId,
      student_id: waitlistStudentId,
      position: 1,
      status: "waiting",
      priority_score: 92,
      policy_tier: 1,
      quota_bucket: "general",
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) {
      await replSet.stop();
    }
  });

  describe("Token & Code Verification", () => {
    it("verifies valid Ed25519 token and returns student and hostel checklist template", async () => {
      const result = await checkInService.verifyAndPrepareCheckIn(signedToken);

      expect(result.letter.studentName).toBe("Aarav Sharma");
      expect(result.letter.hostelName).toBe("Ramanujan Hall");
      expect(result.letter.roomNumber).toBe("101");
      expect(result.letter.bedNo).toBe("Bed 101-A");
      expect(result.checklistTemplate).toHaveLength(3);
      expect(result.checklistTemplate[0]!.id).toBe("bed_mattress");
      expect(result.existingRecord).toBeUndefined();
    });

    it("verifies manual letter code (AL-2026-NIT-001) successfully", async () => {
      const result = await checkInService.verifyAndPrepareCheckIn(letterNumber);

      expect(result.letter.letterNumber).toBe(letterNumber);
      expect(result.letter.studentId).toBe(studentId.toString());
    });

    it("throws error for tampered token", async () => {
      const parts = signedToken.split(".");
      const tampered = `${parts[0]}.${parts[1]}.tampered_signature_payload`;

      await expect(checkInService.verifyAndPrepareCheckIn(tampered)).rejects.toThrow(
        CheckInServiceError,
      );
    });
  });

  describe("Check-In Recording", () => {
    let recordedId: string;

    it("records check-in with warden info, room-condition checklist, and audits it", async () => {
      const record = await checkInService.recordCheckIn(
        {
          tokenOrCode: signedToken,
          checklist: [
            {
              itemId: "bed_mattress",
              label: "Bed & Mattress",
              category: "furniture",
              condition: "good",
            },
            {
              itemId: "study_table",
              label: "Study Table",
              category: "furniture",
              condition: "good",
            },
            {
              itemId: "ceiling_fan",
              label: "Ceiling Fan",
              category: "electrical",
              condition: "fair",
              notes: "Slight regulator vibration",
            },
          ],
          notes: "Keys handed over to student",
        },
        wardenActor,
      );

      expect(record.status).toBe("checked_in");
      expect(record.check_in.warden_name).toBe("Dr. Warden");
      expect(record.room_condition_checklist).toHaveLength(3);
      expect(record.student_acknowledgement?.acknowledged).toBe(false);

      recordedId = record._id.toString();

      // Check audit entry
      const audit = await AuditEntryModel.findOne({
        action: "CHECKIN_RECORDED",
        "target.check_in_record_id": recordedId,
      });
      expect(audit).not.toBeNull();
      expect((audit?.actor as { email?: string })?.email).toBe(wardenActor.email);
    });

    it("prevents duplicate check-in for the same student", async () => {
      await expect(
        checkInService.recordCheckIn(
          {
            tokenOrCode: signedToken,
            checklist: [],
          },
          wardenActor,
        ),
      ).rejects.toThrow(CheckInServiceError);
    });

    it("allows student to acknowledge checklist on their mobile device", async () => {
      const acknowledged = await checkInService.recordStudentAcknowledgement(
        recordedId,
        studentId.toString(),
        {
          studentNotes: "Inspected and confirmed in good order.",
          signatureHash: "sha256_mock_sig_hash_01",
        },
      );

      expect(acknowledged.student_acknowledgement?.acknowledged).toBe(true);
      expect(acknowledged.student_acknowledgement?.student_notes).toBe(
        "Inspected and confirmed in good order.",
      );
      expect(acknowledged.student_acknowledgement?.acknowledged_at).toBeDefined();

      // Verify audit
      const audit = await AuditEntryModel.findOne({
        action: "STUDENT_CHECKLIST_ACKNOWLEDGED",
        "target.check_in_record_id": recordedId,
      });
      expect(audit).not.toBeNull();
    });

    it("rejects acknowledgement from unauthorized student user", async () => {
      const fakeStudentId = new Types.ObjectId().toString();
      await expect(
        checkInService.recordStudentAcknowledgement(recordedId, fakeStudentId),
      ).rejects.toThrow(CheckInServiceError);
    });

    it("records check-out, compares checklist with check-in, and computes differences", async () => {
      const checkoutResult = await checkInService.recordCheckOut(
        recordedId,
        {
          checklist: [
            {
              itemId: "bed_mattress",
              label: "Bed & Mattress",
              category: "furniture",
              condition: "good",
            },
            {
              itemId: "study_table",
              label: "Study Table",
              category: "furniture",
              condition: "damaged",
              notes: "Burn mark on desk",
              photoUrl: "https://minio.campus.edu/burn.jpg",
            },
            {
              itemId: "ceiling_fan",
              label: "Ceiling Fan",
              category: "electrical",
              condition: "fair",
            },
          ],
          notes: "Student moving out for winter break",
        },
        wardenActor,
      );

      expect(checkoutResult.record.status).toBe("checked_out");
      expect(checkoutResult.diffReport.worsenedItems).toBe(1);
      expect(checkoutResult.diffReport.hasDamageLiability).toBe(true);

      const tableDiff = checkoutResult.diffReport.differences.find(
        (d) => d.itemId === "study_table",
      )!;
      expect(tableDiff.checkInCondition).toBe("good");
      expect(tableDiff.checkOutCondition).toBe("damaged");
      expect(tableDiff.liabilityAssessed).toBe(true);
      expect(tableDiff.checkOutNotes).toBe("Burn mark on desk");

      // Verify checkout audit
      const audit = await AuditEntryModel.findOne({
        action: "CHECKOUT_RECORDED",
        "target.check_in_record_id": recordedId,
      });
      expect(audit).not.toBeNull();
      expect(audit?.after?.status).toBe("checked_out");
    });
  });

  describe("No-Show Rule & Waitlist Promotion", () => {
    let noShowStudentId: Types.ObjectId;
    let noShowAssignmentId: Types.ObjectId;
    let noShowBedId: Types.ObjectId;
    let noShowLetterNumber = "AL-2026-NIT-002";

    beforeAll(async () => {
      noShowStudentId = new Types.ObjectId();
      noShowBedId = new Types.ObjectId();
      noShowAssignmentId = new Types.ObjectId();

      await UserModel.create({
        _id: noShowStudentId,
        institution_id: institutionId,
        email: "noshow.student@campus.edu",
        name: "Pooja Patel",
        roles: ["student"],
        status: "active",
      });

      await BedModel.create({
        _id: noShowBedId,
        institution_id: institutionId,
        room_id: roomId,
        bed_no: "Bed 101-B",
        status: "occupied",
      });

      const noShowAppId = new Types.ObjectId();
      await ApplicationModel.create({
        _id: noShowAppId,
        institution_id: institutionId,
        cycle_id: cycleId,
        student_id: noShowStudentId,
        reference_number: "APP-NIT-002",
        status: "approved",
      });

      await AllocationAssignmentModel.create({
        _id: noShowAssignmentId,
        institution_id: institutionId,
        draft_id: draftId,
        run_id: runId,
        application_id: noShowAppId,
        hostel_id: hostelId,
        room_id: roomId,
        bed_id: noShowBedId,
        student_id: noShowStudentId,
        score: 91,
        explanation: "Merit allocation",
      });

      await AllocationLetterModel.create({
        institution_id: institutionId,
        draft_id: draftId,
        assignment_id: noShowAssignmentId,
        student_id: noShowStudentId,
        letter_number: noShowLetterNumber,
        token: "mock-token-noshow",
        s3_key: "letters/NIT-TEST/AL-2026-NIT-002.pdf",
        status: "generated",
        metadata: {
          student_name: "Pooja Patel",
          student_email: "noshow.student@campus.edu",
          roll_number: "22BCS002",
          institution_name: "National Institute of Technology",
          cycle_name: "Fall 2026",
          academic_year: "2026-27",
          hostel_name: "Ramanujan Hall",
          block_name: "Block A",
          floor_number: 1,
          room_number: "101",
          bed_no: "Bed 101-B",
          issued_date: "2026-08-26",
          move_in_start_date: "2026-09-01",
          move_in_end_date: "2026-09-10",
          terms_version: "2026.1",
        },
      });
    });

    it("marks student as no-show and triggers waitlist promotion for vacated bed", async () => {
      const result = await checkInService.markNoShow(
        noShowLetterNumber,
        "Student failed to report by move-in deadline without prior notice",
        wardenActor,
      );

      expect(result.record.status).toBe("no_show");
      expect(result.record.no_show?.reason).toContain("failed to report by move-in deadline");
      expect(result.record.no_show?.promotion_triggered).toBe(true);

      // Verify audit
      const audit = await AuditEntryModel.findOne({
        action: "NO_SHOW_MARKED",
        "target.check_in_record_id": result.record._id.toString(),
      });
      expect(audit).not.toBeNull();
      expect(audit?.after?.status).toBe("no_show");
    });
  });

  describe("Offline-Tolerant Scanning & Batch Sync", () => {
    it("syncs offline check-in records idempotently and records offline metadata", async () => {
      // Setup a fresh student for offline check-in
      const offlineStudentId = new Types.ObjectId();
      const offlineBedId = new Types.ObjectId();
      const offlineAssignmentId = new Types.ObjectId();
      const offlineLetterNum = "AL-2026-NIT-003";

      await UserModel.create({
        _id: offlineStudentId,
        institution_id: institutionId,
        email: "offline.student@campus.edu",
        name: "Siddharth Iyer",
        roles: ["student"],
        status: "active",
      });

      await BedModel.create({
        _id: offlineBedId,
        institution_id: institutionId,
        room_id: roomId,
        bed_no: "Bed 101-C",
        status: "occupied",
      });

      const offlineAppId = new Types.ObjectId();
      await ApplicationModel.create({
        _id: offlineAppId,
        institution_id: institutionId,
        cycle_id: cycleId,
        student_id: offlineStudentId,
        reference_number: "APP-NIT-003",
        status: "approved",
      });

      await AllocationAssignmentModel.create({
        _id: offlineAssignmentId,
        institution_id: institutionId,
        draft_id: draftId,
        run_id: runId,
        application_id: offlineAppId,
        hostel_id: hostelId,
        room_id: roomId,
        bed_id: offlineBedId,
        student_id: offlineStudentId,
        score: 89,
        explanation: "Merit allocation",
      });

      await AllocationLetterModel.create({
        institution_id: institutionId,
        draft_id: draftId,
        assignment_id: offlineAssignmentId,
        student_id: offlineStudentId,
        letter_number: offlineLetterNum,
        token: "mock-token-offline-03",
        s3_key: "letters/NIT-TEST/AL-2026-NIT-003.pdf",
        status: "generated",
        metadata: {
          student_name: "Siddharth Iyer",
          student_email: "offline.student@campus.edu",
          roll_number: "22BCS003",
          institution_name: "National Institute of Technology",
          cycle_name: "Fall 2026",
          academic_year: "2026-27",
          hostel_name: "Ramanujan Hall",
          block_name: "Block A",
          floor_number: 1,
          room_number: "101",
          bed_no: "Bed 101-C",
          issued_date: "2026-08-26",
          move_in_start_date: "2026-09-01",
          move_in_end_date: "2026-09-10",
          terms_version: "2026.1",
        },
      });

      const offlinePayload = {
        clientSyncId: "sync-uuid-client-1234",
        tokenOrCode: offlineLetterNum,
        clientScannedAt: new Date("2026-09-02T10:30:00Z"),
        checklist: [
          {
            itemId: "bed_mattress",
            label: "Bed & Mattress",
            category: "furniture" as const,
            condition: "good" as const,
          },
        ],
        notes: "Scanned offline at gate security desk",
      };

      const syncResult = await checkInService.syncOfflineCheckIns([offlinePayload], wardenActor);

      expect(syncResult.syncedCount).toBe(1);
      expect(syncResult.failedCount).toBe(0);

      const record = await CheckInRecordModel.findOne({
        "offline_metadata.client_sync_id": "sync-uuid-client-1234",
      });
      expect(record).not.toBeNull();
      expect(record?.offline_metadata?.scanned_offline).toBe(true);

      // Re-running sync with same clientSyncId is idempotent
      const reSync = await checkInService.syncOfflineCheckIns([offlinePayload], wardenActor);
      expect(reSync.syncedCount).toBe(1);
      expect(reSync.failedCount).toBe(0);
    });
  });
});
