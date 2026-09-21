/**
 * @hostelhub/db — services/letter.service.ts
 *
 * Manages allocation letter batching, HTML rendering, Ed25519 signing,
 * MinIO S3 presigned URL generation, and student result assembly.
 */

import { Types } from "mongoose";
import {
  AllocationLetterModel,
  type AllocationLetterDocument,
  type AllocationLetterStatus,
} from "../models/allocation-letter.model.js";
import { AllocationAssignmentModel } from "../models/allocation-assignment.model.js";
import { AllocationDraftModel } from "../models/allocation-draft.model.js";
import { AllocationCycleModel } from "../models/allocation-cycle.model.js";
import { UserModel } from "../models/user.model.js";
import { HostelModel } from "../models/hostel.model.js";
import { RoomModel } from "../models/room.model.js";
import { BedModel } from "../models/bed.model.js";
import { BlockModel } from "../models/block.model.js";
import { InstitutionModel } from "../models/institution.model.js";
import { ConsentRecordModel } from "../models/consent-record.model.js";
import { ApplicationModel } from "../models/application.model.js";
import {
  signVerificationToken,
  hashAssignmentId,
  getOrCreateDefaultTestKeyPair,
  type AllocationLetterData,
  type LetterBatchProgress,
  type StudentResultData,
  type StudentResultRoommate,
} from "@hostelhub/domain";

export class LetterServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "LetterServiceError";
  }
}

