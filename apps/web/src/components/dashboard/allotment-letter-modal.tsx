"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Printer, ShieldCheck, Building, CheckCircle2 } from "lucide-react";
import QRCode from "qrcode";

interface AllotmentLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    name: string;
    rollNo: string;
    department: string;
    programme: string;
    hostel: string;
    room: string;
    bed: string;
    tower: string;
    cycle: string;
  };
}

export function AllotmentLetterModal({ isOpen, onClose, student }: AllotmentLetterModalProps) {
  const [qrUrl, setQrUrl] = React.useState<string>("");
  const letterRef = "NIT-2026-ALLOT-7712";
  const issueDate = "September 18, 2026";

  React.useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(`https://hostelhub.campus.edu/verify/letter/${letterRef}`, {
        width: 140,
        margin: 1,
        color: { dark: "#0F172A", light: "#FFFFFF" },
      })
        .then(setQrUrl)
        .catch(console.error);
    }
  }, [isOpen]);

  // Handle ESC
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border/80 bg-surface/98 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl text-text z-10 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Official Hostel Allotment Letter"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted/10 hover:bg-muted/20 text-muted hover:text-text transition-colors"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* University Letterhead Document */}
            <div className="rounded-2xl border border-border/70 bg-card/60 p-6 sm:p-8 shadow-xs">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-5 gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md">
                    <Building className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-heading text-base sm:text-lg font-extrabold text-text uppercase tracking-tight">
                      National Institute of Technology
                    </h2>
                    <p className="text-xs text-muted">Office of Chief Warden • Campus Residences</p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" /> OFFICIAL ALLOTMENT
                  </span>
                  <p className="mt-1 font-mono text-[11px] text-muted">Ref: {letterRef}</p>
                </div>
              </div>

              {/* Title */}
              <div className="my-6 text-center">
                <h3 className="font-heading text-lg font-bold text-text uppercase tracking-wide">
                  Hostel Room Allotment Memorandum
                </h3>
                <p className="text-xs text-muted">{student.cycle}</p>
              </div>

              {/* Student & Allotment Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-border/60 bg-surface/70 p-4 text-xs">
                <div>
                  <span className="font-semibold text-muted uppercase text-[10px] tracking-wider block">
                    Resident Student
                  </span>
                  <p className="font-bold text-text text-sm mt-0.5">{student.name}</p>
                  <p className="text-muted mt-0.5">Roll No: {student.rollNo}</p>
                  <p className="text-muted">
                    {student.programme} • {student.department}
                  </p>
                </div>

                <div>
                  <span className="font-semibold text-muted uppercase text-[10px] tracking-wider block">
                    Allocated Accommodation
                  </span>
                  <p className="font-bold text-brand-600 dark:text-brand-400 text-sm mt-0.5">
                    {student.hostel}
                  </p>
                  <p className="text-text mt-0.5">
                    Room {student.room} — {student.bed}
                  </p>
                  <p className="text-muted">{student.tower} • 3rd Floor (Double Sharing AC)</p>
                </div>
              </div>

              {/* Certification Statement */}
              <p className="mt-5 text-xs text-muted leading-relaxed">
                This certifies that the candidate above has been formally allocated residential
                accommodation through the Gale-Shapley automated algorithmic matching system with
                verified roommate preferences. The allotment is valid for the complete academic
                session subject to compliance with institutional residential rules.
              </p>

              {/* Signatures & QR Section */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between border-t border-border/60 pt-5 gap-4">
                <div className="flex items-center gap-3">
                  {qrUrl && (
                    <img
                      src={qrUrl}
                      alt="Verification QR"
                      className="h-16 w-16 rounded-lg border border-border/80 p-1 bg-white"
                    />
                  )}
                  <div className="text-[11px]">
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-3.5 w-3.5" /> Ed25519 Cryptographic Proof
                    </span>
                    <p className="text-muted font-mono mt-0.5">Sha256: 9e41...f80d</p>
                    <p className="text-muted text-[10px]">Issued: {issueDate}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-serif italic text-sm text-text font-bold tracking-wider">
                    Prof. S. R. Vardhan
                  </div>
                  <div className="h-0.5 w-32 bg-border/80 my-1 ml-auto" />
                  <p className="text-[10px] font-semibold text-muted uppercase">
                    Chief Warden &amp; Housing Dean
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card hover:bg-muted/10 px-4 py-2.5 text-xs font-semibold text-text transition-colors"
              >
                <Printer className="h-4 w-4 text-muted" />
                <span>Print Document</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                <Download className="h-4 w-4" />
                <span>Download Official PDF</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
