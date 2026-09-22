/**
 * @hostelhub/db — __tests__/payment.test.ts
 *
 * Tests for Prompt O4: Payments Sandbox, Receipts and Refund Details (E13)
 * Requirements:
 * - Razorpay test-mode adapter: order creation, signature verification, webhook processing
 * - Amounts stored as integers in paise (rejection of floats)
 * - Tampered signature rejection
 * - Duplicate payment attempt rejection
 * - Idempotent webhook replay handling
 * - Receipt PDF generation through the letter/audit pipeline
 * - Refund details form with IFSC validation, AES-256-GCM encryption, and masked display
 * - Student dashboard summary and warden unpaid policy flagging (warning / hold)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import {
  InstitutionModel,
  AllocationCycleModel,
  AllocationDraftModel,
  AllocationAssignmentModel,
  HostelModel,
  BlockModel,
  RoomModel,
  BedModel,
  UserModel,
  PaymentOrderModel,
  RefundAccountModel,
  PaymentService,
  PaymentServiceError,
} from "../index.js";
import { RazorpayTestAdapter } from "@hostelhub/domain";

describe("Prompt O4: Payments Sandbox, Receipts & Refund Details (E13)", () => {
  let replSet: MongoMemoryReplSet;
  let paymentService: PaymentService;
  let adapter: RazorpayTestAdapter;

  const institutionId = new Types.ObjectId();
  const studentId = new Types.ObjectId();
  const unpaidStudentId = new Types.ObjectId();
  const hostelId = new Types.ObjectId();
  const blockId = new Types.ObjectId();
  const roomId = new Types.ObjectId();
  const bedId = new Types.ObjectId();
  const cycleId = new Types.ObjectId();
  const draftId = new Types.ObjectId();
  const runId = new Types.ObjectId();
  const assignmentId = new Types.ObjectId();

  const wardenActor = {
    id: new Types.ObjectId().toString(),
    email: "warden@campus.edu",
    role: "warden" as const,
    name: "Dr. Warden",
  };

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    await mongoose.connect(replSet.getUri());

    adapter = new RazorpayTestAdapter({
      keyId: "rzp_test_xyz1234567890",
      keySecret: "test_secret_abcdef123456",
      webhookSecret: "test_webhook_secret_987654",
    });

    paymentService = new PaymentService(institutionId, adapter);

    // 1. Institution
    await InstitutionModel.create({
      _id: institutionId,
      name: "Indian Institute of Technology Test",
      code: "IIT-TEST",
      institution_id: institutionId,
      status: "active",
    });

    // 2. Students
    await UserModel.create({
      _id: studentId,
      institution_id: institutionId,
      email: "rahul.sharma@campus.edu",
      role: "student",
      name: "Rahul Sharma",
      roll_number: "2026CS101",
      status: "active",
    });

    await UserModel.create({
      _id: unpaidStudentId,
      institution_id: institutionId,
      email: "ananya.patel@campus.edu",
      role: "student",
      name: "Ananya Patel",
      roll_number: "2026EC204",
      status: "active",
    });

    // 3. Hostel, Block, Room, Bed
    await HostelModel.create({
      _id: hostelId,
      institution_id: institutionId,
      name: "Kaveri Hostel",
      code: "KV",
      gender_policy: "coed",
      address: "Campus South Zone",
      status: "active",
    });

    await BlockModel.create({
      _id: blockId,
      institution_id: institutionId,
      hostel_id: hostelId,
      name: "A Block",
      floor_no: 1,
      wing: "A",
    });

    await RoomModel.create({
      _id: roomId,
      institution_id: institutionId,
      hostel_id: hostelId,
      block_id: blockId,
      room_number: "A-201",
      floor: 2,
      capacity: 2,
      room_type: "double",
      status: "available",
    });

    await BedModel.create({
      _id: bedId,
      institution_id: institutionId,
      room_id: roomId,
      bed_no: "1",
      status: "occupied",
    });

    // 4. Cycle, Draft, Assignment
    await AllocationCycleModel.create({
      _id: cycleId,
      institution_id: institutionId,
      name: "Academic Year 2026-27",
      academic_year: "2026-27",
      status: "closed",
      window_open: new Date("2026-07-01"),
      window_close: new Date("2026-07-15"),
    });

    await AllocationDraftModel.create({
      _id: draftId,
      institution_id: institutionId,
      cycle_id: cycleId,
      run_id: runId,
      status: "PUBLISHED",
      approval_id: new Types.ObjectId(),
      version_number: 1,
      seed: 42,
      input_hash: "seed-hash",
      published_at: new Date(),
      statistics: {
        total_applicants: 2,
        allocated_count: 2,
        unallocated_count: 0,
        male_allocated: 1,
        female_allocated: 1,
        quota_breakdown: {},
        avg_rank_assigned: 1,
      },
    });

    const appId = new Types.ObjectId();
    await AllocationAssignmentModel.create({
      _id: assignmentId,
      institution_id: institutionId,
      draft_id: draftId,
      run_id: runId,
      application_id: appId,
      student_id: unpaidStudentId,
      hostel_id: hostelId,
      room_id: roomId,
      bed_id: bedId,
      score: 95,
      explanation: "Merit allocation",
      assigned_rank: 1,
      preference_score: 95,
      is_locked: false,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  describe("1. Order Creation & Amount in Paise Validation", () => {
    it("creates a payment order stored as an integer in paise", async () => {
      const { gatewayOrder: order } = await paymentService.createPaymentOrder(
        studentId.toString(),
        {
          feeType: "hostel_rent",
          amountPaise: 4250000, // Rs. 42,500.00
          description: "Semester 1 Kaveri Hostel Rent",
          notes: { semester: "1" },
        },
      );

      expect(order.orderId).toMatch(/^order_/);
      expect(order.amountPaise).toBe(4250000);
      expect(order.currency).toBe("INR");
      expect(order.receiptNumber).toMatch(/^REC-\d{4}-[A-Z0-9]{6}$/);

      const doc = await PaymentOrderModel.findOne({ order_id: order.orderId });
      expect(doc).not.toBeNull();
      expect(doc!.amount_paise).toBe(4250000);
      expect(doc!.status).toBe("created");
      expect(doc!.policy_flag).toBe("none");
    });

    it("rejects fractional amounts (floats) to prevent precision errors", async () => {
      await expect(
        paymentService.createPaymentOrder(studentId.toString(), {
          feeType: "mess_fee",
          amountPaise: 15000.5,
          description: "Fractional paise test",
        }),
      ).rejects.toThrow(/must be a positive integer in paise/i);
    });

    it("rejects non-positive amounts", async () => {
      await expect(
        paymentService.createPaymentOrder(studentId.toString(), {
          feeType: "caution_deposit",
          amountPaise: 0,
          description: "Zero amount",
        }),
      ).rejects.toThrow(/must be a positive integer in paise/i);

      await expect(
        paymentService.createPaymentOrder(studentId.toString(), {
          feeType: "caution_deposit",
          amountPaise: -5000,
          description: "Negative amount",
        }),
      ).rejects.toThrow(/must be a positive integer in paise/i);
    });
  });

  describe("2. Payment Signature Verification & Tampering Rejection", () => {
    it("verifies authentic signature and marks order as paid", async () => {
      const { gatewayOrder: order } = await paymentService.createPaymentOrder(
        studentId.toString(),
        {
          feeType: "caution_deposit",
          amountPaise: 500000, // Rs. 5,000
          description: "Hostel Caution Deposit",
        },
      );

      const paymentId = "pay_test_deposit_999";
      const validSignature = adapter.generateTestSignature(order.orderId, paymentId);

      const verified = await paymentService.verifyAndRecordPayment(studentId.toString(), {
        orderId: order.orderId,
        paymentId,
        signature: validSignature,
        method: "upi",
      });

      expect(verified.order.status).toBe("paid");
      expect(verified.order.paid_at).toBeDefined();
      expect(verified.order.payment_id).toBe(paymentId);

      const doc = await PaymentOrderModel.findOne({ order_id: order.orderId });
      expect(doc!.status).toBe("paid");
      expect(doc!.signature).toBe(validSignature);
    });

    it("rejects tampered signature with INVALID_SIGNATURE error", async () => {
      const { gatewayOrder: order } = await paymentService.createPaymentOrder(
        studentId.toString(),
        {
          feeType: "mess_fee",
          amountPaise: 1800000,
          description: "Mess Advance",
        },
      );

      const paymentId = "pay_test_tampered_111";
      const validSignature = adapter.generateTestSignature(order.orderId, paymentId);
      // Alter signature
      const tamperedSignature = validSignature.slice(0, -4) + "dead";

      await expect(
        paymentService.verifyAndRecordPayment(studentId.toString(), {
          orderId: order.orderId,
          paymentId,
          signature: tamperedSignature,
        }),
      ).rejects.toThrow(PaymentServiceError);

      try {
        await paymentService.verifyAndRecordPayment(studentId.toString(), {
          orderId: order.orderId,
          paymentId,
          signature: tamperedSignature,
        });
      } catch (err: unknown) {
        expect((err as PaymentServiceError).code).toBe("INVALID_SIGNATURE");
      }

      // Ensure order remains created, not paid
      const doc = await PaymentOrderModel.findOne({ order_id: order.orderId });
      expect(doc!.status).toBe("created");
    });

    it("rejects duplicate payment attempt on already paid order", async () => {
      const { gatewayOrder: order } = await paymentService.createPaymentOrder(
        studentId.toString(),
        {
          feeType: "hostel_rent",
          amountPaise: 2500000,
          description: "Rent Part 2",
        },
      );

      const paymentId = "pay_test_dup_001";
      const sig = adapter.generateTestSignature(order.orderId, paymentId);

      await paymentService.verifyAndRecordPayment(studentId.toString(), {
        orderId: order.orderId,
        paymentId,
        signature: sig,
      });

      // Second payment attempt on the same order
      await expect(
        paymentService.verifyAndRecordPayment(studentId.toString(), {
          orderId: order.orderId,
          paymentId: "pay_test_dup_002",
          signature: adapter.generateTestSignature(order.orderId, "pay_test_dup_002"),
        }),
      ).rejects.toThrow(/already been paid/i);
    });
  });

  describe("3. Webhook Handling & Replay Idempotency", () => {
    it("handles webhook signature verification and transitions order to paid", async () => {
      const { gatewayOrder: order } = await paymentService.createPaymentOrder(
        studentId.toString(),
        {
          feeType: "hostel_rent",
          amountPaise: 3000000,
          description: "Webhook Test Order",
        },
      );

      const eventPayload = {
        id: "evt_test_webhook_01",
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_test_hook_01",
              order_id: order.orderId,
              amount: 3000000,
              status: "captured",
              method: "netbanking",
            },
          },
        },
      };

      const rawBody = JSON.stringify(eventPayload);
      const signature = adapter.generateWebhookSignature(rawBody);

      const result = await paymentService.handleWebhook(rawBody, signature, eventPayload);
      expect(result.processed).toBe(true);
      expect(result.orderId).toBe(order.orderId);
      expect(result.status).toBe("paid");

      const doc = await PaymentOrderModel.findOne({ order_id: order.orderId });
      expect(doc!.status).toBe("paid");
      expect(doc!.webhook_events.length).toBe(1);
      expect(doc!.webhook_events[0]?.event_id).toBe("evt_test_webhook_01");
    });

    it("idempotently handles webhook replay without re-processing", async () => {
      const { gatewayOrder: order } = await paymentService.createPaymentOrder(
        studentId.toString(),
        {
          feeType: "mess_fee",
          amountPaise: 1200000,
          description: "Webhook Replay Test Order",
        },
      );

      const eventPayload = {
        id: "evt_test_replay_02",
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_test_replay_02",
              order_id: order.orderId,
              amount: 1200000,
              status: "captured",
            },
          },
        },
      };

      const rawBody = JSON.stringify(eventPayload);
      const signature = adapter.generateWebhookSignature(rawBody);

      // First webhook delivery
      const firstResult = await paymentService.handleWebhook(rawBody, signature, eventPayload);
      expect(firstResult.processed).toBe(true);
      expect(firstResult.duplicate).toBeUndefined();

      // Second webhook delivery (replay attack / duplicate webhook delivery)
      const secondResult = await paymentService.handleWebhook(rawBody, signature, eventPayload);
      expect(secondResult.processed).toBe(true);
      expect(secondResult.duplicate).toBe(true);

      const doc = await PaymentOrderModel.findOne({ order_id: order.orderId });
      // Event log should still have exactly 1 record, not duplicate
      expect(doc!.webhook_events.length).toBe(1);
    });

    it("rejects invalid webhook signature", async () => {
      const rawBody = JSON.stringify({ event: "dummy" });
      await expect(
        paymentService.handleWebhook(rawBody, "invalid_sig_abc", {
          id: "1",
          event: "dummy",
          payload: {},
        }),
      ).rejects.toThrow(/invalid webhook signature/i);
    });
  });

  describe("4. Receipt PDF Generation through Letter Pipeline", () => {
    it("generates a valid PDF receipt for a paid order", async () => {
      const { gatewayOrder: order } = await paymentService.createPaymentOrder(
        studentId.toString(),
        {
          feeType: "full_semester",
          amountPaise: 5500000,
          description: "Full Semester Hostel & Mess Fees",
        },
      );

      const paymentId = "pay_test_pdf_01";
      await paymentService.verifyAndRecordPayment(studentId.toString(), {
        orderId: order.orderId,
        paymentId,
        signature: adapter.generateTestSignature(order.orderId, paymentId),
      });

      const { pdfBuffer, filename } = await paymentService.generateReceiptPdf(order.orderId);
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(100);
      // Valid PDF magic header
      expect(pdfBuffer.subarray(0, 4).toString("utf-8")).toBe("%PDF");
      expect(filename).toMatch(/receipt-.*\.pdf/);

      // Check receipt S3 key was stored
      const doc = await PaymentOrderModel.findOne({ order_id: order.orderId });
      expect(doc!.receipt_s3_key).toBeDefined();
    });

    it("refuses to generate receipt for unpaid order", async () => {
      const { gatewayOrder: order } = await paymentService.createPaymentOrder(
        studentId.toString(),
        {
          feeType: "hostel_rent",
          amountPaise: 2000000,
          description: "Unpaid Receipt Test",
        },
      );

      await expect(paymentService.generateReceiptPdf(order.orderId)).rejects.toThrow(
        /only be generated for paid orders/i,
      );
    });
  });

  describe("5. Refund Account Details with IFSC Validation & AES-256-GCM Encryption", () => {
    it("validates IFSC code via Razorpay IFSC test catalog and saves encrypted account details", async () => {
      const saved = await paymentService.saveRefundAccount(studentId.toString(), {
        accountHolderName: "Rahul Sharma",
        accountNumber: "123456789012",
        ifscCode: "SBIN0000691",
      });

      expect(saved.studentId).toBe(studentId.toString());
      expect(saved.accountNumberLast4).toBe("9012");
      expect(saved.maskedAccountNumber).toBe("•••• 9012");
      expect(saved.bankName).toBe("State Bank of India");
      expect(saved.branchName).toBe("Roorkee IIT");
      expect(saved.verified).toBe(true);

      // Verify raw database record: account number is NOT in plaintext
      const dbDoc = await RefundAccountModel.findOne({ student_id: studentId });
      expect(dbDoc).not.toBeNull();
      expect(dbDoc!.encrypted_account).toBeDefined();
      expect(dbDoc!.encrypted_account.ciphertext).toBeDefined();
      expect(dbDoc!.encrypted_account.iv).toBeDefined();
      expect(dbDoc!.encrypted_account.authTag).toBeDefined();
      // Raw document should not have unencrypted number
      expect((dbDoc as unknown as Record<string, unknown>).account_number).toBeUndefined();

      // Retrieve masked
      const masked = await paymentService.getRefundAccount(studentId.toString());
      expect(masked).not.toBeNull();
      expect(masked!.maskedAccountNumber).toBe("•••• 9012");

      // Retrieve decrypted for authorized disbursement
      const decrypted = await paymentService.getDecryptedRefundAccount(
        studentId.toString(),
        "chief_warden",
      );
      expect(decrypted).not.toBeNull();
      expect(decrypted!.accountNumber).toBe("123456789012");
    });

    it("rejects invalid IFSC code", async () => {
      await expect(
        paymentService.saveRefundAccount(studentId.toString(), {
          accountHolderName: "Rahul Sharma",
          accountNumber: "123456789012",
          ifscCode: "INVALID999",
        }),
      ).rejects.toThrow(/invalid ifsc code/i);
    });
  });

  describe("6. Student Payment Summary & Warden Unpaid Policy Enforcement", () => {
    it("aggregates student payment summary correctly", async () => {
      const summary = await paymentService.getStudentPaymentSummary(studentId.toString());
      expect(summary.totalPaidPaise).toBeGreaterThan(0);
      expect(summary.recentOrders?.length).toBeGreaterThan(0);
      expect(summary.refundAccount).not.toBeNull();
      expect(summary.refundAccount?.verified).toBe(true);
    });

    it("flags unpaid residents to wardens with configurable policy (warning / hold)", async () => {
      // First check with warning policy
      const warningList = await paymentService.getUnpaidResidents(
        wardenActor,
        "warning",
        hostelId.toString(),
      );

      expect(warningList.length).toBeGreaterThanOrEqual(1);
      const unpaidStudent = warningList.find((r) => r.studentId === unpaidStudentId.toString());
      expect(unpaidStudent).toBeDefined();
      expect(unpaidStudent!.policyFlag).toBe("warning");
      expect(unpaidStudent!.hostelName).toBe("Kaveri Hostel");

      // Verify order created for unpaid student with warning flag
      let orderDoc = await PaymentOrderModel.findOne({ student_id: unpaidStudentId });
      expect(orderDoc).not.toBeNull();
      expect(orderDoc!.policy_flag).toBe("warning");

      // Now switch policy to 'hold'
      const holdList = await paymentService.getUnpaidResidents(
        wardenActor,
        "hold",
        hostelId.toString(),
      );
      const holdStudent = holdList.find((r) => r.studentId === unpaidStudentId.toString());
      expect(holdStudent).toBeDefined();
      expect(holdStudent!.policyFlag).toBe("hold");

      orderDoc = await PaymentOrderModel.findOne({ student_id: unpaidStudentId });
      expect(orderDoc!.policy_flag).toBe("hold");
    });
  });
});
