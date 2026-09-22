"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, CheckCircle2, AlertCircle, Building, Loader2, Lock } from "lucide-react";

interface RefundAccountData {
  accountHolderName: string;
  accountNumberLast4: string;
  maskedAccountNumber?: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  verified: boolean;
  updatedAt: string;
}

export function RefundDetailsForm() {
  const [existingAccount, setExistingAccount] = useState<RefundAccountData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLookingUpIfsc, setIsLookingUpIfsc] = useState(false);

  // Form fields
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");

  const [ifscVerified, setIfscVerified] = useState(false);
  const [ifscError, setIfscError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchExistingAccount = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/payments/refund-account");
      if (res.ok) {
        const data = await res.json();
        if (data.refund_account) {
          setExistingAccount(data.refund_account);
          setAccountHolderName(data.refund_account.accountHolderName);
          setIfscCode(data.refund_account.ifscCode);
          setBankName(data.refund_account.bankName);
          setBranchName(data.refund_account.branchName);
          setIfscVerified(true);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExistingAccount();
  }, []);

  const handleIfscLookup = async (codeToLookup: string) => {
    const cleanCode = codeToLookup.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 11) {
      setIfscVerified(false);
      return;
    }

    setIsLookingUpIfsc(true);
    setIfscError(null);

    try {
      const res = await fetch(`/api/v1/payments/ifsc/${cleanCode}`);
      const data = await res.json();

      if (res.ok && data.details) {
        setBankName(data.details.bank);
        setBranchName(data.details.branch);
        setIfscVerified(true);
        setIfscError(null);
      } else {
        setIfscVerified(false);
        setIfscError(data.error || "IFSC details could not be found");
      }
    } catch {
      setIfscVerified(false);
      setIfscError("Failed to verify IFSC code");
    } finally {
      setIsLookingUpIfsc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaveSuccess(false);

    if (!accountHolderName.trim()) {
      setFormError("Account holder name is required");
      return;
    }

    if (!accountNumber || !/^\d{8,20}$/.test(accountNumber.trim())) {
      setFormError("Account number must be 8 to 20 numeric digits");
      return;
    }

    if (accountNumber !== confirmAccountNumber) {
      setFormError("Account numbers do not match");
      return;
    }

    if (!ifscVerified) {
      setFormError("Please enter a valid, verified IFSC code");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/v1/payments/refund-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_holder_name: accountHolderName.trim(),
          account_number: accountNumber.trim(),
          ifsc_code: ifscCode.trim().toUpperCase(),
          bank_name: bankName,
          branch_name: branchName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save bank details");
      }

      setSaveSuccess(true);
      setExistingAccount(data.refund_account);
      setAccountNumber("");
      setConfirmAccountNumber("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save bank details";
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>Loading refund details...</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card/60 backdrop-blur-md p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            <span>Caution Deposit & Fee Refund Details</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your designated bank account for hostel deposit returns, scholarship credits, and room
            fee adjustments.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold self-start sm:self-auto">
          <Lock className="h-3.5 w-3.5" />
          <span>AES-256-GCM Encrypted</span>
        </div>
      </div>

      {existingAccount && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Registered Bank Account</span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              Updated: {new Date(existingAccount.updatedAt).toLocaleDateString("en-IN")}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Beneficiary</span>
              <span className="font-semibold text-foreground">
                {existingAccount.accountHolderName}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Account No</span>
              <span className="font-mono font-semibold text-foreground">
                {existingAccount.maskedAccountNumber ||
                  `•••• ${existingAccount.accountNumberLast4}`}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">IFSC Code</span>
              <span className="font-mono font-semibold text-foreground">
                {existingAccount.ifscCode}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Bank & Branch</span>
              <span className="font-semibold text-foreground truncate block">
                {existingAccount.bankName} ({existingAccount.branchName})
              </span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {existingAccount ? "Update Bank Account Details" : "Register Bank Account Details"}
        </h4>

        {formError && (
          <div className="flex items-center gap-2 p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Account encrypted and securely saved!</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="holderName" className="text-xs font-medium">
              Account Holder Name (as in Passbook)
            </Label>
            <Input
              id="holderName"
              placeholder="e.g. Rahul Sharma"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              className="text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="ifscInput"
              className="text-xs font-medium flex items-center justify-between"
            >
              <span>IFSC Code</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                Razorpay IFSC Verified
              </span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="ifscInput"
                placeholder="e.g. SBIN0000691"
                value={ifscCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setIfscCode(val);
                  if (val.length === 11) {
                    handleIfscLookup(val);
                  } else {
                    setIfscVerified(false);
                  }
                }}
                onBlur={() => handleIfscLookup(ifscCode)}
                className="font-mono text-sm uppercase"
                maxLength={11}
                required
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleIfscLookup(ifscCode)}
                disabled={isLookingUpIfsc || !ifscCode}
                className="shrink-0 px-3"
              >
                {isLookingUpIfsc ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Verify</span>
                )}
              </Button>
            </div>
            {ifscError && <p className="text-[11px] text-destructive">{ifscError}</p>}
            {ifscVerified && bankName && (
              <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {bankName} • {branchName}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="accNumber" className="text-xs font-medium">
              Account Number
            </Label>
            <Input
              id="accNumber"
              type="password"
              placeholder="Enter numeric account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="font-mono text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmAccNumber" className="text-xs font-medium">
              Confirm Account Number
            </Label>
            <Input
              id="confirmAccNumber"
              type="text"
              placeholder="Re-enter account number"
              value={confirmAccountNumber}
              onChange={(e) => setConfirmAccountNumber(e.target.value)}
              className="font-mono text-sm"
              required
            />
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Details encrypted with AES-256-GCM before database storage.</span>
          </div>

          <Button
            type="submit"
            disabled={isSaving || !ifscVerified}
            className="w-full sm:w-auto font-semibold"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Encrypting & Saving...</span>
              </>
            ) : (
              <span>{existingAccount ? "Update Bank Details" : "Save Bank Details"}</span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