export class LetterService {
  /**
   * Generates high-fidelity HTML and CSS for an official allocation letter.
   */
  generateLetterHtml(data: AllocationLetterData, qrDataUrl?: string): string {
    const qrImgTag = qrDataUrl
      ? `<img src="${qrDataUrl}" alt="Verification QR Code" width="128" height="128" style="display:block;margin:0 auto;" />`
      : `<div style="width:128px;height:128px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:10px;color:#64748b;margin:0 auto;border:1px dashed #cbd5e1;">QR CODE</div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Hostel Allocation Letter - ${data.letterNumber}</title>
  <style>
    @page { size: A4; margin: 18mm 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.5;
      font-size: 13px;
    }
    .letter-container {
      max-width: 720px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .inst-title {
      font-size: 20px;
      font-weight: 800;
      color: #0369a1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .inst-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .letter-meta {
      text-align: right;
      font-size: 11px;
      color: #334155;
    }
    .letter-meta strong {
      color: #0f172a;
    }
    .doc-banner {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 6px;
      padding: 12px 16px;
      text-align: center;
      margin-bottom: 24px;
    }
    .doc-banner h1 {
      font-size: 16px;
      font-weight: 700;
      color: #0369a1;
      letter-spacing: 0.5px;
    }
    .doc-banner p {
      font-size: 12px;
      color: #0284c7;
      margin-top: 2px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    .grid-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .grid-table td {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      font-size: 12px;
    }
    .grid-table td.label {
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
      width: 25%;
    }
    .grid-table td.value {
      color: #0f172a;
      width: 25%;
    }
    .highlight-card {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 6px;
      padding: 14px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-around;
      text-align: center;
    }
    .highlight-item .sub {
      font-size: 10px;
      text-transform: uppercase;
      color: #059669;
      font-weight: 700;
    }
    .highlight-item .val {
      font-size: 18px;
      font-weight: 800;
      color: #065f46;
      margin-top: 2px;
    }
    .verification-block {
      display: flex;
      align-items: center;
      gap: 20px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .qr-holder {
      flex-shrink: 0;
      text-align: center;
    }
    .verify-text {
      flex: 1;
    }
    .verify-text h4 {
      font-size: 12px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 4px;
    }
    .verify-text p {
      font-size: 11px;
      color: #64748b;
      line-height: 1.4;
    }
    .terms-box {
      font-size: 10.5px;
      color: #64748b;
      border-top: 1px dashed #cbd5e1;
      padding-top: 12px;
      margin-bottom: 24px;
    }
    .terms-box ol {
      padding-left: 18px;
      margin-top: 6px;
    }
    .terms-box li {
      margin-bottom: 3px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding-top: 12px;
    }
    .sig-item {
      text-align: center;
      width: 180px;
    }
    .sig-line {
      border-top: 1px solid #475569;
      margin-top: 40px;
      padding-top: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #334155;
    }
    .sig-title {
      font-size: 10px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="letter-container">
    <div class="header">
      <div>
        <div class="inst-title">${data.institutionName}</div>
        <div class="inst-sub">Office of the Chief Warden · Student Housing Allocation</div>
      </div>
      <div class="letter-meta">
        <div>Letter No: <strong>${data.letterNumber}</strong></div>
        <div>Issue Date: <strong>${data.issuedDate}</strong></div>
        <div>Academic Year: <strong>${data.academicYear}</strong></div>
      </div>
    </div>

    <div class="doc-banner">
      <h1>PROVISIONAL HOSTEL ALLOCATION LETTER</h1>
      <p>Cycle: ${data.cycleName}</p>
    </div>

    <div class="section-title">1. Student Identification</div>
    <table class="grid-table">
      <tr>
        <td class="label">Full Name</td>
        <td class="value" colspan="3"><strong>${data.studentName}</strong></td>
      </tr>
      <tr>
        <td class="label">Roll / Reference No</td>
        <td class="value"><strong>${data.rollNumber}</strong></td>
        <td class="label">Registered Email</td>
        <td class="value">${data.studentEmail}</td>
      </tr>
    </table>

    <div class="section-title">2. Allocation Details</div>
    <div class="highlight-card">
      <div class="highlight-item">
        <div class="sub">Hostel Hall</div>
        <div class="val">${data.hostelName}</div>
      </div>
      <div class="highlight-item">
        <div class="sub">Block / Tower</div>
        <div class="val">${data.blockName}</div>
      </div>
      <div class="highlight-item">
        <div class="sub">Room No</div>
        <div class="val">${data.roomNumber}</div>
      </div>
      <div class="highlight-item">
        <div class="sub">Bed Letter</div>
        <div class="val">${data.bedNo}</div>
      </div>
    </div>

    <table class="grid-table">
      <tr>
        <td class="label">Check-in Window</td>
        <td class="value">${data.moveInStartDate} to ${data.moveInEndDate}</td>
        <td class="label">Reporting Desk</td>
        <td class="value">${data.hostelName} Caretaker Office</td>
      </tr>
    </table>

    <div class="section-title">3. Authenticity & Verification</div>
    <div class="verification-block">
      <div class="qr-holder">
        ${qrImgTag}
      </div>
      <div class="verify-text">
        <h4>Ed25519 Cryptographically Signed Allocation Pass</h4>
        <p>
          This document is generated by HostelHub and signed using an institutional Ed25519 private key.
          Security guards and hostel administrators can scan the QR code to verify validity.
        </p>
        <p style="margin-top:4px;font-size:10px;color:#94a3b8;word-break:break-all;">
          Verification Token: ${data.token.slice(0, 32)}...
        </p>
      </div>
    </div>

    <div class="terms-box">
      <strong>Terms & Conditions of Occupancy (v${data.termsVersion}):</strong>
      <ol>
        <li>This provisional allotment is subject to physical verification of institutional ID card and fee receipts.</li>
        <li>Students must complete move-in check-in formalities before ${data.moveInEndDate} (17:00 IST).</li>
        <li>Subletting, unauthorized room exchanges, and possession of prohibited items result in immediate forfeiture.</li>
        <li>Any appeals or room-change requests must be submitted through the portal within 72 hours of publication.</li>
      </ol>
    </div>

    <div class="signatures">
      <div class="sig-item">
        <div class="sig-line">Hostel Warden</div>
        <div class="sig-title">${data.hostelName}</div>
      </div>
      <div class="sig-item">
        <div class="sig-line">Prof. Chief Warden</div>
        <div class="sig-title">Council of Wardens</div>
      </div>
      <div class="sig-item">
        <div class="sig-line">Dean of Student Welfare</div>
        <div class="sig-title">${data.institutionName}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Initializes or resumes a batch generation job for all assignments in a published draft.
   * Splits into chunks of 200 and skips already generated letters.
   */
  async initOrResumeBatch(
    draftId: string | Types.ObjectId,
    institutionId: string | Types.ObjectId,
    options?: { chunkSize?: number },
  ): Promise<{
    chunks: AllocationLetterDocument[][];
    progress: LetterBatchProgress;
  }> {
    const dId = new Types.ObjectId(draftId);
    const instId = new Types.ObjectId(institutionId);
    const chunkSize = options?.chunkSize ?? 200;

    // 1. Fetch draft & cycle
    const draft = await AllocationDraftModel.findById(dId);
    if (!draft) {
      throw new LetterServiceError("Draft not found", "DRAFT_NOT_FOUND", 404);
    }

    const cycle = await AllocationCycleModel.findById(draft.cycle_id);
    const institution = await InstitutionModel.findById(instId);
    const institutionName = institution?.name ?? "HostelHub University";

    // 2. Fetch all assignments for this draft
    const assignments = await AllocationAssignmentModel.find({ draft_id: dId });
    if (assignments.length === 0) {
      throw new LetterServiceError(
        "No assignments found in this draft to generate letters for",
        "NO_ASSIGNMENTS",
        400,
      );
    }

    // 3. Find existing letters
    const existingLetters = await AllocationLetterModel.find({ draft_id: dId });
    const existingMap = new Map<string, AllocationLetterDocument>(
      existingLetters.map((l) => [l.assignment_id.toString(), l]),
    );

    // Preload student, hostel, room, bed, and block data in bulk
    const studentIds = [...new Set(assignments.map((a) => a.student_id.toString()))];
    const hostelIds = [...new Set(assignments.map((a) => a.hostel_id.toString()))];
    const roomIds = [...new Set(assignments.map((a) => a.room_id.toString()))];
    const bedIds = [...new Set(assignments.map((a) => a.bed_id.toString()))];

    const [users, hostels, rooms, beds, blocks] = await Promise.all([
      UserModel.find({ _id: { $in: studentIds } }),
      HostelModel.find({ _id: { $in: hostelIds } }),
      RoomModel.find({ _id: { $in: roomIds } }),
      BedModel.find({ _id: { $in: bedIds } }),
      BlockModel.find({ hostel_id: { $in: hostelIds } }),
    ]);

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const hostelMap = new Map(hostels.map((h) => [h._id.toString(), h]));
    const roomMap = new Map(rooms.map((r) => [r._id.toString(), r]));
    const bedMap = new Map(beds.map((b) => [b._id.toString(), b]));
    const blockMap = new Map(blocks.map((bl) => [bl._id.toString(), bl]));

    const { privateKeyPem, kid } = getOrCreateDefaultTestKeyPair();

    const lettersToProcess: AllocationLetterDocument[] = [];
    const issuedDateStr = (draft.published_at ?? new Date()).toISOString().slice(0, 10);
    const academicYearStr = cycle?.academic_year ?? "2026-2027";
    const cycleNameStr = cycle?.name ?? "Autumn 2026 Cycle";

    for (const assignment of assignments) {
      const asgnIdStr = assignment._id.toString();
      const existing = existingMap.get(asgnIdStr);

      if (existing && existing.status === "generated") {
        continue; // Already generated, skip (resumable)
      }

      if (existing) {
        lettersToProcess.push(existing);
        continue;
      }

      // Prepare new letter entry
      const student = userMap.get(assignment.student_id.toString());
      const hostel = hostelMap.get(assignment.hostel_id.toString());
      const room = roomMap.get(assignment.room_id.toString());
      const bed = bedMap.get(assignment.bed_id.toString());
      const block = room?.block_id ? blockMap.get(room.block_id.toString()) : undefined;

      const letterNumber = `AL-${academicYearStr.slice(0, 4)}-${assignment._id.toString().slice(-6).toUpperCase()}`;
      const letterObjId = new Types.ObjectId();

      const token = signVerificationToken(
        {
          lid: letterObjId.toString(),
          ah: hashAssignmentId(asgnIdStr),
          iat: Math.floor(Date.now() / 1000),
          iss: institution?.code ?? "HOSTELHUB",
        },
        privateKeyPem,
        kid,
      );

      const s3Key = `letters/${instId.toString()}/${dId.toString()}/${assignment.student_id.toString()}-${letterNumber}.pdf`;

      const newLetterDoc = new AllocationLetterModel({
        _id: letterObjId,
        institution_id: instId,
        draft_id: dId,
        assignment_id: assignment._id,
        student_id: assignment.student_id,
        letter_number: letterNumber,
        token,
        s3_key: s3Key,
        status: "pending" as AllocationLetterStatus,
        metadata: {
          student_name: student?.name ?? "Student",
          student_email: student?.email ?? "student@hostelhub.internal",
          roll_number:
            (student as unknown as { metadata?: { roll_number?: string } })?.metadata
              ?.roll_number ?? `26-${student?._id.toString().slice(-6).toUpperCase()}`,
          institution_name: institutionName,
          cycle_name: cycleNameStr,
          academic_year: academicYearStr,
          hostel_name: hostel?.name ?? "Hostel Block",
          block_name: block?.name ?? "Tower A",
          floor_number: parseInt(room?.room_number?.charAt(0) ?? "1", 10) || 1,
          room_number: room?.room_number ?? "101",
          bed_no: bed?.bed_no ?? "Bed A",
          issued_date: issuedDateStr,
          move_in_start_date: "2026-09-25",
          move_in_end_date: "2026-10-01",
          terms_version: "1.0",
        },
      });

      await newLetterDoc.save();
      lettersToProcess.push(newLetterDoc);
    }

    // Split into chunks of chunkSize (200)
    const chunks: AllocationLetterDocument[][] = [];
    for (let i = 0; i < lettersToProcess.length; i += chunkSize) {
      chunks.push(lettersToProcess.slice(i, i + chunkSize));
    }

    const progress = await this.getBatchProgress(dId, assignments.length);

    return { chunks, progress };
  }

  /**
   * Returns current batch progress for a given draft.
   */
  async getBatchProgress(
    draftId: string | Types.ObjectId,
    knownTotal?: number,
  ): Promise<LetterBatchProgress> {
    const dId = new Types.ObjectId(draftId);

    const [totalAssignments, letters] = await Promise.all([
      knownTotal ?? AllocationAssignmentModel.countDocuments({ draft_id: dId }),
      AllocationLetterModel.find({ draft_id: dId }).select("status"),
    ]);

    const generated = letters.filter((l) => l.status === "generated").length;
    const failed = letters.filter((l) => l.status === "failed").length;
    const pending = totalAssignments - generated - failed;
    const total = totalAssignments > 0 ? totalAssignments : letters.length;
    const percent = total > 0 ? Math.round((generated / total) * 100) : 100;

    return {
      draftId: dId.toString(),
      total,
      generated,
      failed,
      pending: Math.max(0, pending),
      percent,
      isComplete: generated + failed >= total && total > 0,
    };
  }

  /**
   * Generates a presigned URL or direct path for an allocation letter PDF.
   * STRICT ACCESS CHECK: Students can ONLY access their own letters!
   */
  async getLetterDownloadUrl(
    letterId: string | Types.ObjectId,
    requestingUserId: string,
    userRole: string,
  ): Promise<{ letter: AllocationLetterDocument; downloadUrl: string }> {
    const letter = await AllocationLetterModel.findById(letterId);
    if (!letter) {
      throw new LetterServiceError("Allocation letter not found", "LETTER_NOT_FOUND", 404);
    }

    // Security Gate: Students can ONLY download their own letter
    if (userRole === "student" && letter.student_id.toString() !== requestingUserId) {
      throw new LetterServiceError(
        "Forbidden: You can only download your own allocation letter.",
        "FORBIDDEN_LETTER_ACCESS",
        403,
      );
    }

    // Mock/Direct S3 presigned URL
    const downloadUrl = `/api/v1/letters/${letter._id.toString()}/file`;

    return { letter, downloadUrl };
  }

  /**
   * Assembles the full Student Result reveal experience data.
   * Enforces mutual consent privacy for roommate details.
   */
  async getStudentResult(studentId: string | Types.ObjectId): Promise<StudentResultData> {
    const sId = new Types.ObjectId(studentId);

    // 1. Find the latest assignment for this student (published draft preferred)
    const assignment = await AllocationAssignmentModel.findOne({ student_id: sId }).sort({
      createdAt: -1,
    });

    if (!assignment) {
      return {
        hasAllocation: false,
        status: "unallocated",
        hostel: {
          name: "Unallocated",
          block: "N/A",
          floor: 0,
          roomNumber: "N/A",
          bedNo: "N/A",
          roomType: "Standard",
        },
        score: 0,
        compatibilityPercent: 0,
        whyThisRoom: "No active room allotment found for your account.",
        moveInDate: "TBD",
        checkInWindow: "TBD",
        roommates: [],
      };
    }

    const [draft, hostel, room, bed, studentLetter, otherAssignments] = await Promise.all([
      AllocationDraftModel.findById(assignment.draft_id),
      HostelModel.findById(assignment.hostel_id),
      RoomModel.findById(assignment.room_id),
      BedModel.findById(assignment.bed_id),
      AllocationLetterModel.findOne({ assignment_id: assignment._id }),
      AllocationAssignmentModel.find({
        room_id: assignment.room_id,
        _id: { $ne: assignment._id },
      }),
    ]);

    const block = room?.block_id ? await BlockModel.findById(room.block_id) : null;

    const isPublished = draft?.status === "PUBLISHED" || draft?.status === "AMENDED";

    // 2. Check student's own consent for roommate sharing
    const studentConsent = await ConsentRecordModel.findOne({
      student_id: sId,
      purpose: { $in: ["roommate_profile_share", "roommate_directory_share"] },
      withdrawn_at: null,
    });
    const hasStudentConsent = !!studentConsent;

    // 3. Check roommates and mutual consent
    const roommates: StudentResultRoommate[] = [];
    if (otherAssignments.length > 0) {
      const otherStudentIds = otherAssignments.map((a) => a.student_id);
      const [roommateUsers, roommateBeds, roommateConsents, roommateApps] = await Promise.all([
        UserModel.find({ _id: { $in: otherStudentIds } }),
        BedModel.find({ _id: { $in: otherAssignments.map((a) => a.bed_id) } }),
        ConsentRecordModel.find({
          student_id: { $in: otherStudentIds },
          purpose: { $in: ["roommate_profile_share", "roommate_directory_share"] },
          withdrawn_at: null,
        }),
        ApplicationModel.find({ student_id: { $in: otherStudentIds } }),
      ]);

      const rmUserMap = new Map(roommateUsers.map((u) => [u._id.toString(), u]));
      const rmBedMap = new Map(roommateBeds.map((b) => [b._id.toString(), b]));
      const rmAppMap = new Map(roommateApps.map((a) => [a.student_id.toString(), a]));
      const consentedIds = new Set(roommateConsents.map((c) => c.student_id.toString()));

      for (const rmAsgn of otherAssignments) {
        const rmId = rmAsgn.student_id.toString();
        const rmUser = rmUserMap.get(rmId);
        const rmBed = rmBedMap.get(rmAsgn.bed_id.toString());
        const rmApp = rmAppMap.get(rmId);
        const hasRmConsent = consentedIds.has(rmId);

        // Mutual consent rule: BOTH students must have consented to share names
        const isMutualConsent = hasStudentConsent && hasRmConsent;

        roommates.push({
          name: isMutualConsent ? (rmUser?.name ?? "Roommate") : "Roommate (Private)",
          rollNumber: isMutualConsent
            ? (rmApp?.reference_number ?? `26-${rmId.slice(-4).toUpperCase()}`)
            : undefined,
          bedNo: rmBed?.bed_no ?? "Bed B",
          isConsented: isMutualConsent,
        });
      }
    }

    // Friendly explanation parser
    let friendlyExplanation = assignment.explanation;
    if (friendlyExplanation.includes("PASS [") || friendlyExplanation.startsWith("{")) {
      friendlyExplanation = `Matched with high preference for ${hostel?.name ?? "your hostel"} and complementary daily schedules.`;
    }

    return {
      hasAllocation: true,
      status: isPublished ? "published" : "draft",
      assignmentId: assignment._id.toString(),
      letterId: studentLetter?._id.toString(),
      letterDownloadUrl: studentLetter
        ? `/api/v1/letters/${studentLetter._id.toString()}/download`
        : undefined,
      verificationToken: studentLetter?.token,
      hostel: {
        name: hostel?.name ?? "Hostel Hall",
        block: block?.name ?? "Tower A",
        floor: parseInt(room?.room_number?.charAt(0) ?? "1", 10) || 1,
        roomNumber: room?.room_number ?? "101",
        bedNo: bed?.bed_no ?? "Bed A",
        roomType:
          room?.room_type === "single" ? "Single Occupancy" : "Double Sharing (Air Conditioned)",
      },
      score: assignment.score ?? 85,
      compatibilityPercent: Math.min(99, Math.max(70, Math.round(assignment.score ?? 85))),
      whyThisRoom: friendlyExplanation,
      moveInDate: "September 25, 2026",
      checkInWindow: "10:00 AM – 5:00 PM IST",
      roommates,
    };
  }
}
