/**
 * @hostelhub/domain — payment/types.ts
 *
 * Core types for sandbox payment orders, Razorpay test mode,
 * IFSC resolution, and encrypted refund accounts.
 *
 * All financial amounts are stored as integers in PAISE (1 INR = 100 paise).
 */

export type PaymentCurrency = "INR";

export type PaymentStatus = "created" | "paid" | "failed" | "refunded";

export type FeeType =
  "hostel_rent" | "mess_fee" | "caution_deposit" | "full_semester" | "fine_or_damage";

export type UnpaidPolicy = "warning" | "hold";

export interface PaymentOrderResult {
  orderId: string;
  amountPaise: number;
  currency: PaymentCurrency;
  receiptNumber: string;
  status: PaymentStatus;
  notes?: Record<string, string> | undefined;
  createdAt: string;
}

export interface VerifySignatureParams {
  orderId: string;
  paymentId: string;
  signature: string;
  secret?: string | undefined;
}

export interface VerifyWebhookParams {
  rawBody: string;
  signature: string;
  secret?: string | undefined;
}

export interface IFSCDetails {
  ifsc: string;
  bank: string;
  branch: string;
  address?: string | undefined;
  city: string;
  district?: string | undefined;
  state: string;
  micr?: string | undefined;
  rtgs?: boolean | undefined;
  neft?: boolean | undefined;
  imps?: boolean | undefined;
  upi?: boolean | undefined;
}

export interface RefundAccountInput {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName?: string | undefined;
  branchName?: string | undefined;
}

export interface RefundAccountPublic {
  studentId?: string | undefined;
  accountHolderName: string;
  accountNumberLast4: string;
  maskedAccountNumber?: string | undefined;
  ifscCode: string;
  bankName: string;
  branchName: string;
  verified: boolean;
  updatedAt: string;
}

export interface PaymentOrderSummaryItem {
  orderId: string;
  amountPaise: number;
  status: string;
  feeType: string;
  receiptNumber: string;
  paidAt?: string | undefined;
  createdAt: string;
}

export interface StudentPaymentSummary {
  studentId: string;
  assignmentId?: string | undefined;
  totalBilledPaise: number;
  totalPaidPaise: number;
  balanceDuePaise: number;
  cautionDepositPaise: number;
  isFullyPaid: boolean;
  policyFlag: "none" | "warning" | "hold";
  unpaidPolicy: UnpaidPolicy;
  recentOrders?: PaymentOrderSummaryItem[] | undefined;
  refundAccount?: RefundAccountPublic | null | undefined;
}
