"use client";

import React, { useState, useEffect } from "react";
import { TestModeBanner } from "@/components/payments/test-mode-banner";
import { PaymentStatusCard } from "@/components/payments/payment-status-card";
import { RazorpayCheckoutModal } from "@/components/payments/razorpay-checkout-modal";
import { RefundDetailsForm } from "@/components/payments/refund-details-form";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import type { StudentPaymentSummary } from "@hostelhub/domain";

interface CheckoutOrderModalData {
  id: string;
  orderId: string;
  amountPaise: number;
  feeType: string;
  description: string;
}

export default function StudentPaymentsPage() {
  const [summary, setSummary] = useState<StudentPaymentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutOrder, setCheckoutOrder] = useState<CheckoutOrderModalData | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const fetchSummary = async () => {
    try {
      const res = await fetch("/api/v1/payments/summary");
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleCreateAndOpenCheckout = async (feeType: string, amountPaise: number) => {
    setIsCreatingOrder(true);
    try {
      const res = await fetch("/api/v1/payments/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fee_type: feeType,
          amount_paise: amountPaise,
          description: `Semester fee payment (${feeType.replace(/_/g, " ")}) - Test Mode`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.gateway_order) {
        setCheckoutOrder({
          id: data.order.id,
          orderId: data.gateway_order.orderId,
          amountPaise: data.gateway_order.amountPaise,
          feeType: data.order.fee_type,
          description: data.order.description,
        });
        setIsCheckoutOpen(true);
      }
    } catch {
      // ignore
    } finally {
      setIsCreatingOrder(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      {/* 1. Test Mode Banner */}
      <TestModeBanner />

      {/* 2. Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Autumn 2026 Housing Fees</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-heading">
            Hostel Fee Payments & Refund Routing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage semester rent, caution deposits, instant PDF receipts, and encrypted refund bank
            accounts in sandbox test mode.
          </p>
        </div>
      </div>

      {/* 3. Payment Status & Balances */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading payment summary...</span>
        </div>
      ) : summary ? (
        <PaymentStatusCard
          summary={summary}
          onOpenCheckout={(feeType, amountPaise) =>
            handleCreateAndOpenCheckout(feeType, amountPaise)
          }
        />
      ) : (
        <div className="rounded-xl border p-8 text-center text-muted-foreground">
          Unable to load payment summary.
        </div>
      )}

      {/* 4. Fee Quick-Pay Options */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Available Fee Packages</h3>
            <p className="text-xs text-muted-foreground">
              Select an item to simulate payment through the Razorpay sandbox adapter.
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">Amounts in integer paise</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Deposit
              </span>
              <h4 className="font-bold text-base text-foreground">Caution Deposit</h4>
              <p className="text-2xl font-extrabold text-foreground">₹ 5,000.00</p>
              <p className="text-xs text-muted-foreground">
                500,000 paise • Refundable at end of stay after room inspection clearance.
              </p>
            </div>
            <Button
              onClick={() => handleCreateAndOpenCheckout("caution_deposit", 500000)}
              disabled={isCreatingOrder}
              variant="outline"
              className="mt-4 w-full font-semibold"
            >
              Pay Deposit (Test Mode)
            </Button>
          </GlassCard>

          <GlassCard className="p-5 flex flex-col justify-between border-primary/40 bg-primary/5">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Popular
              </span>
              <h4 className="font-bold text-base text-foreground">Full Semester Hostel & Mess</h4>
              <p className="text-2xl font-extrabold text-primary">₹ 42,500.00</p>
              <p className="text-xs text-muted-foreground">
                4,250,000 paise • Covers semester room rent, amenities, and advance mess bill.
              </p>
            </div>
            <Button
              onClick={() => handleCreateAndOpenCheckout("full_semester", 4250000)}
              disabled={isCreatingOrder}
              className="mt-4 w-full bg-primary hover:bg-primary/90 font-semibold"
            >
              Pay Full Semester (Test Mode)
            </Button>
          </GlassCard>

          <GlassCard className="p-5 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Dining
              </span>
              <h4 className="font-bold text-base text-foreground">Mess Advance</h4>
              <p className="text-2xl font-extrabold text-foreground">₹ 15,000.00</p>
              <p className="text-xs text-muted-foreground">
                1,500,000 paise • Monthly dining hall meal subscription credit.
              </p>
            </div>
            <Button
              onClick={() => handleCreateAndOpenCheckout("mess_fee", 1500000)}
              disabled={isCreatingOrder}
              variant="outline"
              className="mt-4 w-full font-semibold"
            >
              Pay Mess (Test Mode)
            </Button>
          </GlassCard>
        </div>
      </div>

      {/* 5. Refund Bank Details Form */}
      <RefundDetailsForm />

      {/* 6. Checkout Modal */}
      <RazorpayCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        order={checkoutOrder}
        onPaymentSuccess={() => {
          fetchSummary();
        }}
      />
    </div>
  );
}
