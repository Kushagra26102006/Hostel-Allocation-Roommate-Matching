/**
 * @hostelhub/domain — payment/razorpay-test-adapter.ts
 *
 * Razorpay test-mode adapter implementing PaymentPort.
 * Works completely in test mode (sandbox), with HMAC-SHA256 signature verification,
 * IFSC resolution with offline test fallbacks, and zero handling of real money.
 */

import { createHmac, randomBytes } from "crypto";
import type { PaymentPort, CreateOrderParams } from "./payment-port.js";
import type {
  PaymentOrderResult,
  VerifySignatureParams,
  VerifyWebhookParams,
  IFSCDetails,
} from "./types.js";

export const DEFAULT_TEST_KEY_ID = "rzp_test_hostelhub_sandbox";
export const DEFAULT_TEST_KEY_SECRET = "sandbox_secret_key_hostelhub_2026";
export const DEFAULT_TEST_WEBHOOK_SECRET = "webhook_secret_sandbox_2026";

/**
 * Built-in static catalog of known test IFSC codes for offline reliability and unit tests.
 */
export const TEST_IFSC_CATALOG: Record<string, IFSCDetails> = {
  SBIN0000691: {
    ifsc: "SBIN0000691",
    bank: "State Bank of India",
    branch: "Roorkee IIT",
    address: "IIT Roorkee Campus, Roorkee, Uttarakhand 247667",
    city: "Roorkee",
    district: "Haridwar",
    state: "Uttarakhand",
    micr: "247002002",
    rtgs: true,
    neft: true,
    imps: true,
    upi: true,
  },
  HDFC0000001: {
    ifsc: "HDFC0000001",
    bank: "HDFC Bank",
    branch: "Stephen House",
    address: "4, B.B.D. Bagh East, Stephen House, Kolkata 700001",
    city: "Kolkata",
    district: "Kolkata",
    state: "West Bengal",
    micr: "700240002",
    rtgs: true,
    neft: true,
    imps: true,
    upi: true,
  },
  ICIC0000001: {
    ifsc: "ICIC0000001",
    bank: "ICICI Bank",
    branch: "Free School Street",
    address: "22, Free School Street, Kolkata 700016",
    city: "Kolkata",
    district: "Kolkata",
    state: "West Bengal",
    micr: "700229002",
    rtgs: true,
    neft: true,
    imps: true,
    upi: true,
  },
  PUNB0000001: {
    ifsc: "PUNB0000001",
    bank: "Punjab National Bank",
    branch: "ECE House",
    address: "28 KG Marg, Connaught Place, New Delhi 110001",
    city: "New Delhi",
    district: "New Delhi",
    state: "Delhi",
    micr: "110024001",
    rtgs: true,
    neft: true,
    imps: true,
    upi: true,
  },
  CNRB0000001: {
    ifsc: "CNRB0000001",
    bank: "Canara Bank",
    branch: "Bangalore Main",
    address: "Head Office 112 J C Road, Bangalore 560002",
    city: "Bangalore",
    district: "Bangalore Urban",
    state: "Karnataka",
    micr: "560015002",
    rtgs: true,
    neft: true,
    imps: true,
    upi: true,
  },
};

export class RazorpayTestAdapter implements PaymentPort {
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(options?: { keyId?: string; keySecret?: string; webhookSecret?: string }) {
    this.keyId = options?.keyId || process.env["RAZORPAY_KEY_ID"] || DEFAULT_TEST_KEY_ID;
    this.keySecret =
      options?.keySecret || process.env["RAZORPAY_KEY_SECRET"] || DEFAULT_TEST_KEY_SECRET;
    this.webhookSecret =
      options?.webhookSecret ||
      process.env["RAZORPAY_WEBHOOK_SECRET"] ||
      DEFAULT_TEST_WEBHOOK_SECRET;
  }

  getKeyId(): string {
    return this.keyId;
  }

  /**
   * Generates a deterministic sandbox order ID and creates a test order.
   */
  async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
    if (!Number.isInteger(params.amountPaise) || params.amountPaise <= 0) {
      throw new Error("Amount must be a positive integer in paise");
    }

    const randomSuffix = randomBytes(8).toString("hex");
    const orderId = `order_test_${randomSuffix}`;

    return {
      orderId,
      amountPaise: params.amountPaise,
      currency: "INR",
      receiptNumber: params.receipt,
      status: "created",
      notes: params.notes,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Verifies Razorpay checkout signature:
   * HMAC-SHA256(order_id + "|" + payment_id, secret) === signature
   */
  verifyPaymentSignature(params: VerifySignatureParams): boolean {
    const secret = params.secret || this.keySecret;
    if (!params.orderId || !params.paymentId || !params.signature) {
      return false;
    }

    const expectedSignature = createHmac("sha256", secret)
      .update(`${params.orderId}|${params.paymentId}`)
      .digest("hex");

    return expectedSignature === params.signature;
  }

  /**
   * Verifies Razorpay webhook signature:
   * HMAC-SHA256(rawBody, webhookSecret) === signature
   */
  verifyWebhookSignature(params: VerifyWebhookParams): boolean {
    const secret = params.secret || this.webhookSecret;
    if (!params.rawBody || !params.signature) {
      return false;
    }

    const expectedSignature = createHmac("sha256", secret).update(params.rawBody).digest("hex");

    return expectedSignature === params.signature;
  }

  /**
   * Looks up bank and branch details by IFSC code.
   * Checks offline test catalog first, then calls Razorpay IFSC public API.
   */
  async fetchIFSCDetails(ifsc: string): Promise<IFSCDetails | null> {
    const cleanIfsc = ifsc.trim().toUpperCase();
    if (!cleanIfsc || cleanIfsc.length !== 11) {
      return null;
    }

    // 1. Check local test catalog
    if (TEST_IFSC_CATALOG[cleanIfsc]) {
      return TEST_IFSC_CATALOG[cleanIfsc] ?? null;
    }

    // 2. Fetch from Razorpay IFSC public API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`https://ifsc.razorpay.com/${cleanIfsc}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const json = (await response.json()) as {
        IFSC: string;
        BANK: string;
        BRANCH: string;
        ADDRESS?: string;
        CITY: string;
        DISTRICT?: string;
        STATE: string;
        MICR?: string;
        RTGS?: boolean;
        NEFT?: boolean;
        IMPS?: boolean;
        UPI?: boolean;
      };

      return {
        ifsc: json.IFSC,
        bank: json.BANK,
        branch: json.BRANCH,
        address: json.ADDRESS,
        city: json.CITY,
        district: json.DISTRICT,
        state: json.STATE,
        micr: json.MICR,
        rtgs: json.RTGS,
        neft: json.NEFT,
        imps: json.IMPS,
        upi: json.UPI,
      };
    } catch {
      return null;
    }
  }

  /**
   * Helper utility to create a valid test payment signature for testing and simulations.
   */
  generateTestSignature(orderId: string, paymentId: string, secret?: string): string {
    return createHmac("sha256", secret || this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
  }

  /**
   * Helper utility to create a valid webhook signature for test payloads.
   */
  generateWebhookSignature(rawBody: string, secret?: string): string {
    return createHmac("sha256", secret || this.webhookSecret)
      .update(rawBody)
      .digest("hex");
  }
}
