import { describe, it, expect } from "vitest";
import {
  RazorpayTestAdapter,
  DEFAULT_TEST_KEY_SECRET,
  DEFAULT_TEST_WEBHOOK_SECRET,
} from "../../payment/razorpay-test-adapter.js";

describe("PaymentPort & RazorpayTestAdapter (Domain)", () => {
  const adapter = new RazorpayTestAdapter();

  describe("Order Creation (Paise Amounts)", () => {
    it("creates a valid test order with integer paise amount", async () => {
      const order = await adapter.createOrder({
        amountPaise: 4250000, // Rs. 42,500.00
        receipt: "REC-2026-AUT-001",
        notes: { semester: "Autumn 2026", studentRoll: "22BCS042" },
      });

      expect(order.orderId).toMatch(/^order_test_[a-f0-9]{16}$/);
      expect(order.amountPaise).toBe(4250000);
      expect(order.currency).toBe("INR");
      expect(order.status).toBe("created");
      expect(order.receiptNumber).toBe("REC-2026-AUT-001");
      expect(order.notes?.["semester"]).toBe("Autumn 2026");
    });

    it("rejects non-integer amounts to prevent float precision bugs", async () => {
      await expect(
        adapter.createOrder({
          amountPaise: 42500.5,
          receipt: "REC-FAIL",
        }),
      ).rejects.toThrow("Amount must be a positive integer in paise");
    });

    it("rejects zero or negative amounts", async () => {
      await expect(
        adapter.createOrder({
          amountPaise: 0,
          receipt: "REC-FAIL",
        }),
      ).rejects.toThrow("Amount must be a positive integer in paise");

      await expect(
        adapter.createOrder({
          amountPaise: -500,
          receipt: "REC-FAIL",
        }),
      ).rejects.toThrow("Amount must be a positive integer in paise");
    });
  });

  describe("Payment Signature Verification", () => {
    it("verifies a valid test checkout signature", () => {
      const orderId = "order_test_1234567890abcdef";
      const paymentId = "pay_test_0987654321fedcba";

      const validSignature = adapter.generateTestSignature(
        orderId,
        paymentId,
        DEFAULT_TEST_KEY_SECRET,
      );

      const isValid = adapter.verifyPaymentSignature({
        orderId,
        paymentId,
        signature: validSignature,
      });

      expect(isValid).toBe(true);
    });

    it("rejects a tampered signature", () => {
      const orderId = "order_test_1234567890abcdef";
      const paymentId = "pay_test_0987654321fedcba";

      const validSignature = adapter.generateTestSignature(orderId, paymentId);
      const tamperedSignature = validSignature.slice(0, -4) + "0000";

      const isValid = adapter.verifyPaymentSignature({
        orderId,
        paymentId,
        signature: tamperedSignature,
      });

      expect(isValid).toBe(false);
    });

    it("rejects when payment ID or order ID is altered (order substitution attack)", () => {
      const orderId = "order_test_1234567890abcdef";
      const paymentId = "pay_test_0987654321fedcba";
      const validSignature = adapter.generateTestSignature(orderId, paymentId);

      const isValidWithAlteredOrder = adapter.verifyPaymentSignature({
        orderId: "order_test_EVIL_REPLACE",
        paymentId,
        signature: validSignature,
      });

      expect(isValidWithAlteredOrder).toBe(false);
    });
  });

  describe("Webhook Signature Verification", () => {
    it("verifies a valid webhook payload signature", () => {
      const rawPayload = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_test_999",
              order_id: "order_test_888",
              amount: 4250000,
              status: "captured",
            },
          },
        },
      });

      const validSignature = adapter.generateWebhookSignature(
        rawPayload,
        DEFAULT_TEST_WEBHOOK_SECRET,
      );

      const isValid = adapter.verifyWebhookSignature({
        rawBody: rawPayload,
        signature: validSignature,
      });

      expect(isValid).toBe(true);
    });

    it("rejects tampered webhook payload body", () => {
      const originalPayload = JSON.stringify({ event: "payment.captured", amount: 4250000 });
      const validSignature = adapter.generateWebhookSignature(originalPayload);

      // Attacker tampers the body to 0 amount or different order
      const tamperedPayload = JSON.stringify({ event: "payment.captured", amount: 100 });

      const isValid = adapter.verifyWebhookSignature({
        rawBody: tamperedPayload,
        signature: validSignature,
      });

      expect(isValid).toBe(false);
    });
  });

  describe("IFSC Code Resolution", () => {
    it("resolves SBI Roorkee IIT branch from test catalog", async () => {
      const ifsc = await adapter.fetchIFSCDetails("SBIN0000691");
      expect(ifsc).not.toBeNull();
      expect(ifsc?.bank).toBe("State Bank of India");
      expect(ifsc?.branch).toContain("Roorkee");
      expect(ifsc?.city).toBe("Roorkee");
    });

    it("resolves HDFC and ICICI test branches", async () => {
      const hdfc = await adapter.fetchIFSCDetails("HDFC0000001");
      expect(hdfc?.bank).toBe("HDFC Bank");

      const icici = await adapter.fetchIFSCDetails("ICIC0000001");
      expect(icici?.bank).toBe("ICICI Bank");
    });

    it("normalizes lowercase and whitespace in IFSC codes", async () => {
      const sbi = await adapter.fetchIFSCDetails("  sbin0000691  ");
      expect(sbi?.bank).toBe("State Bank of India");
    });

    it("returns null for malformed IFSC codes", async () => {
      const invalidShort = await adapter.fetchIFSCDetails("SBIN");
      expect(invalidShort).toBeNull();

      const invalidLength = await adapter.fetchIFSCDetails("SBIN0000691EXTRA");
      expect(invalidLength).toBeNull();
    });
  });
});
