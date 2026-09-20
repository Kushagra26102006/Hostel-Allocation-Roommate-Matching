"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Eye, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ApplicationDocumentItem {
  _id: string;
  application_id: string;
  type: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: "pending_scan" | "clean" | "quarantined" | "verified" | "rejected";
  rejection_reason?: string | undefined;
  createdAt: string;
}

export function DocumentVerificationQueue() {
  const [documents, setDocuments] = useState<ApplicationDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<ApplicationDocumentItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      // In production or mock dev mode, fetch documents list
      const res = await fetch("/api/v1/applications");
      const data = await res.json();
      // For queue demonstration, populate documents list
      if (Array.isArray(data.items)) {
        setDocuments([
          {
            _id: "doc_101",
            application_id: "app_99",
            type: "income_certificate",
            original_name: "Family_Income_2026.pdf",
            mime_type: "application/pdf",
            size_bytes: 1420000,
            status: "clean",
            createdAt: new Date().toISOString(),
          },
          {
            _id: "doc_102",
            application_id: "app_100",
            type: "caste_certificate",
            original_name: "Caste_Cert_Scan.png",
            mime_type: "image/png",
            size_bytes: 840000,
            status: "pending_scan",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDocuments();
  }, []);

  const handleVerify = async (docId: string, status: "verified" | "rejected", reason?: string) => {
    setProcessingId(docId);
    try {
      const res = await fetch(`/api/v1/documents/${docId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          rejection_reason: reason,
        }),
      });

      if (res.ok) {
        setDocuments((prev) =>
          prev.map((d) =>
            d._id === docId
              ? ({ ...d, status, rejection_reason: reason } as ApplicationDocumentItem)
              : d,
          ),
        );
        setSelectedDoc(null);
        setRejectionReason("");
      } else {
        alert("Verification update failed");
      }
    } catch {
      alert("Error processing verification action");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownload = async (docId: string) => {
    try {
      const res = await fetch(`/api/v1/documents/${docId}/download`);
      const data = await res.json();
      if (data.presigned_url) {
        window.open(data.presigned_url, "_blank");
      }
    } catch {
      alert("Could not fetch presigned download URL");
    }
  };

  return (
    <Card className="max-w-5xl mx-auto border-border/60 bg-surface/80 backdrop-blur-md shadow-2xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-brand-400" />
          Document Verification Queue
        </CardTitle>
        <CardDescription>
          Review uploaded student certificates & documents. Verify or reject with audited reasons.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 flex items-center justify-center text-muted">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading verification queue...
          </div>
        ) : documents.length === 0 ? (
          <div className="py-12 text-center text-muted text-sm">
            No documents pending verification.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/60 text-muted uppercase text-xs">
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Scan Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-4 font-medium">{doc.original_name}</td>
                    <td className="py-3 px-4 capitalize text-muted">
                      {doc.type.replace("_", " ")}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {(doc.size_bytes / 1024).toFixed(0)} KB
                    </td>
                    <td className="py-3 px-4">
                      {doc.status === "clean" && (
                        <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 font-semibold">
                          Clean
                        </span>
                      )}
                      {doc.status === "verified" && (
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 font-semibold">
                          Verified
                        </span>
                      )}
                      {doc.status === "rejected" && (
                        <span className="px-2 py-0.5 rounded text-xs bg-rose-500/20 text-rose-400 font-semibold">
                          Rejected
                        </span>
                      )}
                      {doc.status === "pending_scan" && (
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 font-semibold">
                          Pending Scan
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDownload(doc._id)}
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40"
                        disabled={processingId === doc._id || doc.status === "verified"}
                        onClick={() => void handleVerify(doc._id, "verified")}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Verify
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-rose-500/40 text-rose-400 hover:bg-rose-950/40"
                        disabled={processingId === doc._id || doc.status === "rejected"}
                        onClick={() => setSelectedDoc(doc)}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rejection Dialog */}
        <Dialog open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" /> Reject Document
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-xs text-muted">
                Provide a reason for rejecting student document ({selectedDoc?.original_name}). This
                action will be audited.
              </p>
              <Input
                placeholder="e.g. Image blurry or document expired"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedDoc(null)}>
                Cancel
              </Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700 text-white"
                disabled={!rejectionReason.trim()}
                onClick={() =>
                  selectedDoc && void handleVerify(selectedDoc._id, "rejected", rejectionReason)
                }
              >
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
