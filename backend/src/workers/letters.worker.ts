import { Worker, Queue, type Job } from "bullmq";
import { Types } from "mongoose";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { getRedisClient } from "../config/redis.js";
import { logger } from "../config/logger.js";
import {
  AllocationLetterModel,
  AllocationAssignmentModel,
  UserModel,
  HostelModel,
  RoomModel,
  BedModel,
  InstitutionModel,
} from "@hostelhub/db";
import { getStorageAdapter } from "../adapters/storage/index.js";
import { signHmacPayload } from "../common/security/signatures.js";
import { env } from "../config/env.js";

export const LETTERS_QUEUE_NAME = "letters-queue";

export interface LetterJobPayload {
  assignmentId: string;
  institutionId: string;
  cycleId: string;
}

export function createLettersQueue(): Queue<LetterJobPayload> {
  const redis = getRedisClient();
  return new Queue<LetterJobPayload>(LETTERS_QUEUE_NAME, {
    connection: redis,
  });
}

export function startLettersWorker(): Worker<LetterJobPayload> {
  const redis = getRedisClient();
  const storage = getStorageAdapter();

  return new Worker<LetterJobPayload>(
    LETTERS_QUEUE_NAME,
    async (job: Job<LetterJobPayload>) => {
      const { assignmentId, institutionId, cycleId } = job.data;
      logger.info({ assignmentId }, "Generating PDF allocation letter");

      const assignment = await AllocationAssignmentModel.findById(assignmentId);
      if (!assignment) throw new Error(`Assignment ${assignmentId} not found`);

      const [student, hostel, room, bed, institution] = await Promise.all([
        UserModel.findById(assignment.student_id),
        HostelModel.findById(assignment.hostel_id),
        RoomModel.findById(assignment.room_id),
        BedModel.findById(assignment.bed_id),
        InstitutionModel.findById(institutionId),
      ]);

      if (!student || !hostel || !room || !bed) {
        throw new Error("Required metadata missing for letter generation");
      }

      const verificationPayload = {
        assignmentId: assignment._id.toString(),
        studentId: student._id.toString(),
        hostelName: hostel.name,
        roomNumber: room.room_number,
        bedNumber: bed.bed_no,
        issuedAt: new Date().toISOString(),
      };
      const verificationSignature = signHmacPayload(verificationPayload, env.JWT_SECRET);
      const verificationToken = Buffer.from(
        JSON.stringify({ ...verificationPayload, sig: verificationSignature }),
      ).toString("base64url");

      const qrDataUrl = await QRCode.toDataURL(
        `https://hostelhub.local/verify/${verificationToken}`,
      );

      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", reject);

        doc.fontSize(20).text(institution?.name || "HostelHub University", { align: "center" });
        doc.moveDown(0.5);
        doc
          .fontSize(14)
          .text("OFFICIAL HOSTEL ALLOCATION LETTER", { align: "center", underline: true });
        doc.moveDown(1.5);

        doc.fontSize(10).text(`Date: ${new Date().toLocaleDateString()}`, { align: "right" });
        doc.moveDown();

        doc.fontSize(12).text(`Student Name: ${student.name}`);
        doc.text(`Student ID / Email: ${student.email}`);
        doc.moveDown();

        doc.rect(50, doc.y, 500, 100).stroke();
        const startY = doc.y + 10;
        doc.text(`Hostel: ${hostel.name}`, 60, startY);
        doc.text(`Room Number: ${room.room_number}`, 60, startY + 20);
        doc.text(`Bed Number: ${bed.bed_no}`, 60, startY + 40);
        doc.text(`Room Type: ${room.room_type}`, 60, startY + 60);

        doc.y = startY + 110;
        doc.moveDown();

        doc
          .fontSize(10)
          .text(
            "Please present this letter and the verification QR code at the hostel warden office during check-in.",
            { align: "left" },
          );
        doc.moveDown();

        const qrImageBuffer = Buffer.from(qrDataUrl.split(",")[1] || "", "base64");
        doc.image(qrImageBuffer, 50, doc.y, { width: 100 });

        doc
          .fontSize(8)
          .text(`Verification Token: ${verificationToken.substring(0, 32)}...`, 160, doc.y + 40);

        doc.end();
      });

      const storageKey = `letters/${institutionId}/${cycleId}/${assignment._id}.pdf`;
      const fileUrl = await storage.uploadFile(storageKey, pdfBuffer, "application/pdf");

      await AllocationLetterModel.findOneAndUpdate(
        { assignment_id: assignment._id },
        {
          institution_id: new Types.ObjectId(institutionId),
          draft_id: assignment.draft_id,
          assignment_id: assignment._id,
          student_id: student._id,
          letter_number: `LET-${Date.now()}`,
          token: verificationToken,
          s3_key: fileUrl,
          status: "generated",
          generated_at: new Date(),
          metadata: {
            student_name: student.name,
            student_email: student.email,
            roll_number: "STD-100",
            institution_name: institution?.name || "Demo University",
            cycle_name: "Cycle 1",
            academic_year: "2025-2026",
            hostel_name: hostel.name,
            block_name: "Main Block",
            floor_number: 1,
            room_number: room.room_number,
            bed_no: bed.bed_no,
            issued_date: new Date().toISOString(),
            move_in_start_date: new Date().toISOString(),
            move_in_end_date: new Date().toISOString(),
            terms_version: "v1.0",
          },
        },
        { upsert: true, new: true },
      );

      logger.info({ assignmentId, fileUrl }, "Allocation letter generated and saved");
    },
    { connection: redis, concurrency: 5 },
  );
}
