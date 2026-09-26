"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, QrCode, ShieldCheck, Download, Calendar, Building, User } from "lucide-react";
import QRCode from "qrcode";

interface GatePassModalProps {
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
  };
}

export function GatePassModal({ isOpen, onClose, student }: GatePassModalProps) {
  const [qrDataUrl, setQrDataUrl] = React.useState<string>("");
  const passId = "GP-2026-NIT-84920";
  const validUntil = "Dec 31, 2026 • 23:59 IST";

  React.useEffect(() => {
    if (isOpen) {
      const payload = JSON.stringify({
        passId,
        studentName: student.name,
        rollNo: student.rollNo,
        hostel: student.hostel,
        room: student.room,
        bed: student.bed,
        validUntil,
        issuer: "NIT Campus Estate Office",
        verified: true,
      });

      QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch(console.error);
    }
  }, [isOpen, student]);

  // Handle ESC key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/80 bg-surface/95 p-6 shadow-2xl backdrop-blur-2xl text-text z-10"
            role="dialog"
            aria-modal="true"
            aria-label="Digital Gate Pass"
          >
            {/* Header Ambient Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-gradient-to-tr from-brand-600/30 to-cyan-500/30 blur-2xl pointer-events-none" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted/10 hover:bg-muted/20 text-muted hover:text-text transition-colors"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-brand-500/20">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-lg font-bold text-text">Digital Gate Pass</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs text-muted">Authorized Campus Resident Entry Permit</p>
              </div>
            </div>

            {/* Pass Body / Card */}
            <div className="relative rounded-2xl border border-border/70 bg-card/60 p-4 shadow-inner">
              {/* QR Code with scanning laser animation */}
              <div className="relative mx-auto my-2 flex h-56 w-56 items-center justify-center overflow-hidden rounded-2xl border-2 border-brand-500/40 bg-white p-3 shadow-lg">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Digital Gate Pass QR Code"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="h-full w-full animate-pulse bg-slate-200 rounded-xl" />
                )}

                {/* Laser Scanning Line Animation */}
                <div className="pointer-events-none absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] animate-scan" />
              </div>

              {/* Security ID Badge */}
              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3 text-[11px]">
                <span className="font-mono text-muted">{passId}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> Ed25519 Signed
                </span>
              </div>
            </div>

            {/* Resident Details Grid */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-border/50 bg-muted/5 p-2.5">
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted uppercase">
                  <User className="h-3 w-3" /> Resident
                </span>
                <p className="font-bold text-text truncate mt-0.5">{student.name}</p>
                <p className="text-[10px] text-muted">{student.rollNo}</p>
              </div>

              <div className="rounded-xl border border-border/50 bg-muted/5 p-2.5">
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted uppercase">
                  <Building className="h-3 w-3" /> Room &amp; Bed
                </span>
                <p className="font-bold text-text truncate mt-0.5">
                  Room {student.room} • {student.bed}
                </p>
                <p className="text-[10px] text-muted">{student.hostel}</p>
              </div>
            </div>

            {/* Validity Strip */}
            <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-500/10 border border-brand-500/20 px-3 py-2 text-xs">
              <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[11px] font-medium">Valid Until:</span>
              </div>
              <span className="font-semibold text-text text-[11px]">{validUntil}</span>
            </div>

            {/* Footer Action Buttons */}
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-brand-500/20 transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Save Pass</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border bg-card/80 hover:bg-muted/10 px-4 py-2.5 text-xs font-semibold text-text transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
