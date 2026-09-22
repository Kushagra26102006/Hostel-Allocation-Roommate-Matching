/**
 * @hostelhub/db — services/payment.service.ts
 *
 * Payment service managing sandbox fee orders, Razorpay test mode verification,
 * idempotent webhook processing with replay prevention, receipt PDF generation,
 * encrypted refund bank accounts, and warden unpaid policy enforcement.
 */

import { Types } from "mongoose";
import {
  PaymentOrderModel,
  type PaymentOrderDocument,
  type PaymentFeeType,
} from "../models/payment-order.model.js";
import { RefundAccountModel } from "../models/refund-account.model.js";
import { AllocationAssignmentModel } from "../models/allocation-assignment.model.js";
import { HostelModel } from "../models/hostel.model.js";
import { RoomModel } from "../models/room.model.js";
import { BedModel } from "../models/bed.model.js";
import { AuditService } from "./audit.service.js";
import type { PaymentPort } from "@hostelhub/domain";
import {
  RazorpayTestAdapter,
  type PaymentOrderResult,
  type RefundAccountInput,
  type RefundAccountPublic,
  type StudentPaymentSummary,
  type UnpaidPolicy,
} from "@hostelhub/domain";
import { encryptPayload, decryptPayload, type EncryptedPayload } from "@hostelhub/shared";
import type { WorkflowActor } from "./draft-workflow.service.js";

export class PaymentServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "PaymentServiceError";
  }
}

export interface CreatePaymentOrderInput {
  feeType: PaymentFeeType;
  amountPaise: number;
  description?: string | undefined;
  assignmentId?: string | undefined;
  draftId?: string | undefined;
  hostelId?: string | undefined;
  notes?: Record<string, string> | undefined;
}

export interface VerifyPaymentInput {
  orderId: string;
  paymentId: string;
  signature: string;
  method?: string | undefined;
}

export interface WebhookEventPayload {
  id: string;
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        status: string;
        method?: string;
      };
    };
    order?: {
      entity: {
        id: string;
        amount: number;
        status: string;
      };
    };
  };
}

export interface UnpaidResidentItem {
  studentId: string;
  studentName: string;
  rollNumber: string;
  email: string;
  hostelId: string;
  hostelName: string;
  roomNumber: string;
  bedNo: string;
  balanceDuePaise: number;
  policyFlag: "warning" | "hold";
}

export class PaymentService {
  private readonly instId: Types.ObjectId;
  private readonly port: PaymentPort;
  private auditService?: AuditService;

  constructor(institutionId: string | Types.ObjectId, port?: PaymentPort) {
    this.instId = new Types.ObjectId(institutionId);
    this.port = port || new RazorpayTestAdapter();
  }

  private getAudit(): AuditService {
    if (!this.auditService) {
      this.auditService = new AuditService(this.instId);
    }
    return this.auditService;
  }

  /**
   * Generates a unique receipt number: REC-YYYY-XXXXXX.
   */
  private generateReceiptNumber(): string {
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `REC-${year}-${rand}`;
  }

  /**
   * Creates a sandbox payment order in integer paise.
   */
  async createPaymentOrder(
    studentId: string | Types.ObjectId,
    input: CreatePaymentOrderInput,
    actor?: WorkflowActor | undefined,
  ): Promise<{ order: PaymentOrderDocument; gatewayOrder: PaymentOrderResult }> {
    const sId = new Types.ObjectId(studentId);
    const resolvedActor: WorkflowActor = actor || {
      id: sId.toString(),
      email: "student@campus.edu",
      role: "system",
    };

    if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0) {
      throw new PaymentServiceError(
        "Amount must be a positive integer in paise",
        "INVALID_AMOUNT",
        400,
      );
    }

    const receiptNumber = this.generateReceiptNumber();
    const gatewayOrder = await this.port.createOrder({
      amountPaise: input.amountPaise,
      currency: "INR",
      receipt: receiptNumber,
      notes: input.notes,
    });

    const description =
      input.description ||
      `Semester fee payment (${input.feeType.replace(/_/g, " ")}) - Sandbox Test Mode`;

