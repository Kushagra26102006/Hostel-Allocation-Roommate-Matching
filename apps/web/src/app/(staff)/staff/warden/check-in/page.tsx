"use client";

import React, { useState, useEffect } from "react";
import {
  QrCode,
  Scan,
  UserCheck,
  LogOut,
  UserX,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  Building,
  Bed,
  DoorClosed,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { QRScannerModal } from "@/components/checkin/qr-scanner-modal";
import { RoomConditionChecklist } from "@/components/checkin/room-condition-checklist";
import { CheckoutDiffView } from "@/components/checkin/checkout-diff-view";
import type { ChecklistItemRecord, ChecklistDiffReport } from "@hostelhub/domain";

const OFFLINE_STORAGE_KEY = "hostelhub_offline_checkins_queue";

interface CheckInRecordRow {
  _id: string;
  letter_number: string;
  token?: string;
  status: "checked_in" | "checked_out" | "no_show";
  check_in?: {
    time: string;
    warden_name?: string;
  };
  check_out?: {
    time: string;
    damage_liability_flag?: boolean;
  };
  student_id?: {
    name?: string;
    roll_number?: string;
    email?: string;
  };
  hostel_id?: {
    name?: string;
  };
  room_id?: {
    room_number?: string;
  };
  bed_id?: {
    bed_no?: string;
  };
  room_condition_checklist?: Array<{
    item_id: string;
    label: string;
    category: "furniture" | "electrical" | "plumbing" | "fixtures" | "general";
    condition: "good" | "fair" | "damaged" | "missing";
    notes?: string;
    photo_s3_key?: string;
    photo_url?: string;
  }>;
  student_acknowledgement?: {
    acknowledged?: boolean;
    acknowledged_at?: string;
  };
}

interface OfflineQueueItem {
  clientSyncId: string;
  tokenOrCode: string;
  clientScannedAt: string;
  checklist: ChecklistItemRecord[];
  notes?: string;
  studentName?: string;
  roomNumber?: string;
}

interface VerifyResult {
  letter: {
    id: string;
    letterNumber: string;
    token: string;
    studentId: string;
    studentName: string;
    rollNumber: string;
    studentEmail: string;
    hostelId: string;
    hostelName: string;
    roomId: string;
    roomNumber: string;
    bedId: string;
    bedNo: string;
    moveInStartDate?: string;
    moveInEndDate?: string;
  };
  checklistTemplate: Array<{
    id: string;
    label: string;
    category: "furniture" | "electrical" | "plumbing" | "fixtures" | "general";
    required?: boolean;
    defaultCondition?: "good" | "fair" | "damaged" | "missing";
    description?: string;
  }>;
  existingRecord?: {
    id: string;
    status: string;
    checkInTime?: string;
    studentAcknowledged: boolean;
  };
}

export default function WardenCheckInPage() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifyData, setVerifyData] = useState<VerifyResult | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItemRecord[]>([]);
  const [checkInNotes, setCheckInNotes] = useState("");

  // Check-Out State
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [selectedRecordForCheckOut, setSelectedRecordForCheckOut] =
    useState<CheckInRecordRow | null>(null);
  const [checkOutItems, setCheckOutItems] = useState<ChecklistItemRecord[]>([]);
  const [checkOutDiffReport, setCheckOutDiffReport] = useState<ChecklistDiffReport | null>(null);

  // No-Show Modal State
  const [isNoShowOpen, setIsNoShowOpen] = useState(false);
  const [noShowCode, setNoShowCode] = useState("");
  const [noShowReason, setNoShowReason] = useState("");

  // Offline Sync State
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Recent Records Table
  const [records, setRecords] = useState<CheckInRecordRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Load offline queue & track online status
  useEffect(() => {
    setIsOnline(typeof window !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    try {
      const saved = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (saved) {
        setOfflineQueue(JSON.parse(saved));
      }
    } catch {}

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch recent check-ins
  const fetchRecords = async () => {
    try {
      setIsLoadingRecords(true);
      const url =
        statusFilter === "all"
          ? "/api/v1/check-in?limit=25"
          : `/api/v1/check-in?limit=25&status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => {
    void fetchRecords();
  }, [statusFilter]);

  // Handle scanned token or manual code
  const handleScanSuccess = async (tokenOrCode: string) => {
    setIsScannerOpen(false);
    setIsVerifying(true);
    setVerifyData(null);
    setCheckOutDiffReport(null);

    try {
      const res = await fetch("/api/v1/check-in/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_or_code: tokenOrCode }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || error.message || "Failed to verify pass code");
      }

      const data: VerifyResult = await res.json();
      setVerifyData(data);

      // Prepare initial checklist items from template
      const initialItems: ChecklistItemRecord[] = data.checklistTemplate.map((t) => ({
        itemId: t.id,
        label: t.label,
        category: t.category,
        condition: t.defaultCondition ?? "good",
      }));
      setChecklistItems(initialItems);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error verifying pass code");
    } finally {
      setIsVerifying(false);
    }
  };

  // Submit Check-In
  const handleConfirmCheckIn = async () => {
    if (!verifyData) return;

    const payload = {
      token_or_code: verifyData.letter.token || verifyData.letter.letterNumber,
      checklist: checklistItems,
      notes: checkInNotes,
    };

    // If offline, save to local queue
    if (!isOnline) {
      const offlinePayload: OfflineQueueItem = {
        clientSyncId: crypto.randomUUID(),
        clientScannedAt: new Date().toISOString(),
        tokenOrCode: verifyData.letter.token || verifyData.letter.letterNumber,
        studentName: verifyData.letter.studentName,
        roomNumber: verifyData.letter.roomNumber,
        checklist: checklistItems,
        notes: checkInNotes,
      };

      const nextQueue = [...offlineQueue, offlinePayload];
      setOfflineQueue(nextQueue);
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(nextQueue));

      alert(
        "Offline Mode: Check-in saved locally! It will automatically sync once your connection is restored.",
      );
      setVerifyData(null);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.message || "Failed to record check-in");
      }

      alert(`Check-in recorded for ${verifyData.letter.studentName}! Keys may be issued.`);
      setVerifyData(null);
      setCheckInNotes("");
      void fetchRecords();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error saving check-in");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Check-Out
  const handleConfirmCheckOut = async () => {
    if (!selectedRecordForCheckOut) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/check-in/${selectedRecordForCheckOut._id}/check-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklist: checkOutItems,
          notes: "Check-out completed by warden",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.message || "Failed to record check-out");
      }

      const body = await res.json();
      setCheckOutDiffReport(body.diffReport);
      void fetchRecords();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error recording check-out");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit No-Show
  const handleMarkNoShow = async () => {
    if (!noShowCode.trim() || !noShowReason.trim()) {
      alert("Please provide the letter code and a specific reason.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/check-in/no-show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letter_or_assignment_id: noShowCode.trim(),
          reason: noShowReason.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.message || "Failed to mark no-show");
      }

      alert("Student marked as no-show! Bed vacated and waitlist promotion triggered.");
      setIsNoShowOpen(false);
      setNoShowCode("");
      setNoShowReason("");
      void fetchRecords();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error marking no-show");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sync Offline Queue
  const handleSyncOffline = async () => {
    if (offlineQueue.length === 0) return;

    try {
      setIsSyncing(true);
      const formattedRecords = offlineQueue.map((r) => ({
        clientSyncId: r.clientSyncId,
        tokenOrCode: r.tokenOrCode,
        clientScannedAt: r.clientScannedAt,
        checklist: r.checklist,
        notes: r.notes,
      }));

      const res = await fetch("/api/v1/check-in/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: formattedRecords }),
      });

      if (!res.ok) {
        throw new Error("Offline sync failed");
      }

      const result = await res.json();
      alert(`Synced ${result.syncedCount} check-in record(s) successfully!`);
      setOfflineQueue([]);
      localStorage.removeItem(OFFLINE_STORAGE_KEY);
      void fetchRecords();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Sync error");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Workstation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Warden Gate Pass & Check-In Station
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Digital QR verification, room inspection checklist, and key issuance
              </p>
            </div>
          </div>
        </div>

        {/* Connectivity & Offline Sync Status */}
        <div className="flex items-center gap-3">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              isOnline
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? "Online" : "Offline (Local Queue Active)"}</span>
          </div>

          {offlineQueue.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncOffline}
              disabled={!isOnline || isSyncing}
              className="gap-2 text-xs border-amber-300 bg-amber-50/50 hover:bg-amber-100 dark:bg-amber-950/30"
            >
              {isSyncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>
                Sync {offlineQueue.length} Pending Scan{offlineQueue.length > 1 ? "s" : ""}
              </span>
            </Button>
          )}

          <Button
            onClick={() => setIsScannerOpen(true)}
            disabled={isVerifying}
            className="gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:from-sky-600 hover:to-indigo-700 shadow-md"
          >
            {isVerifying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Scan className="w-4 h-4" />
            )}
            <span>{isVerifying ? "Verifying Pass..." : "Scan Student Pass"}</span>
          </Button>
        </div>
      </div>

      {/* Verified Student & Check-In Form */}
      {verifyData && (
        <div className="p-6 rounded-3xl border border-sky-200 dark:border-sky-900/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
                  {verifyData.letter.letterNumber}
                </span>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                >
                  Pass Verified
                </Badge>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {verifyData.letter.studentName}
              </h2>
              <p className="text-xs text-slate-500">
                Roll: {verifyData.letter.rollNumber} • {verifyData.letter.studentEmail}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <Building className="w-4 h-4 mx-auto text-indigo-500 mb-0.5" />
                <span className="text-[10px] text-slate-400 block">Hostel</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block">
                  {verifyData.letter.hostelName}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <DoorClosed className="w-4 h-4 mx-auto text-sky-500 mb-0.5" />
                <span className="text-[10px] text-slate-400 block">Room</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                  #{verifyData.letter.roomNumber}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <Bed className="w-4 h-4 mx-auto text-emerald-500 mb-0.5" />
                <span className="text-[10px] text-slate-400 block">Bed</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                  {verifyData.letter.bedNo}
                </span>
              </div>
            </div>
          </div>

          {verifyData.existingRecord ? (
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Student is already checked in</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Check-in recorded on{" "}
                {new Date(verifyData.existingRecord.checkInTime!).toLocaleString()}. Student mobile
                acknowledgement:{" "}
                {verifyData.existingRecord.studentAcknowledged ? "Acknowledged" : "Pending"}.
              </p>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (verifyData.existingRecord) {
                      setSelectedRecordForCheckOut({
                        _id: verifyData.existingRecord.id,
                        letter_number: verifyData.letter.letterNumber,
                        status: verifyData.existingRecord.status as "checked_in",
                        check_in: {
                          time: verifyData.existingRecord.checkInTime ?? new Date().toISOString(),
                        },
                        student_id: {
                          name: verifyData.letter.studentName,
                          roll_number: verifyData.letter.rollNumber,
                        },
                        hostel_id: { name: verifyData.letter.hostelName },
                        room_id: { room_number: verifyData.letter.roomNumber },
                        bed_id: { bed_no: verifyData.letter.bedNo },
                      });
                    }
                    setCheckOutItems(checklistItems);
                    setIsCheckOutOpen(true);
                  }}
                  className="gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Perform Check-Out Inspection</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setVerifyData(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <RoomConditionChecklist
                items={checklistItems}
                onChange={setChecklistItems}
                title="Move-In Room Condition Inspection"
                description="Inspect and record the baseline condition of all inventory fixtures in the student's presence."
              />

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Warden Handover Notes & Key Numbers
                </label>
                <Input
                  placeholder="e.g. Master key & wardrobe key #101 issued, biometric scan verified"
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  className="text-xs h-9 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setVerifyData(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmCheckIn}
                  disabled={isSubmitting}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  <span>Confirm Check-In & Issue Room Keys</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Action Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => setIsScannerOpen(true)}
          className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md cursor-pointer hover:border-sky-400 transition-all shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Scan className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">QR Pass Scanner</h3>
            <p className="text-xs text-slate-500">Scan student letter or enter code</p>
          </div>
        </div>

        <div
          onClick={() => setIsNoShowOpen(true)}
          className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md cursor-pointer hover:border-amber-400 transition-all shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Mark No-Show</h3>
            <p className="text-xs text-slate-500">Vacate bed and promote from waitlist</p>
          </div>
        </div>

        <div
          onClick={() => void fetchRecords()}
          className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md cursor-pointer hover:border-indigo-400 transition-all shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Refresh Gate Log</h3>
            <p className="text-xs text-slate-500">Reload check-in activity stream</p>
          </div>
        </div>
      </div>

      {/* Recent Records Log */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Recent Check-In & Gate Records
          </h2>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
            {["all", "checked_in", "checked_out", "no_show"].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-lg font-medium capitalize transition-all ${
                  statusFilter === filter
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {filter.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {isLoadingRecords ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading records...</div>
        ) : records.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Pass Code</th>
                    <th className="py-3 px-4">Room & Bed</th>
                    <th className="py-3 px-4">Check-In Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {records.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {r.student_id?.name || "Student"}
                        </span>
                        <span className="text-[11px] text-slate-400">{r.student_id?.email}</span>
                      </td>
                      <td className="py-3 px-4 font-mono">{r.letter_number}</td>
                      <td className="py-3 px-4">
                        <span className="font-medium">
                          {r.hostel_id?.name || "Hostel"} #{r.room_id?.room_number}
                        </span>
                        <span className="text-[11px] text-slate-400 block">{r.bed_id?.bed_no}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {r.check_in?.time ? new Date(r.check_in.time).toLocaleString() : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`capitalize text-[10px] ${
                            r.status === "checked_in"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : r.status === "checked_out"
                                ? "bg-sky-50 text-sky-700 border-sky-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {r.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.status === "checked_in" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              setSelectedRecordForCheckOut(r);
                              const items: ChecklistItemRecord[] = (
                                r.room_condition_checklist || []
                              ).map((c) => ({
                                itemId: c.item_id,
                                label: c.label,
                                category: c.category,
                                condition: c.condition,
                                notes: c.notes,
                                photoS3Key: c.photo_s3_key,
                                photoUrl: c.photo_url,
                              }));
                              setCheckOutItems(items);
                              setIsCheckOutOpen(true);
                            }}
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Check-Out</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            No check-in records found for this filter.
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Check-Out Inspection Dialog */}
      <Dialog open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-indigo-500" />
              <span>Check-Out Inspection & Clearance</span>
            </DialogTitle>
            <DialogDescription>
              Repeat the room-condition checklist and record any damaged or missing inventory.
            </DialogDescription>
          </DialogHeader>

          {checkOutDiffReport ? (
            <div className="space-y-4 my-4">
              <CheckoutDiffView diffReport={checkOutDiffReport} />
              <DialogFooter>
                <Button onClick={() => setIsCheckOutOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-6 my-4">
              <RoomConditionChecklist
                items={checkOutItems}
                onChange={setCheckOutItems}
                title="Check-Out Room Condition"
                description="Mark items as damaged or missing if condition deteriorated since move-in."
              />

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCheckOutOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmCheckOut}
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Complete Check-Out & Generate Diff
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* No-Show Marking Dialog */}
      <Dialog open={isNoShowOpen} onOpenChange={setIsNoShowOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <UserX className="w-5 h-5" />
              <span>Mark Student as No-Show</span>
            </DialogTitle>
            <DialogDescription>
              If a student failed to check in by the deadline, marking no-show vacates the bed and
              automatically triggers waitlist promotion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Pass / Letter Number
              </label>
              <Input
                placeholder="e.g. AL-2026-NIT-002"
                value={noShowCode}
                onChange={(e) => setNoShowCode(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                No-Show Justification / Reason
              </label>
              <Input
                placeholder="e.g. Unresponsive past 48-hour move-in deadline"
                value={noShowReason}
                onChange={(e) => setNoShowReason(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNoShowOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkNoShow}
              disabled={isSubmitting || !noShowCode.trim() || !noShowReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirm No-Show & Vacate Bed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
