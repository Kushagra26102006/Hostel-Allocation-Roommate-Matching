import type { Metadata } from "next";
import { CreditCard, Download, Receipt, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/glass-card";

export const metadata: Metadata = {
  title: "Fee Payments & Invoices — HostelHub",
  description: "View semester hostel rent, mess fees, receipts, and caution deposit status.",
};

export default function StudentPaymentsPage() {
  const feeSummary = {
    semester: "Autumn 2026 (Semester 5)",
    totalBilled: 42500,
    totalPaid: 42500,
    balanceDue: 0,
    cautionDeposit: 5000,
    cautionDepositStatus: "Held (Refundable at degree completion)",
  };

  const lineItems = [
    { name: "Hostel Room Rent (Double AC • 1 Semester)", amount: 24000, category: "Accommodation" },
    { name: "Mess Advance & Dining Facility (4 Meals/Day)", amount: 18000, category: "Dining" },
    { name: "Estate & Wi-Fi High-Speed Infrastructure", amount: 2500, category: "Services" },
    { name: "Institutional Caution Deposit (One-time)", amount: 5000, category: "Refundable" },
    { name: "Dean's Merit Subsidy (CGPA > 8.5)", amount: -7000, category: "Scholarship / Waiver" },
  ];

  const transactions = [
    {
      id: "txn-1",
      reference: "TXN-2026-0911-8842",
      description: "Autumn 2026 Hostel & Mess Fee (Full Payment)",
      method: "UPI (Google Pay • Ref 4291884021)",
      date: "September 11, 2026 • 15:42 IST",
      amount: 42500,
      status: "Successful",
      receiptNo: "REC-2026-AUT-042",
    },
    {
      id: "txn-2",
      reference: "TXN-2026-0112-4019",
      description: "Spring 2026 Hostel & Mess Fee",
      method: "Net Banking (SBI Internet Banking)",
      date: "January 12, 2026 • 11:20 IST",
      amount: 40500,
      status: "Successful",
      receiptNo: "REC-2026-SPR-042",
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300 mb-2">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Accounts & Bursar</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
            Hostel & Mess Payments
          </h1>
          <p className="mt-1 text-sm text-muted">
            Track semester billing, caution deposit balance, and download verified tax receipts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2.5 text-xs font-bold text-text hover:bg-muted/10 transition-colors"
          >
            <Download className="h-4 w-4 text-muted" />
            <span>Consolidated Tax Certificate</span>
          </button>
        </div>
      </div>

      {/* 2. Key Financial KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Semester Billing
          </span>
          <div className="text-2xl font-bold text-text mt-2">
            ₹{feeSummary.totalBilled.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-muted mt-1">{feeSummary.semester}</p>
        </GlassCard>

        <GlassCard className="p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Amount Cleared
          </span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            ₹{feeSummary.totalPaid.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-muted mt-1">Paid on Sep 11, 2026</p>
        </GlassCard>

        <GlassCard className="p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Pending Balance
          </span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            ₹0.00
          </div>
          <p className="text-xs text-muted mt-1">No outstanding dues</p>
        </GlassCard>

        <GlassCard className="p-5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            Caution Deposit
          </span>
          <div className="text-2xl font-bold text-text mt-2">
            ₹{feeSummary.cautionDeposit.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-muted mt-1">Refundable on degree completion</p>
        </GlassCard>
      </div>

      {/* 3. Fee Breakup & Receipt */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Itemized Breakup */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading text-lg font-bold text-text">
                  Autumn 2026 Itemized Fee Schedule
                </h2>
                <p className="text-xs text-muted">Approved by NIT Hostel Welfare Committee</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Receipt #REC-2026-AUT-042
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Fee Component</th>
                    <th className="pb-3 font-semibold">Category</th>
                    <th className="pb-3 font-semibold text-right">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {lineItems.map((item) => (
                    <tr key={item.name} className="hover:bg-muted/5 transition-colors">
                      <td className="py-3 font-medium text-text">{item.name}</td>
                      <td className="py-3 text-muted">{item.category}</td>
                      <td
                        className={`py-3 text-right font-mono font-semibold ${item.amount < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-text"}`}
                      >
                        {item.amount < 0
                          ? "-₹" + Math.abs(item.amount).toLocaleString("en-IN")
                          : "₹" + item.amount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-bold">
                    <td className="py-4 text-text text-sm">Net Payable Total</td>
                    <td className="py-4 text-muted">Cleared in Full</td>
                    <td className="py-4 text-right font-mono text-sm text-text">
                      ₹{feeSummary.totalPaid.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* Right Col: Instant Payment Slip & Safety Guarantee */}
        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">Official Digital Receipt</h3>
                <p className="text-[11px] text-muted">Digitally sealed by NIT Bursar</p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/10 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Student Name</span>
                <span className="font-semibold text-text">Aarav Sharma</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Roll Number</span>
                <span className="font-semibold text-text">22BCS042</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Hostel & Room</span>
                <span className="font-semibold text-text">Aryabhata • Room 304</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Payment Ref</span>
                <span className="font-mono text-text">4291884021</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-2 font-bold">
                <span className="text-text">Status</span>
                <span className="text-emerald-600 dark:text-emerald-400">PAID IN FULL</span>
              </div>
            </div>

            <button
              type="button"
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white hover:bg-brand-500 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF Receipt</span>
            </button>
          </GlassCard>

          <GlassCard className="p-5 border-border/60 bg-muted/5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-text">Payment Gateway Protection</h4>
                <p className="text-[11px] text-muted mt-1">
                  All transactions are 256-bit encrypted via RBI-licensed bank aggregators. No
                  sensitive card data is stored.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* 4. Past Transaction History */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-lg font-bold text-text">Transaction History</h2>
            <p className="text-xs text-muted">
              All payment records associated with student account
            </p>
          </div>
          <span className="text-xs font-semibold text-muted">
            {transactions.length} Recorded Transactions
          </span>
        </div>

        <div className="divide-y divide-border/40">
          {transactions.map((txn) => (
            <div
              key={txn.id}
              className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                    {txn.reference}
                  </span>
                  <span className="inline-flex rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {txn.status}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-text">{txn.description}</h4>
                <p className="text-[11px] text-muted mt-0.5">
                  {txn.method} • {txn.date}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono text-sm font-bold text-text">
                  ₹{txn.amount.toLocaleString("en-IN")}
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-text hover:bg-muted/10 transition-colors flex items-center gap-1.5"
                >
                  <Download className="h-3 w-3 text-muted" />
                  <span>Receipt</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
