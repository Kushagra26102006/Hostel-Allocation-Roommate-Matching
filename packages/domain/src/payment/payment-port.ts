/**
 * @hostelhub/domain — payment/payment-port.ts
 *
 * Contract port for payment gateway interactions (orders, signatures, webhooks, IFSC).
 */

import type {
  PaymentOrderResult,
  VerifySignatureParams,
  VerifyWebhookParams,
  IFSCDetails,
} from "./types.js";

export interface CreateOrderParams {
  amountPaise: number;
  currency?: "INR" | undefined;
  receipt: string;
  notes?: Record<string, string> | undefined;
}

export interface PaymentPort {
  /**
   * Creates an order with the payment provider.
   */
  createOrder(params: CreateOrderParams): Promise<PaymentOrderResult>;

  /**
   * Verifies client-submitted Razorpay signature.
   * Signature is HMAC-SHA256 of `${orderId}|${paymentId}` using key_secret.
   */
  verifyPaymentSignature(params: VerifySignatureParams): boolean;

  /**
   * Verifies webhook payload signature.
   * Signature is HMAC-SHA256 of raw body text using webhook_secret.
   */
  verifyWebhookSignature(params: VerifyWebhookParams): boolean;

  /**
   * Looks up IFSC code via Razorpay IFSC API or offline test catalog.
   */
  fetchIFSCDetails(ifsc: string): Promise<IFSCDetails | null>;
}
