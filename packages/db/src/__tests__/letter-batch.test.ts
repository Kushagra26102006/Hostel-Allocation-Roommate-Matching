/**
 * @hostelhub/db — __tests__/letter-batch.test.ts
 *
 * Tests for Prompt 22:
 * - Chunks of 200
 * - Resumes after simulated crash (skips already generated letters)
 * - Student can only download their own letter (403 if unauthorized)
 * - Student result assembly & mutual consent roommate privacy filter
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  AllocationLetterModel,
  AllocationAssignmentModel,
  AllocationDraftModel,
  AllocationCycleModel,
  UserModel,
  HostelModel,
  BlockModel,
  RoomModel,
  BedModel,
  ConsentRecordModel,
  InstitutionModel,
  ApplicationModel,
} from "../index.js";
import { LetterService, LetterServiceError } from "../services/letter.service.js";

describe("Prompt 22: Publication Letters, Resumable Batch & Student Reveal", () => {
  let mongod: MongoMemoryServer;
  let letterService: LetterService;

  const institutionId = new Types.ObjectId();
  const cycleId = new Types.ObjectId();
  const draftId = new Types.ObjectId();
  const runId = new Types.ObjectId();

  const studentAId = new Types.ObjectId();
  const studentBId = new Types.ObjectId();
  const studentCId = new Types.ObjectId();

  const hostelId = new Types.ObjectId();
  const roomId = new Types.ObjectId();
  const bedAId = new Types.ObjectId();
  const bedBId = new Types.ObjectId();
  const bedCId = new Types.ObjectId();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    letterService = new LetterService();

    // 1. Seed Institution & Cycle
    await InstitutionModel.create({
      _id: institutionId,
      name: "National Institute of Technology",
      code: "NIT-TEST",
      institution_id: institutionId,
    });

    await AllocationCycleModel.create({
      _id: cycleId,
      institution_id: institutionId,
      name: "Autumn 2026 Housing Cycle",
      academic_year: "2026-2027",
      status: "open",
      window_open: new Date("2026-08-01"),
      window_close: new Date("2026-09-01"),
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
      approval_id: new Types.ObjectId(),
      published_at: new Date(),
    });

    // 2. Seed Hostel, Room, Beds
    await HostelModel.create({
      _id: hostelId,
      institution_id: institutionId,
      name: "Homi Bhabha Hall",
      gender_policy: "male",
      address: "North Campus, NIT",
      status: "active",
    });

    const blockId = new Types.ObjectId();
    await BlockModel.create({
      _id: blockId,
      institution_id: institutionId,
      hostel_id: hostelId,
      name: "Tower A",
      floor_no: 4,
      wing: "North Wing",
      lift_access: true,
    });

    await RoomModel.create({
      _id: roomId,
      institution_id: institutionId,
      hostel_id: hostelId,
      block_id: blockId,
      room_number: "204",
      room_type: "double",
      floor_number: 2,
      capacity: 2,
    });

    await BedModel.create([
      {
        _id: bedAId,
        institution_id: institutionId,
        room_id: roomId,
        hostel_id: hostelId,
        bed_no: "Bed A",
      },
      {
        _id: bedBId,
        institution_id: institutionId,
        room_id: roomId,
        hostel_id: hostelId,
        bed_no: "Bed B",
      },
      {
        _id: bedCId,
        institution_id: institutionId,
        room_id: roomId,
        hostel_id: hostelId,
        bed_no: "Bed C",
      },
    ]);

    // 3. Seed Users
    await UserModel.create([
      {
        _id: studentAId,
        institution_id: institutionId,
        name: "Dev Sharma",
        email: "dev.sharma@nit.edu",
        roles: ["student"],
        metadata: { roll_number: "22BCS011" },
      },
      {
        _id: studentBId,
        institution_id: institutionId,
        name: "Rohan Varma",
        email: "rohan.varma@nit.edu",
        roles: ["student"],
        metadata: { roll_number: "22BCS045" },
      },
      {
        _id: studentCId,
        institution_id: institutionId,
        name: "Kabir Mehta",
        email: "kabir.mehta@nit.edu",
        roles: ["student"],
        metadata: { roll_number: "22BCS089" },
      },
    ]);

    // 3.5 Seed Applications
    await ApplicationModel.create([
      {
        institution_id: institutionId,
        student_id: studentAId,
        cycle_id: cycleId,
        reference_number: "22BCS011",
        status: "submitted",
        eligibility_result: { eligible: true, reasons: [] },
        priority_tier: "tier_1",
        form_data: {},
      },
      {
        institution_id: institutionId,
        student_id: studentBId,
        cycle_id: cycleId,
        reference_number: "22BCS045",
        status: "submitted",
        eligibility_result: { eligible: true, reasons: [] },
        priority_tier: "tier_1",
        form_data: {},
      },
      {
        institution_id: institutionId,
        student_id: studentCId,
        cycle_id: cycleId,
        reference_number: "22BCS089",
        status: "submitted",
        eligibility_result: { eligible: true, reasons: [] },
        priority_tier: "tier_2",
        form_data: {},
      },
    ]);

    // 4. Seed Assignments
    await AllocationAssignmentModel.create([
      {
        _id: new Types.ObjectId(),
        institution_id: institutionId,
        draft_id: draftId,
        run_id: runId,
        application_id: new Types.ObjectId(),
        student_id: studentAId,
        hostel_id: hostelId,
        room_id: roomId,
        bed_id: bedAId,
        score: 92,
        explanation: "High affinity match on study habits and sleep schedule.",
      },
      {
        _id: new Types.ObjectId(),
        institution_id: institutionId,
        draft_id: draftId,
        run_id: runId,
        application_id: new Types.ObjectId(),
        student_id: studentBId,
        hostel_id: hostelId,
        room_id: roomId,
        bed_id: bedBId,
        score: 92,
        explanation: "High affinity match on study habits and sleep schedule.",
      },
      {
        _id: new Types.ObjectId(),
        institution_id: institutionId,
        draft_id: draftId,
        run_id: runId,
        application_id: new Types.ObjectId(),
        student_id: studentCId,
        hostel_id: hostelId,
        room_id: roomId,
        bed_id: bedCId,
        score: 84,
        explanation: "Good compatibility score with room preferences.",
      },
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("splits batch into chunks of 200 (or custom chunk size)", async () => {
    // Test with chunkSize = 2 across 3 assignments
    const { chunks, progress } = await letterService.initOrResumeBatch(draftId, institutionId, {
      chunkSize: 2,
    });

    expect(chunks).toHaveLength(2); // 2 items in chunk 1, 1 item in chunk 2
    expect(chunks[0]).toHaveLength(2);
    expect(chunks[1]).toHaveLength(1);
    expect(progress.total).toBe(3);
    expect(progress.pending).toBe(3);
    expect(progress.generated).toBe(0);
  });

  it("TEST REQUIREMENT: letters batch resumes after a forced crash", async () => {
    // Simulate crash: 2 letters were completed before crash
    const allLetters = await AllocationLetterModel.find({ draft_id: draftId });
    expect(allLetters).toHaveLength(3);

    // Mark first letter as 'generated'
    allLetters[0].status = "generated";
    allLetters[0].generated_at = new Date();
    await allLetters[0].save();

    // Mark second letter as 'generated'
    allLetters[1].status = "generated";
    allLetters[1].generated_at = new Date();
    await allLetters[1].save();

    // The third letter is still 'pending'

    // Resume batch!
    const { chunks, progress } = await letterService.initOrResumeBatch(draftId, institutionId, {
      chunkSize: 200,
    });

    // It should ONLY process the 1 remaining ungenerated letter!
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(1);
    expect(chunks[0][0]._id.toString()).toBe(allLetters[2]._id.toString());
    expect(progress.generated).toBe(2);
    expect(progress.pending).toBe(1);
    expect(progress.total).toBe(3);
  });

  it("TEST REQUIREMENT: a student can only download their own letter", async () => {
    const letters = await AllocationLetterModel.find({ draft_id: draftId });
    const letterForStudentA = letters.find(
      (l) => l.student_id.toString() === studentAId.toString(),
    )!;
    const letterForStudentB = letters.find(
      (l) => l.student_id.toString() === studentBId.toString(),
    )!;

    // Student A successfully downloads their own letter
    const ownDownload = await letterService.getLetterDownloadUrl(
      letterForStudentA._id,
      studentAId.toString(),
      "student",
    );
    expect(ownDownload.downloadUrl).toContain(letterForStudentA._id.toString());

    // Student A attempts to download Student B's letter -> REJECTED with 403 Forbidden
    await expect(
      letterService.getLetterDownloadUrl(letterForStudentB._id, studentAId.toString(), "student"),
    ).rejects.toThrowError(LetterServiceError);

    try {
      await letterService.getLetterDownloadUrl(
        letterForStudentB._id,
        studentAId.toString(),
        "student",
      );
    } catch (err: unknown) {
      const serviceErr = err as LetterServiceError;
      expect(serviceErr.statusCode).toBe(403);
      expect(serviceErr.code).toBe("FORBIDDEN_LETTER_ACCESS");
    }

    // Warden can download any student's letter
    const wardenDownload = await letterService.getLetterDownloadUrl(
      letterForStudentB._id,
      "warden-user-id",
      "warden",
    );
    expect(wardenDownload.downloadUrl).toBeDefined();
  });

  it("assembles student reveal data with mutual consent roommate privacy", async () => {
    // Case 1: Neither student has consented -> Roommate details anonymized
    const resultBeforeConsent = await letterService.getStudentResult(studentAId);
    expect(resultBeforeConsent.hasAllocation).toBe(true);
    expect(resultBeforeConsent.hostel.name).toBe("Homi Bhabha Hall");
    expect(resultBeforeConsent.hostel.roomNumber).toBe("204");
    expect(resultBeforeConsent.roommates.length).toBeGreaterThan(0);
    // Student B should appear as Private
    const rmB = resultBeforeConsent.roommates.find((r) => r.bedNo === "Bed B");
    expect(rmB?.name).toBe("Roommate (Private)");
    expect(rmB?.isConsented).toBe(false);

    // Case 2: Student A consents, but Student B has NOT consented -> Still Private (mutual requirement)
    await ConsentRecordModel.create({
      institution_id: institutionId,
      student_id: studentAId,
      purpose: "roommate_profile_share",
      granted_at: new Date(),
      text_version: "1.0",
    });

    const resultOneConsent = await letterService.getStudentResult(studentAId);
    const rmBStillPrivate = resultOneConsent.roommates.find((r) => r.bedNo === "Bed B");
    expect(rmBStillPrivate?.name).toBe("Roommate (Private)");

    // Case 3: Student B also grants consent -> Mutual consent achieved! Names revealed.
    await ConsentRecordModel.create({
      institution_id: institutionId,
      student_id: studentBId,
      purpose: "roommate_profile_share",
      granted_at: new Date(),
      text_version: "1.0",
    });

    const resultMutualConsent = await letterService.getStudentResult(studentAId);
    const rmBRevealed = resultMutualConsent.roommates.find((r) => r.bedNo === "Bed B");
    expect(rmBRevealed?.name).toBe("Rohan Varma");
    expect(rmBRevealed?.isConsented).toBe(true);
    expect(rmBRevealed?.rollNumber).toBe("22BCS045");
  });

  it("generates valid HTML letter template with institution branding, QR block and terms", () => {
    const html = letterService.generateLetterHtml(
      {
        letterId: "lid-123",
        letterNumber: "AL-2026-TEST01",
        studentId: studentAId.toString(),
        studentName: "Dev Sharma",
        studentEmail: "dev@nit.edu",
        rollNumber: "22BCS011",
        institutionId: institutionId.toString(),
        institutionName: "National Institute of Technology",
        draftId: draftId.toString(),
        cycleName: "Autumn 2026 Housing Cycle",
        academicYear: "2026-2027",
        hostelName: "Homi Bhabha Hall",
        blockName: "Tower A",
        floorNumber: 2,
        roomNumber: "204",
        bedNo: "Bed A",
        issuedDate: "2026-09-21",
        moveInStartDate: "2026-09-25",
        moveInEndDate: "2026-10-01",
        token: "header.payload.sig",
        termsVersion: "1.0",
      },
      "data:image/png;base64,mockQrCodeBase64",
    );

    expect(html).toContain("National Institute of Technology");
    expect(html).toContain("PROVISIONAL HOSTEL ALLOCATION LETTER");
    expect(html).toContain("Dev Sharma");
    expect(html).toContain("22BCS011");
    expect(html).toContain("Homi Bhabha Hall");
    expect(html).toContain("Room No");
    expect(html).toContain("204");
    expect(html).toContain("Ed25519 Cryptographically Signed");
    expect(html).toContain("Terms & Conditions of Occupancy");
    expect(html).toContain("mockQrCodeBase64");
  });
});
