"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TestModeBanner } from "./test-mode-banner";
import {
  CreditCard,
  QrCode,
  Building2,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
} from "lucide-react";

interface RazorpayCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    orderId: string;
    amountPaise: number;
    feeType: string;
    description: string;
  } | null;
  onPaymentSuccess?: (verifiedOrder: Record<string, unknown>) => void;
}

export function RazorpayCheckoutModal({
  isOpen,
  onClose,
  order,
  onPaymentSuccess,
}: RazorpayCheckoutModalProps) {
  const [method, setMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    orderId: string;
    receiptNumber: string;
    receiptUrl: string;
    paymentId: string;
  } | null>(null);

  if (!order) return null;

  const amountInRupees = (order.amountPaise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleSimulatePayment = async (tamperSignature: boolean = false) => {
    setIsProcessing(true);
    setError(null);

    try {
      const mockPaymentId = `pay_test_${Math.random().toString(36).substring(2, 10)}`;

      // Compute signature for test mode: sha256 hex of `${orderId}|${paymentId}` with test secret
      // We can generate it client side using SubtleCrypto or test adapter secret
      // In RazorpayTestAdapter default keySecret: "test_secret_abcdef123456"
      const secret = "test_secret_abcdef123456";
      const message = `${order.orderId}|${mockPaymentId}`;

      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        enc.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(message));
      let signatureHex = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (tamperSignature) {
        signatureHex = signatureHex.substring(0, signatureHex.length - 4) + "dead";
      }

      const res = await fetch("/api/v1/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.orderId,
          payment_id: mockPaymentId,
          signature: signatureHex,
          method,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Payment verification failed");
      }

      setSuccessData({
        orderId: order.orderId,
        receiptNumber: data.order.receipt_number,
        receiptUrl: data.receipt_url,
        paymentId: mockPaymentId,
      });

      if (onPaymentSuccess) {
        onPaymentSuccess(data.order);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process payment";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSuccessData(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleReset()}>
      <DialogContent className="sm:max-w-md max-w-[95vw] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <span>Razorpay Sandbox Checkout</span>
            </DialogTitle>
            <TestModeBanner compact />
          </div>
          <DialogDescription className="text-xs">
            Complete simulated fee payment in test mode. No card details or real funds required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Amount Card */}
          <div className="rounded-xl border bg-muted/30 p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase font-semibold">
              Total Payable Amount
            </p>
            <p className="text-3xl font-extrabold text-foreground mt-1">₹ {amountInRupees}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              ({order.amountPaise.toLocaleString()} paise) •{" "}
              {order.feeType.replace(/_/g, " ").toUpperCase()}
            </p>
            <div className="mt-2 text-[11px] text-muted-foreground font-mono bg-background/50 px-2 py-1 rounded inline-block">
              Order ID: {order.orderId}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Payment Failed</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {successData ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <h4 className="font-bold text-base text-emerald-700 dark:text-emerald-300">
                  Payment Successful!
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Signature verified and payment marked paid in test sandbox.
                </p>
              </div>

              <div className="text-xs text-left bg-background/80 p-3 rounded-lg border space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receipt No:</span>
                  <span className="font-semibold">{successData.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment ID:</span>
                  <span className="font-semibold">{successData.paymentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-semibold text-emerald-600">PAID (TEST)</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <a
                  href={`/api/v1/payments/receipts/${order.orderId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  <Download className="h-4 w-4" />
                  <span>Download PDF Receipt</span>
                </a>
                <Button variant="outline" onClick={handleReset} className="w-full">
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Select Test Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod("upi")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                      method === "upi"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <QrCode className="h-5 w-5 mb-1.5" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod("card")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                      method === "card"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <CreditCard className="h-5 w-5 mb-1.5" />
                    <span>Test Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod("netbanking")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                      method === "netbanking"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <Building2 className="h-5 w-5 mb-1.5" />
                    <span>Netbanking</span>
                  </button>
                </div>
              </div>

              {/* Method Details */}
              <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                {method === "upi" && (
                  <p>
                    Simulated UPI ID:{" "}
                    <code className="text-foreground font-semibold">success@razorpay</code>.
                    Approves instantly without real bank routing.
                  </p>
                )}
                {method === "card" && (
                  <p>
                    Test Sandbox Card:{" "}
                    <code className="text-foreground font-semibold">4111 2222 3333 4444</code> (Exp:
                    12/30, CVV: 123).
                  </p>
                )}
                {method === "netbanking" && (
                  <p>
                    Simulated Netbanking:{" "}
                    <code className="text-foreground font-semibold">
                      SBI / HDFC / ICICI Sandbox Gateway
                    </code>
                    .
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => handleSimulatePayment(false)}
                  disabled={isProcessing}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-5"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span>Verifying Sandbox Signature...</span>
                    </>
                  ) : (
                    <span>Simulate Successful Payment (₹ {amountInRupees})</span>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSimulatePayment(true)}
                  disabled={isProcessing}
                  className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-dashed"
                >
                  <span>Test Tampered Signature Rejection</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
