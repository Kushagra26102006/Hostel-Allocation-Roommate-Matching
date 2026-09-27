"use client";

import * as React from "react";
import { UploadCloud, File, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface FileUploaderProps {
  label?: string;
  accept?: string;
  maxSizeMB?: number;
  onFileSelect?: (file: File) => void;
  className?: string;
}

export function FileUploader({
  label = "Upload verification document (PDF, PNG, JPG up to 5MB)",
  accept = ".pdf,.png,.jpg,.jpeg",
  maxSizeMB = 5,
  onFileSelect,
  className,
}: FileUploaderProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (selected.size > maxSizeMB * 1024 * 1024) return;
      setFile(selected);
      onFileSelect?.(selected);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > maxSizeMB * 1024 * 1024) return;
      setFile(selected);
      onFileSelect?.(selected);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {!file ? (
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200",
            isDragging
              ? "border-brand-500 bg-brand-50/50 dark:bg-brand-900/20"
              : "border-border/80 hover:border-brand-500/60 hover:bg-surface-muted/50",
          )}
        >
          <input type="file" accept={accept} onChange={handleChange} className="sr-only" />
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-foreground">
              Click to upload or drag & drop
            </span>
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </div>
        </label>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-border/80 bg-surface p-3 shadow-sm">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <File className="h-4 w-4" />
            </div>
            <div className="flex flex-col overflow-hidden text-left">
              <span className="truncate text-xs font-semibold text-foreground">{file.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setFile(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
