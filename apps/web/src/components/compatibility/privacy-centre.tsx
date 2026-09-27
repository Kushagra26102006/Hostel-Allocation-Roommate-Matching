"use client";

import React, { useState, useEffect } from "react";
import {
  Trash2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Key,
  FileJson,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import type { QuestionnaireAnswers } from "@hostelhub/domain";

export function PrivacyCentre() {
  const [answers, setAnswers] = useState<QuestionnaireAnswers | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/me/questionnaire");
      const data = await res.json();
      if (res.ok) {
        setAnswers(data.answers);
        setHasSubmitted(data.hasSubmitted);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const exportMyDataJson = () => {
    if (!answers) return;
    const jsonStr = JSON.stringify(
      {
        exportDate: new Date().toISOString(),
        purpose: "compatibility_questionnaire",
        decryptedAnswers: answers,
      },
      null,
      2,
    );

    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my_compatibility_data_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const confirmDeleteAndWithdraw = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/v1/me/questionnaire", {
        method: "DELETE",
      });

      if (res.ok) {
        setAnswers(null);
        setHasSubmitted(false);
        setShowDeleteModal(false);
        setDeleteSuccess(true);
        setTimeout(() => setDeleteSuccess(false), 4000);
      } else {
        alert("Failed to delete answers.");
      }
    } catch {
      alert("Error deleting questionnaire answers.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-xs font-semibold text-cyan-300 mb-2 font-mono">
          <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
          <span>Security &amp; Encryption Dashboard</span>
        </div>
        <h2 className="font-heading text-2xl font-bold text-white">Privacy &amp; Consent Centre</h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage your encrypted compatibility data, export verifiable JSON backups, or hard-delete
          your records anytime.
        </p>
      </div>

      {deleteSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Your questionnaire answers have been hard-deleted and consent withdrawn.</span>
        </div>
      )}

      {/* Main Privacy Controls Card */}
      <div className="rounded-3xl border border-[rgba(80,120,170,0.25)] bg-[rgba(8,17,36,0.9)] p-6 sm:p-7 backdrop-blur-xl shadow-2xl shadow-black/40 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-white">
                My Compatibility Questionnaire Answers
              </h3>
              <p className="text-xs text-slate-400">
                Stored in database using AES-256-GCM encryption with per-institution keys.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 text-xs font-bold text-cyan-300 font-mono self-start sm:self-auto">
            <Key className="h-3 w-3 text-cyan-400" />
            AES-256-GCM
          </span>
        </div>

        {loading ? (
          <div className="py-10 text-center text-xs text-slate-400 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-cyan-400" /> Loading your encrypted
            privacy record...
          </div>
        ) : !hasSubmitted || !answers ? (
          <div className="py-10 text-center text-xs text-slate-400 space-y-2">
            <p>
              You have not submitted a compatibility questionnaire yet or consent has been
              withdrawn.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(answers).map(([key, item]) => (
                <div
                  key={key}
                  className="p-3.5 rounded-2xl border border-slate-800/80 bg-[#050b1d]/80 flex justify-between items-center text-xs"
                >
                  <div>
                    <p className="font-bold uppercase tracking-wider text-[10px] text-cyan-400 font-mono">
                      {key}
                    </p>
                    <p className="font-bold text-white mt-0.5">Value: {String(item.value)}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Importance: {item.importance}/3
                    </span>
                    {item.dealBreaker && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 font-mono bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        Deal-breaker
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Data Export & Hard Deletion Controls */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                type="button"
                onClick={exportMyDataJson}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-500/30 bg-[#071026] hover:bg-slate-800 text-xs font-semibold text-cyan-300 transition-colors cursor-pointer w-full sm:w-auto justify-center"
              >
                <FileJson className="w-4 h-4 text-cyan-400" /> Export My Data (JSON)
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/40 bg-rose-950/20 hover:bg-rose-950/40 text-xs font-semibold text-rose-300 transition-colors cursor-pointer w-full sm:w-auto justify-center"
              >
                <Trash2 className="w-4 h-4 text-rose-400" /> Delete My Answers &amp; Withdraw
                Consent
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-[#071026] border border-rose-500/40 text-slate-100 max-w-md rounded-3xl p-6 shadow-2xl backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400 text-lg font-bold">
              <AlertTriangle className="w-5 h-5" /> Confirm Hard-Deletion
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              This action will immediately purge ciphertext from the database and record your
              consent withdrawal. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-slate-300">
            Are you sure you want to permanently delete your compatibility questionnaire responses?
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={confirmDeleteAndWithdraw}
              className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 px-4 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Confirm & Delete Now"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
