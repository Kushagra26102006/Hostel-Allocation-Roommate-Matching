"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Download, Trash2, Lock, FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Privacy & Consent Centre</h1>
        <p className="text-xs text-muted">Manage your encrypted compatibility data, export JSON backups, or hard-delete your records anytime.</p>
      </div>

      {deleteSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Your questionnaire answers have been hard-deleted and consent withdrawn.
        </div>
      )}

      {/* Main Privacy Controls Card */}
      <Card className="border-border/60 bg-surface/80 backdrop-blur-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-400" />
            My Compatibility Questionnaire Answers
          </CardTitle>
          <CardDescription>
            Stored in database using AES-256-GCM encryption with per-institution keys. Decrypted only for your view.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading my privacy record...
            </div>
          ) : !hasSubmitted || !answers ? (
            <div className="py-8 text-center text-xs text-muted space-y-2">
              <p>You have not submitted a compatibility questionnaire yet or consent has been withdrawn.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(answers).map(([key, item]) => (
                  <div key={key} className="p-3 rounded-xl border border-border/40 bg-surface/40 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold uppercase tracking-wider text-[11px] text-muted">{key}</p>
                      <p className="font-bold text-text mt-0.5">Value: {String(item.value)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted">Importance: {item.importance}/3</span>
                      {item.dealBreaker && (
                        <p className="text-[10px] font-bold text-amber-400">Deal-breaker</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Data Export & Hard Deletion Controls */}
              <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center gap-4">
                <Button variant="outline" size="sm" onClick={exportMyDataJson}>
                  <Download className="w-4 h-4 mr-2" /> Export My Data (JSON)
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-rose-500/40 text-rose-400 hover:bg-rose-950/40"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete My Answers & Withdraw Consent
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" /> Confirm Hard-Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs text-muted">
            <p>Are you sure you want to hard-delete your compatibility questionnaire answers?</p>
            <p>This action will immediately purge ciphertext from the database and record your consent withdrawal. This cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={deleting}
              onClick={confirmDeleteAndWithdraw}
            >
              {deleting ? "Deleting..." : "Confirm & Delete Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
