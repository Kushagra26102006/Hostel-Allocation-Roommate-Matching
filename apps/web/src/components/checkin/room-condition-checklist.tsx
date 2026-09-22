"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Camera,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ChecklistCondition, ChecklistItemRecord } from "@hostelhub/domain";

interface RoomConditionChecklistProps {
  items: ChecklistItemRecord[];
  onChange: (items: ChecklistItemRecord[]) => void;
  readOnly?: boolean;
  title?: string;
  description?: string;
}

const CONDITION_CONFIG: Record<
  ChecklistCondition,
  {
    label: string;
    color: string;
    activeClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  good: {
    label: "Good",
    color: "text-emerald-500",
    activeClass: "bg-emerald-500 text-white border-emerald-600 shadow-sm",
    icon: CheckCircle2,
  },
  fair: {
    label: "Fair",
    color: "text-sky-500",
    activeClass: "bg-sky-500 text-white border-sky-600 shadow-sm",
    icon: HelpCircle,
  },
  damaged: {
    label: "Damaged",
    color: "text-amber-500",
    activeClass: "bg-amber-500 text-white border-amber-600 shadow-sm",
    icon: AlertTriangle,
  },
  missing: {
    label: "Missing",
    color: "text-rose-500",
    activeClass: "bg-rose-500 text-white border-rose-600 shadow-sm",
    icon: XCircle,
  },
};

export function RoomConditionChecklist({
  items,
  onChange,
  readOnly = false,
  title = "Room Condition Inspection Checklist",
  description = "Verify each inventory item and record damages or missing items with photos.",
}: RoomConditionChecklistProps) {
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

  const updateCondition = (itemId: string, condition: ChecklistCondition) => {
    if (readOnly) return;
    const updated = items.map((item) => (item.itemId === itemId ? { ...item, condition } : item));
    onChange(updated);
  };

  const updateNotes = (itemId: string, notes: string) => {
    if (readOnly) return;
    const updated = items.map((item) => (item.itemId === itemId ? { ...item, notes } : item));
    onChange(updated);
  };

  const handlePhotoUpload = async (itemId: string, file: File) => {
    if (readOnly) return;
    try {
      setUploadingItemId(itemId);

      // 1. Presign upload via /api/v1/documents/presign
      const presignRes = await fetch("/api/v1/documents/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mime_type: file.type || "image/jpeg",
          size_bytes: file.size,
        }),
      });

      if (!presignRes.ok) {
        throw new Error("Failed to get presigned upload URL");
      }

      const { presigned_url, storage_key } = await presignRes.json();

      // 2. Upload file directly to S3/MinIO
      const uploadRes = await fetch(presigned_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload photo to storage");
      }

      // 3. Update item with storage key and local object preview url
      const previewUrl = URL.createObjectURL(file);
      const updated = items.map((item) =>
        item.itemId === itemId
          ? {
              ...item,
              photoS3Key: storage_key,
              photoUrl: previewUrl,
            }
          : item,
      );
      onChange(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error uploading photo");
    } finally {
      setUploadingItemId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md overflow-hidden">
        {items.map((item) => {
          const isUploading = uploadingItemId === item.itemId;
          const currentConfig = CONDITION_CONFIG[item.condition];
          const Icon = currentConfig.icon;

          return (
            <div
              key={item.itemId}
              className="p-4 space-y-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {item.label}
                    </span>
                    <Badge variant="outline" className="capitalize text-[10px] font-mono py-0">
                      {item.category}
                    </Badge>
                  </div>
                </div>

                {/* Condition Pills */}
                {readOnly ? (
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentConfig.activeClass}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {currentConfig.label}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {(Object.keys(CONDITION_CONFIG) as ChecklistCondition[]).map((cond) => {
                      const cfg = CONDITION_CONFIG[cond];
                      const CondIcon = cfg.icon;
                      const isActive = item.condition === cond;

                      return (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => updateCondition(item.itemId, cond)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? cfg.activeClass
                              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          <CondIcon className="w-3 h-3" />
                          <span>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notes & Photo Attachment Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="md:col-span-2">
                  {readOnly ? (
                    item.notes ? (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-400">Notes:</span> {item.notes}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No notes recorded.</p>
                    )
                  ) : (
                    <Input
                      placeholder="Add inspection notes or condition details..."
                      value={item.notes ?? ""}
                      onChange={(e) => updateNotes(item.itemId, e.target.value)}
                      className="text-xs h-9 bg-white dark:bg-slate-950"
                    />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {item.photoUrl ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={item.photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:underline"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>View Photo</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                      {!readOnly && (
                        <label className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer underline">
                          Replace
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handlePhotoUpload(item.itemId, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  ) : !readOnly ? (
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                      {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
                      ) : (
                        <Camera className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>{isUploading ? "Uploading..." : "Attach Photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploading}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handlePhotoUpload(item.itemId, file);
                        }}
                      />
                    </label>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No photo attached</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