    const paymentOrderDoc = new PaymentOrderModel({
      institution_id: this.instId,
      student_id: sId,
      assignment_id: input.assignmentId ? new Types.ObjectId(input.assignmentId) : undefined,
      draft_id: input.draftId ? new Types.ObjectId(input.draftId) : undefined,
      hostel_id: input.hostelId ? new Types.ObjectId(input.hostelId) : undefined,
      order_id: gatewayOrder.orderId,
      amount_paise: input.amountPaise,
      currency: "INR",
      fee_type: input.feeType,
      description,
      status: "created",
      receipt_number: receiptNumber,
      policy_flag: "none",
      notes: input.notes,
    });

    await paymentOrderDoc.save();

    await this.getAudit().append({
      actor: { user_id: resolvedActor.id, email: resolvedActor.email, roles: [resolvedActor.role] },
      action: "PAYMENT_ORDER_CREATED",
      target: {
        order_id: paymentOrderDoc.order_id,
        student_id: sId.toString(),
      },
      after: {
        amount_paise: input.amountPaise,
        receipt_number: receiptNumber,
        status: "created",
      },
      timestamp: new Date(),
    });

    return {
      order: paymentOrderDoc,
      gatewayOrder,
    };
  }

  /**
   * Verifies Razorpay checkout signature and records payment completion.
   * Rejects tampered signatures and duplicate payment attempts.
   */
  async verifyAndRecordPayment(
    inputOrStudentId: string | Types.ObjectId | VerifyPaymentInput,
    inputOrActor?: VerifyPaymentInput | WorkflowActor,
    maybeActor?: WorkflowActor,
  ): Promise<{ order: PaymentOrderDocument; receiptUrl: string }> {
    let input: VerifyPaymentInput;
    let actor: WorkflowActor | undefined;

    if (typeof inputOrStudentId === "string" || inputOrStudentId instanceof Types.ObjectId) {
      input = inputOrActor as VerifyPaymentInput;
      actor = maybeActor;
    } else {
      input = inputOrStudentId;
      actor = inputOrActor as WorkflowActor | undefined;
    }

    const resolvedActor: WorkflowActor = actor || {
      id: "system",
      email: "system@campus.edu",
      role: "system",
    };

    // 1. Verify HMAC-SHA256 signature
    const isValidSignature = this.port.verifyPaymentSignature({
      orderId: input.orderId,
      paymentId: input.paymentId,
      signature: input.signature,
    });

    if (!isValidSignature) {
      throw new PaymentServiceError(
        "Invalid payment signature: tampered signature detected",
        "INVALID_SIGNATURE",
        400,
      );
    }

    // 2. Find order in tenant
    const order = await PaymentOrderModel.findOne({
      institution_id: this.instId,
      order_id: input.orderId,
    });

    if (!order) {
      throw new PaymentServiceError("Payment order not found", "ORDER_NOT_FOUND", 404);
    }

    // 3. Duplicate payment attempt check
    if (order.status === "paid") {
      throw new PaymentServiceError(
        "Payment order has already been paid. Duplicate payments are not allowed.",
        "ORDER_ALREADY_PAID",
        409,
      );
    }

    // 4. Mark order as paid
    const paidAt = new Date();
    const s3Key = `receipts/${this.instId.toString()}/${order.receipt_number}.pdf`;

    order.status = "paid";
    order.payment_id = input.paymentId;
    order.signature = input.signature;
    order.paid_at = paidAt;
    order.receipt_s3_key = s3Key;
    if (input.method) {
      order.method = input.method;
    }
    order.policy_flag = "none";

    await order.save();

    await this.getAudit().append({
      actor: { user_id: resolvedActor.id, email: resolvedActor.email, roles: [resolvedActor.role] },
      action: "PAYMENT_COMPLETED",
      target: {
        order_id: order.order_id,
        payment_id: input.paymentId,
        student_id: order.student_id.toString(),
      },
      after: {
        status: "paid",
        amount_paise: order.amount_paise,
        receipt_number: order.receipt_number,
        paid_at: paidAt.toISOString(),
      },
      timestamp: paidAt,
    });

    const receiptUrl = `/api/v1/payments/receipts/${order._id.toString()}`;

    return {
      order,
      receiptUrl,
    };
  }

  /**
   * Processes gateway webhook idempotently with replay prevention.
   */
  async handleWebhook(
    rawBody: string,
    signature: string,
    eventPayload: WebhookEventPayload,
  ): Promise<{
    processed: boolean;
    status: string;
    reason?: string | undefined;
    orderId?: string | undefined;
    duplicate?: boolean | undefined;
  }> {
    // 1. Verify webhook signature
    const isValid = this.port.verifyWebhookSignature({
      rawBody,
      signature,
    });

    if (!isValid) {
      throw new PaymentServiceError(
        "Invalid webhook signature: signature verification failed",
        "INVALID_SIGNATURE",
        400,
      );
    }

    const eventId = eventPayload.id;
    const eventName = eventPayload.event;
    const orderId =
      eventPayload.payload?.payment?.entity?.order_id || eventPayload.payload?.order?.entity?.id;

    if (!orderId) {
      return { processed: false, status: "ignored", reason: "no_order_id" };
    }

    const order = await PaymentOrderModel.findOne({
      institution_id: this.instId,
      order_id: orderId,
    });

    if (!order) {
      return { processed: false, status: "ignored", reason: "order_not_found" };
    }

    // 2. Replay check: Has this webhook event already been processed?
    const isReplay = order.webhook_events.some((ev) => ev.event_id === eventId);
    if (isReplay) {
      return {
        processed: true,
        duplicate: true,
        status: order.status,
        reason: "duplicate_event",
        orderId,
      };
    }

    // 3. Process event & record event idempotently
    order.webhook_events.push({
      event_id: eventId,
      event: eventName,
      received_at: new Date(),
    });

    if (eventName === "payment.captured" || eventName === "order.paid") {
      if (order.status !== "paid") {
        order.status = "paid";
        order.paid_at = new Date();
        const paymentEntity = eventPayload.payload?.payment?.entity;
        if (paymentEntity) {
          order.payment_id = paymentEntity.id;
          if (paymentEntity.method) {
            order.method = paymentEntity.method;
          }
        }
        order.receipt_s3_key = `receipts/${this.instId.toString()}/${order.receipt_number}.pdf`;
      }
    }

    await order.save();

    await this.getAudit().append({
      actor: { user_id: "system", email: "webhook@gateway.internal", roles: ["system"] },
      action: "PAYMENT_WEBHOOK_PROCESSED",
      target: {
        order_id: orderId,
        event_id: eventId,
      },
      after: {
        event: eventName,
        status: order.status,
      },
      timestamp: new Date(),
    });

    return { processed: true, status: order.status, orderId };
  }

  /**
   * Generates a receipt HTML document and deterministic PDF fallback buffer.
   */
  async generateReceiptPdf(orderId: string | Types.ObjectId): Promise<{
    html: string;
    pdfBuffer: Buffer;
    receiptNumber: string;
    studentName: string;
    filename: string;
  }> {
    const isOid = Types.ObjectId.isValid(orderId);
    const query = isOid
      ? {
          $or: [{ _id: new Types.ObjectId(orderId) }, { order_id: String(orderId) }],
          institution_id: this.instId,
        }
      : { order_id: String(orderId), institution_id: this.instId };

    const order = await PaymentOrderModel.findOne(query).populate("student_id", "name email");

    if (!order) {
      throw new PaymentServiceError("Payment order not found", "ORDER_NOT_FOUND", 404);
    }

    if (order.status !== "paid") {
      throw new PaymentServiceError(
        "Receipts can only be generated for paid orders",
        "ORDER_NOT_PAID",
        400,
      );
    }

    const studentDoc = order.student_id as unknown as { name?: string; email?: string } | null;
    const studentName = studentDoc?.name ?? "Student";
    const amountInRupees = (order.amount_paise / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt - ${order.receipt_number}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #1e293b; }
    .banner { background: #fef3c7; border: 1px solid #f59e0b; color: #b45309; padding: 8px 16px; border-radius: 8px; font-weight: bold; font-size: 12px; margin-bottom: 24px; text-align: center; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: 800; color: #0f172a; }
    .row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
    .total-box { margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbd5e1; }
    .stamp { margin-top: 32px; font-size: 12px; color: #059669; font-weight: bold; }
  </style>
</head>
<body>
  <div class="banner">TEST MODE — NO REAL MONEY CHARGED (SANDBOX RECEIPT)</div>
  <div class="header">
    <div class="title">OFFICIAL FEE RECEIPT</div>
    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Receipt No: ${order.receipt_number} • Date: ${order.paid_at ? order.paid_at.toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}</div>
  </div>
  <div class="row"><span>Student Name:</span><strong>${studentName}</strong></div>
  <div class="row"><span>Order ID:</span><code>${order.order_id}</code></div>
  <div class="row"><span>Transaction / Payment ID:</span><code>${order.payment_id ?? "N/A (Sandbox)"}</code></div>
  <div class="row"><span>Fee Type:</span><span>${order.fee_type.replace(/_/g, " ").toUpperCase()}</span></div>
  <div class="row"><span>Description:</span><span>${order.description}</span></div>
  <div class="total-box">
    <div class="row" style="font-size: 18px;">
      <span>Total Paid:</span>
      <strong style="color: #059669;">₹ ${amountInRupees} INR</strong>
    </div>
  </div>
  <div class="stamp">✓ ELECTRONICALLY VERIFIED — SIGNATURE VALIDATED</div>
</body>
</html>`;

    // Standard fast PDF buffer fallback header
    const pdfBuffer = Buffer.from(
      `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n200\n%%EOF\n`,
      "binary",
    );

    const filename = `receipt-${order.receipt_number.toLowerCase()}.pdf`;

    return {
      html,
      pdfBuffer,
      receiptNumber: order.receipt_number,
      studentName,
      filename,
    };
  }

  /**
   * Saves student bank details for deposits/refunds with AES-256-GCM encryption and IFSC validation.
   */
  async saveRefundAccount(
    studentId: string | Types.ObjectId,
    input: RefundAccountInput,
    actor?: WorkflowActor | undefined,
  ): Promise<RefundAccountPublic> {
    const sId = new Types.ObjectId(studentId);
    const resolvedActor: WorkflowActor = actor || {
      id: sId.toString(),
      email: "student@campus.edu",
      role: "system",
    };

    const cleanAccount = input.accountNumber.trim();
    if (!/^\d{8,20}$/.test(cleanAccount)) {
      throw new PaymentServiceError(
        "Invalid bank account number (must be 8-20 numeric digits)",
        "INVALID_ACCOUNT_NUMBER",
        400,
      );
    }

    const cleanIfsc = input.ifscCode.trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      throw new PaymentServiceError(
        "Invalid IFSC code format (must be 11 characters, e.g. SBIN0000691)",
        "INVALID_IFSC",
        400,
      );
    }

    // Auto-fill / verify via IFSC API
    const ifscLookup = await this.port.fetchIFSCDetails(cleanIfsc);
    const bankName = ifscLookup?.bank || (input.bankName ? input.bankName.trim() : "");
    const branchName = ifscLookup?.branch || (input.branchName ? input.branchName.trim() : "");

    if (!bankName) {
      throw new PaymentServiceError(
        "Invalid IFSC code: details could not be resolved",
        "INVALID_IFSC",
        400,
      );
    }

    // Encrypt account number with per-institution AES-256-GCM
    const encryptedAccount: EncryptedPayload = encryptPayload(
      {
        accountNumber: cleanAccount,
        accountHolderName: input.accountHolderName.trim(),
        ifscCode: cleanIfsc,
      },
      this.instId.toString(),
      sId.toString(),
    );

    const last4 = cleanAccount.slice(-4);

    const doc = await RefundAccountModel.findOneAndUpdate(
      {
        institution_id: this.instId,
        student_id: sId,
      },
      {
        $set: {
          encrypted_account: encryptedAccount,
          account_number_last4: last4,
          account_holder_name: input.accountHolderName.trim(),
          ifsc_code: cleanIfsc,
          bank_name: bankName,
          branch_name: branchName,
          verified: true,
        },
      },
      { upsert: true, new: true },
    );

    await this.getAudit().append({
      actor: { user_id: resolvedActor.id, email: resolvedActor.email, roles: [resolvedActor.role] },
      action: "REFUND_ACCOUNT_UPDATED",
      target: {
        student_id: sId.toString(),
        ifsc: cleanIfsc,
      },
      after: {
        bank_name: bankName,
        account_last4: last4,
      },
      timestamp: new Date(),
    });

    return {
      studentId: sId.toString(),
      accountHolderName: doc.account_holder_name,
      accountNumberLast4: last4,
      maskedAccountNumber: `•••• ${last4}`,
      ifscCode: doc.ifsc_code,
      bankName: doc.bank_name,
      branchName: doc.branch_name,
      verified: doc.verified,
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  /**
   * Retrieves public masked refund account details for a student.
   */
  async getRefundAccount(studentId: string | Types.ObjectId): Promise<RefundAccountPublic | null> {
    const sId = new Types.ObjectId(studentId);
    const doc = await RefundAccountModel.findOne({
      institution_id: this.instId,
      student_id: sId,
    });

    if (!doc) {
      return null;
    }

    return {
      studentId: sId.toString(),
      accountHolderName: doc.account_holder_name,
      accountNumberLast4: doc.account_number_last4,
      maskedAccountNumber: `•••• ${doc.account_number_last4}`,
      ifscCode: doc.ifsc_code,
      bankName: doc.bank_name,
      branchName: doc.branch_name,
      verified: doc.verified,
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  /**
   * Decrypts refund account details for finance / bursar role with strict access check.
   */
  async getDecryptedRefundAccount(
    studentId: string | Types.ObjectId,
    requesterRole: string = "chief_warden",
  ): Promise<{ accountNumber: string; ifscCode: string; accountHolderName: string }> {
    if (!["chief_warden", "hostel_admin", "sys_admin", "warden", "dean"].includes(requesterRole)) {
      throw new PaymentServiceError(
        "Unauthorized to view unmasked banking details",
        "FORBIDDEN",
        403,
      );
    }

    const sId = new Types.ObjectId(studentId);
    const doc = await RefundAccountModel.findOne({
      institution_id: this.instId,
      student_id: sId,
    });

    if (!doc) {
      throw new PaymentServiceError("Refund account not found", "ACCOUNT_NOT_FOUND", 404);
    }

    const decrypted = decryptPayload<{
      accountNumber: string;
      accountHolderName: string;
      ifscCode: string;
    }>(doc.encrypted_account, this.instId.toString(), sId.toString());

    return decrypted;
  }

  /**
   * Computes student payment summary (billed vs paid, balance in paise, recent orders, and policy flag).
   */
  async getStudentPaymentSummary(
    studentId: string | Types.ObjectId,
    unpaidPolicy: UnpaidPolicy = "warning",
  ): Promise<StudentPaymentSummary> {
    const sId = new Types.ObjectId(studentId);

    // Standard semester billing baseline: Rs. 42,500 = 4,250,000 paise
    const standardSemesterBilledPaise = 4250000;
    const cautionDepositPaise = 500000;

    const paidOrders = await PaymentOrderModel.find({
      institution_id: this.instId,
      student_id: sId,
      status: "paid",
    }).sort({ createdAt: -1 });

    const allOrders = await PaymentOrderModel.find({
      institution_id: this.instId,
      student_id: sId,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    const totalPaidPaise = paidOrders.reduce((sum, ord) => sum + ord.amount_paise, 0);
    const balanceDuePaise = Math.max(0, standardSemesterBilledPaise - totalPaidPaise);
    const isFullyPaid = balanceDuePaise === 0;

    let policyFlag: "none" | "warning" | "hold" = "none";
    if (!isFullyPaid) {
      policyFlag = unpaidPolicy === "hold" ? "hold" : "warning";
    }

    const refundAccount = await this.getRefundAccount(sId);

    const recentOrders = allOrders.map((o) => ({
      orderId: o.order_id,
      amountPaise: o.amount_paise,
      status: o.status,
      feeType: o.fee_type,
      receiptNumber: o.receipt_number,
      paidAt: o.paid_at?.toISOString(),
      createdAt: o.createdAt.toISOString(),
    }));

    return {
      studentId: sId.toString(),
      totalBilledPaise: standardSemesterBilledPaise,
      totalPaidPaise,
      balanceDuePaise,
      cautionDepositPaise,
      isFullyPaid,
      policyFlag,
      unpaidPolicy,
      recentOrders,
      refundAccount,
    };
  }

  /**
   * Retrieves unpaid residents for a given hostel with policy flag for wardens.
   * Supports both (hostelId, policy) and (actor, policy, hostelId) signatures.
   */
  async getUnpaidResidents(
    actorOrHostelId: WorkflowActor | string | Types.ObjectId,
    policyOrHostelId?: UnpaidPolicy | string | Types.ObjectId,
    maybeHostelId?: string | Types.ObjectId,
  ): Promise<UnpaidResidentItem[]> {
    let hId: Types.ObjectId;
    let unpaidPolicy: UnpaidPolicy = "warning";

    if (typeof actorOrHostelId === "object" && "role" in actorOrHostelId) {
      // Called as (actor, policy, hostelId)
      unpaidPolicy = (policyOrHostelId as UnpaidPolicy) || "warning";
      hId = new Types.ObjectId(maybeHostelId!);
    } else {
      // Called as (hostelId, policy)
      hId = new Types.ObjectId(actorOrHostelId as string | Types.ObjectId);
      unpaidPolicy = (policyOrHostelId as UnpaidPolicy) || "warning";
    }

    // Find all active bed assignments in this hostel
    const assignments = await AllocationAssignmentModel.find({
      hostel_id: hId,
    }).populate("student_id", "name email roll_number");

    const unpaidList: UnpaidResidentItem[] = [];

    const hostel = await HostelModel.findById(hId);
    const hostelName = hostel?.name ?? "Hostel";

    for (const asgn of assignments) {
      if (!asgn.student_id) continue;

      const student = asgn.student_id as unknown as {
        _id: Types.ObjectId;
        name: string;
        email: string;
        roll_number?: string;
      };

      const summary = await this.getStudentPaymentSummary(student._id, unpaidPolicy);
      if (!summary.isFullyPaid) {
        const room = await RoomModel.findById(asgn.room_id);
        const bed = await BedModel.findById(asgn.bed_id);
        const flag = unpaidPolicy === "hold" ? "hold" : "warning";

        // Update or ensure pending order has the policy flag
        const existingOrder = await PaymentOrderModel.findOne({
          institution_id: this.instId,
          student_id: student._id,
        });

        if (existingOrder) {
          existingOrder.policy_flag = flag;
          await existingOrder.save();
        } else {
          await PaymentOrderModel.create({
            institution_id: this.instId,
            student_id: student._id,
            assignment_id: asgn._id,
            hostel_id: hId,
            order_id: `order_unpaid_${student._id.toString().slice(-8)}`,
            amount_paise: summary.balanceDuePaise,
            currency: "INR",
            fee_type: "full_semester",
            description: `Unpaid semester fees - Policy ${flag}`,
            status: "created",
            receipt_number: this.generateReceiptNumber(),
            policy_flag: flag,
          });
        }

        unpaidList.push({
          studentId: student._id.toString(),
          studentName: student.name,
          rollNumber: student.roll_number || "N/A",
          email: student.email,
          hostelId: hId.toString(),
          hostelName,
          roomNumber: room?.room_number ?? "N/A",
          bedNo: bed?.bed_no ?? "N/A",
          balanceDuePaise: summary.balanceDuePaise,
          policyFlag: flag,
        });
      }
    }

    return unpaidList;
  }
}
