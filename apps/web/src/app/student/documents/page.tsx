"use client";

import * as React from "react";
import {
  FolderCheck,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  Trash2,
  File,
  ShieldCheck,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface StudentDocument {
  id: string;
  name: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  category: "required" | "optional";
  status: "verified" | "pending" | "rejected";
  uploadedAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
  sha256: string;
}

export default function StudentDocumentsPage() {
  const [filter, setFilter] = React.useState<
    "all" | "required" | "verified" | "pending" | "rejected"
  >("all");
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [previewDoc, setPreviewDoc] = React.useState<StudentDocument | null>(null);

  const [documents, setDocuments] = React.useState<StudentDocument[]>([
    {
      id: "doc-1",
      name: "Semester Fee Payment Receipt",
      fileName: "fee_receipt_autumn_2026.pdf",
      fileSize: "1.2 MB",
      fileType: "application/pdf",
      category: "required",
      status: "verified",
      uploadedAt: "23 Sep 2026, 10:14 AM",
      verifiedAt: "24 Sep 2026, 02:40 PM",
      sha256: "0x4b78912e...fe10",
    },
    {
      id: "doc-2",
      name: "Institutional Student Photo ID Card",
      fileName: "student_id_card_23cs10042.jpg",
      fileSize: "850 KB",
      fileType: "image/jpeg",
      category: "required",
      status: "verified",
      uploadedAt: "23 Sep 2026, 10:15 AM",
      verifiedAt: "24 Sep 2026, 11:20 AM",
      sha256: "0x89ab10ef...c291",
    },
    {
      id: "doc-3",
      name: "Permanent Address & Domicile Proof",
      fileName: "domicile_certificate_mh.pdf",
      fileSize: "1.4 MB",
      fileType: "application/pdf",
      category: "required",
      status: "verified",
      uploadedAt: "23 Sep 2026, 10:20 AM",
      verifiedAt: "24 Sep 2026, 04:15 PM",
      sha256: "0x12fa9081...e944",
    },
    {
      id: "doc-4",
      name: "Medical Fitness & Vaccination Record",
      fileName: "medical_fitness_form.pdf",
      fileSize: "920 KB",
      fileType: "application/pdf",
      category: "optional",
      status: "pending",
      uploadedAt: "25 Sep 2026, 09:30 AM",
      sha256: "0x77c2810a...aa19",
    },
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation: max size 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File exceeds maximum allowed limit (5 MB). Please compress and try again.");
      return;
    }

    // Validation: format
    const validTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file format. Only PDF, JPG, and PNG documents are accepted.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(0);
            const newDoc: StudentDocument = {
              id: `doc-${Date.now()}`,
              name: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
              fileName: file.name,
              fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
              fileType: file.type,
              category: "optional",
              status: "pending",
              uploadedAt: "Just now",
              sha256: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
            };
            setDocuments((prevDocs) => [newDoc, ...prevDocs]);
            toast.success(`Successfully uploaded "${file.name}" for warden verification!`);
          }, 400);
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  const handleDelete = (id: string, name: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    toast.success(`Deleted "${name}"`);
  };

  const handleReplace = (_id: string) => {
    toast.info("Select new replacement file...");
    const input = document.getElementById("document-upload-input");
    if (input) input.click();
  };

  const filteredDocs = documents.filter((doc) => {
    if (filter === "all") return true;
    if (filter === "required") return doc.category === "required";
    return doc.status === filter;
  });

  const verifiedCount = documents.filter((d) => d.status === "verified").length;
  const pendingCount = documents.filter((d) => d.status === "pending").length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <FolderCheck className="h-3.5 w-3.5" />
            <span>Digital Document Vault</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Student Document Centre
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Upload, verify, and manage supporting certificates for your university housing
            allocation.
          </p>
        </div>

        {/* Upload Trigger Button */}
        <div>
          <input
            id="document-upload-input"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            onClick={() => {
              const input = document.getElementById("document-upload-input");
              if (input) input.click();
            }}
            disabled={isUploading}
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs min-target-size"
          >
            <Upload className="mr-1.5 h-4 w-4" />
            <span>{isUploading ? "Uploading..." : "Upload Document"}</span>
          </Button>
        </div>
      </div>

      {/* Upload Progress Bar (When Uploading) */}
      {isUploading && (
        <div className="p-4 rounded-2xl border border-brand-500/30 bg-brand-50/50 dark:bg-brand-950/40 space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="flex items-center gap-2 text-brand-700 dark:text-brand-300">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Cryptographically salting & uploading document...</span>
            </span>
            <span className="font-mono text-brand-600">{uploadProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Overview Stat Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl border border-border/80 bg-surface shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-muted block">
              Verified Documents
            </span>
            <span className="font-heading text-2xl font-extrabold text-emerald-600 mt-1 block">
              {verifiedCount} Files
            </span>
            <span className="text-[11px] text-muted">Satisfies allocation requirements</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl border border-border/80 bg-surface shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-muted block">
              Pending Verification
            </span>
            <span className="font-heading text-2xl font-extrabold text-amber-600 mt-1 block">
              {pendingCount} File
            </span>
            <span className="text-[11px] text-muted">Under review by Warden Desk</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 shrink-0">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl border border-border/80 bg-surface shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-muted block">
              Allowed Formats
            </span>
            <span className="font-heading text-sm font-bold text-foreground mt-1 block">
              PDF, JPG, PNG &bull; &lt; 5MB
            </span>
            <span className="text-[11px] text-muted">256-bit AES encrypted vault</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border/60 pb-3 overflow-x-auto text-xs">
        {(["all", "required", "verified", "pending", "rejected"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-all min-target-size ${
              filter === tab
                ? "bg-brand-500 text-white shadow-xs"
                : "text-muted hover:text-foreground hover:bg-surface-muted"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        {filteredDocs.map((doc) => {
          const isVerified = doc.status === "verified";
          const isPending = doc.status === "pending";

          return (
            <div
              key={doc.id}
              className="rounded-2xl border border-border/80 bg-surface p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-brand-500/40 transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted text-brand-600 dark:text-brand-400 shrink-0 mt-0.5">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-heading text-sm sm:text-base font-bold text-foreground">
                      {doc.name}
                    </h4>
                    {doc.category === "required" && (
                      <span className="rounded-md bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 text-[10px] font-bold px-1.5 py-0.5 border border-brand-200/80">
                        Required
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isVerified
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : isPending
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      {isVerified ? "Verified" : isPending ? "Pending Review" : "Rejected"}
                    </span>
                  </div>

                  <p className="text-xs text-muted mt-1 font-mono">
                    {doc.fileName} &bull; {doc.fileSize} &bull; Uploaded: {doc.uploadedAt}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewDoc(doc)}
                  className="text-xs border-border/80 hover:bg-surface-muted min-target-size"
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5 text-muted" />
                  <span>Preview</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReplace(doc.id)}
                  className="text-xs border-border/80 hover:bg-surface-muted min-target-size"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-muted" />
                  <span>Replace</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(doc.id, doc.name)}
                  className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 min-target-size"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete {doc.name}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Dialog */}
      {previewDoc && (
        <Dialog open={Boolean(previewDoc)} onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="max-w-lg p-6 bg-surface text-foreground border-border/80">
            <DialogHeader className="text-left border-b border-border/60 pb-3">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-brand-600" />
                <span>{previewDoc.name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted">
                Official verified student document record
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="p-6 rounded-2xl bg-surface-muted/60 border border-border/60 text-center space-y-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 mx-auto">
                  <File className="h-8 w-8" />
                </div>
                <div className="font-heading text-sm font-bold">{previewDoc.fileName}</div>
                <div className="text-[11px] text-muted">
                  {previewDoc.fileSize} &bull; {previewDoc.fileType}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-muted/30 border border-border/60 font-mono text-[11px]">
                <div>
                  <span className="text-muted text-[10px] block">Upload Date:</span>
                  <span className="font-semibold">{previewDoc.uploadedAt}</span>
                </div>
                <div>
                  <span className="text-muted text-[10px] block">Status:</span>
                  <span className="font-semibold capitalize text-emerald-600">
                    {previewDoc.status}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-border/40">
                  <span className="text-muted text-[10px] block">SHA-256 Checksum:</span>
                  <span className="truncate block">{previewDoc.sha256}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewDoc(null)}
                className="text-xs min-target-size"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  toast.success(`Downloading ${previewDoc.fileName}...`);
                  setPreviewDoc(null);
                }}
                className="bg-brand-500 hover:bg-brand-600 text-white text-xs min-target-size"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                <span>Download Copy</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
