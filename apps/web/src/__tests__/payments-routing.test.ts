import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
const mockAuth = vi.mocked(auth);

// Import route handlers
import { GET as getIfscDetails } from "../app/api/v1/payments/ifsc/[code]/route";
import { POST as handleWebhook } from "../app/api/v1/payments/webhook/route";
import { POST as createOrder } from "../app/api/v1/payments/orders/route";
import { POST as verifyPayment } from "../app/api/v1/payments/verify/route";

describe("Prompt O4: Payments Routing & Gateway Sandbox Handlers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("1. GET /api/v1/payments/ifsc/[code]", () => {
    it("auto-fills bank and branch for a valid IFSC code (SBIN0000691)", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/payments/ifsc/SBIN0000691");
      const res = await getIfscDetails(req, { params: Promise.resolve({ code: "SBIN0000691" }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.test_mode).toBe(true);
      expect(data.details.bank).toBe("State Bank of India");
      expect(data.details.branch).toBe("Roorkee IIT");
      expect(data.details.ifsc).toBe("SBIN0000691");
    });

    it("rejects malformed IFSC code with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/payments/ifsc/INVALID_123");
      const res = await getIfscDetails(req, { params: Promise.resolve({ code: "INVALID_123" }) });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("INVALID_IFSC_FORMAT");
    });
  });

  describe("2. POST /api/v1/payments/webhook", () => {
    it("rejects webhook request without signature header", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "dummy" }),
      });

      const res = await handleWebhook(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/missing signature header/i);
    });

    it("rejects webhook request with tampered signature", async () => {
      const rawBody = JSON.stringify({
        id: "evt_test_fake_01",
        event: "payment.captured",
        payload: {
          payment: {
            entity: { id: "pay_test_123", order_id: "order_test_999", amount: 500000 },
          },
        },
      });

      const req = new NextRequest("http://localhost:3000/api/v1/payments/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": "tampered_signature_hex_1234567890",
        },
        body: rawBody,
      });

      const res = await handleWebhook(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("INVALID_SIGNATURE");
    });
  });

  describe("3. POST /api/v1/payments/orders", () => {
    it("returns 401 when unauthenticated", async () => {
      mockAuth.mockResolvedValueOnce(null as never);

      const req = new NextRequest("http://localhost:3000/api/v1/payments/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fee_type: "hostel_rent",
          amount_paise: 4250000,
        }),
      });

      const res = await createOrder(req);
      expect(res.status).toBe(401);
    });
  });

  describe("4. POST /api/v1/payments/verify", () => {
    it("returns 401 when unauthenticated", async () => {
      mockAuth.mockResolvedValueOnce(null as never);

      const req = new NextRequest("http://localhost:3000/api/v1/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: "order_sample",
          payment_id: "pay_sample",
          signature: "sig_sample",
        }),
      });

      const res = await verifyPayment(req);
      expect(res.status).toBe(401);
    });
  });
});
