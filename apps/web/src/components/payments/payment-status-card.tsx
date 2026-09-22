"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertTriangle, CheckCircle2, Lock, Download } from "lucide-react";
import { TestModeBanner } from "./test-mode-banner";

import type { StudentPaymentSummary } from "@hostelhub/domain";

interface PaymentStatusCardProps {
  summary: StudentPaymentSummary;
  onOpenCheckout: (feeType: string, amountPaise: number) => void;
}

export function PaymentStatusCard({ summary, onOpenCheckout }: PaymentStatusCardProps) {
  const billedInr = (summary.totalBilledPaise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const paidInr = (summary.totalPaidPaise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const balanceInr = (summary.balanceDuePaise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="rounded-2xl border bg-card/70 backdrop-blur-md p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-foreground">Hostel Fee & Deposit Status</h3>
            <TestModeBanner compact />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Academic Year 2026-27 • Semester 1 Billing Overview
          </p>
        </div>

        {/* Policy Flag Badge */}
        {summary.isFullyPaid ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold self-start sm:self-auto">
            <CheckCircle2 className="h-4 w-4" />
            <span>FEES FULLY PAID</span>
          </div>
        ) : summary.policyFlag === "hold" ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-bold self-start sm:self-auto">
            <Lock className="h-4 w-4" />
            <span>UNPAID HOLD — ROOM ACCESS ON HOLD</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold self-start sm:self-auto">
            <AlertTriangle className="h-4 w-4" />
            <span>FEE PAYMENT PENDING (WARNING)</span>
          </div>
        )}
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-muted/20 p-4">
          <span className="text-xs text-muted-foreground font-semibold uppercase">
            Total Billed
          </span>
          <p className="text-2xl font-bold text-foreground mt-1">₹ {billedInr}</p>
          <span className="text-[11px] text-muted-foreground font-mono">
            {summary.totalBilledPaise.toLocaleString()} paise
          </span>
        </div>

        <div className="rounded-xl border bg-muted/20 p-4">
          <span className="text-xs text-muted-foreground font-semibold uppercase">
            Total Paid (Test)
          </span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            ₹ {paidInr}
          </p>
          <span className="text-[11px] text-muted-foreground font-mono">
            {summary.totalPaidPaise.toLocaleString()} paise
          </span>
        </div>

        <div className="rounded-xl border bg-muted/20 p-4">
          <span className="text-xs text-muted-foreground font-semibold uppercase">Balance Due</span>
          <p
            className={`text-2xl font-bold mt-1 ${
              summary.balanceDuePaise > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
            }`}
          >
            ₹ {balanceInr}
          </p>
          <span className="text-[11px] text-muted-foreground font-mono">
            {summary.balanceDuePaise.toLocaleString()} paise
          </span>
        </div>
      </div>

      {/* Pay CTA if balance remains */}
      {summary.balanceDuePaise > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
              Outstanding Semester Balance: ₹ {balanceInr}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.policyFlag === "hold"
                ? "Warden policy is set to HOLD. Pay fee in test mode to unblock check-in."
                : "Warden policy is set to WARNING. Please clear before room allocation deadline."}
            </p>
          </div>

          <Button
            onClick={() => onOpenCheckout("full_semester", summary.balanceDuePaise)}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Pay Fee (Test Mode)</span>
          </Button>
        </div>
      )}

      {/* Recent Orders & Receipts */}
      {summary.recentOrders && summary.recentOrders.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Transaction History & Official Receipts
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 px-3 font-semibold">Receipt No</th>
                  <th className="py-2 px-3 font-semibold">Fee Type</th>
                  <th className="py-2 px-3 font-semibold">Amount</th>
                  <th className="py-2 px-3 font-semibold">Status</th>
                  <th className="py-2 px-3 font-semibold">Date</th>
                  <th className="py-2 px-3 font-semibold text-right">Receipt PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {summary.recentOrders.map((ord) => (
                  <tr key={ord.orderId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium">{ord.receiptNumber}</td>
                    <td className="py-2.5 px-3 capitalize">{ord.feeType.replace(/_/g, " ")}</td>
                    <td className="py-2.5 px-3 font-semibold">
                      ₹ {(ord.amountPaise / 100).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.status === "paid"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {ord.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {new Date(ord.paidAt || ord.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {ord.status === "paid" ? (
                        <a
                          href={`/api/v1/payments/receipts/${ord.orderId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-xs"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>PDF</span>
                        </a>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenCheckout(ord.feeType, ord.amountPaise)}
                          className="h-7 text-xs font-semibold text-primary"
                        >
                          Retry
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
