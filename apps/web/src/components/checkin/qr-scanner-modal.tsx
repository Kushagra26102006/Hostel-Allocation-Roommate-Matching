"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Camera, QrCode, Keyboard, AlertCircle, Zap } from "lucide-react";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedText: string) => void;
}

export function QRScannerModal({ isOpen, onClose, onScanSuccess }: QRScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Stop video stream and scanning loop
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    trackRef.current = null;
    setIsScanning(false);
  };

  // Start camera stream and barcode detector
  useEffect(() => {
    if (!isOpen || activeTab !== "camera") {
      stopCamera();
      return;
    }

    let isMounted = true;
    setCameraError(null);
    setIsScanning(true);

    async function initCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API is not supported in this browser. Please use manual entry.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          trackRef.current = videoTrack;
          // Check torch capability
          try {
            const capabilities = videoTrack.getCapabilities?.() as unknown as { torch?: boolean };
            if (capabilities?.torch) {
              setHasTorch(true);
            }
          } catch {}
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Start scanning frames if BarcodeDetector is available
        if ("BarcodeDetector" in window) {
          const BarcodeDetectorCtor = (
            window as unknown as {
              BarcodeDetector: new (opts: { formats: string[] }) => {
                detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
              };
            }
          ).BarcodeDetector;
          const barcodeDetector = new BarcodeDetectorCtor({
            formats: ["qr_code"],
          });

          const scanFrame = async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) {
              animationFrameRef.current = requestAnimationFrame(scanFrame);
              return;
            }

            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              const firstBarcode = barcodes?.[0];
              if (firstBarcode?.rawValue) {
                // Success! Play beep / vibrate
                try {
                  navigator.vibrate?.(100);
                } catch {}
                stopCamera();
                onScanSuccess(firstBarcode.rawValue);
                return;
              }
            } catch {}

            animationFrameRef.current = requestAnimationFrame(scanFrame);
          };

          animationFrameRef.current = requestAnimationFrame(scanFrame);
        } else {
          // Fallback notice
          setCameraError(
            "Live camera barcode detection is not supported in this browser. Please use manual letter code entry below.",
          );
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Unable to access camera.";
        setCameraError(msg);
        setIsScanning(false);
      }
    }

    void initCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const toggleTorch = async () => {
    if (trackRef.current && hasTorch) {
      try {
        const nextState = !torchOn;
        await trackRef.current.applyConstraints({
          advanced: [{ torch: nextState } as unknown as MediaTrackConstraintSet],
        });
        setTorchOn(nextState);
      } catch {}
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    stopCamera();
    onScanSuccess(manualCode.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-sky-500" />
            <span>Scan Student Gate Pass</span>
          </DialogTitle>
          <DialogDescription>
            Scan the QR code on the student's allocation letter or enter the letter reference code.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "camera" | "manual")}
          className="mt-4"
        >
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="camera" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span>Camera Scanner</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Keyboard className="w-4 h-4" />
              <span>Manual Entry</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="mt-4 space-y-3">
            <div className="relative aspect-square w-full rounded-2xl bg-black overflow-hidden flex items-center justify-center">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />

              {/* Viewfinder Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {isScanning && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
                    Scanning active
                  </div>
                )}
                <div className="w-48 h-48 border-2 border-dashed border-sky-400 rounded-2xl relative animate-pulse shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                  {/* Corner notches */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-sky-500 rounded-tl" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-sky-500 rounded-tr" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-sky-500 rounded-bl" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-sky-500 rounded-br" />
                </div>
              </div>

              {/* Torch Button if available */}
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`absolute top-4 right-4 p-2.5 rounded-full transition-colors ${
                    torchOn ? "bg-amber-400 text-black" : "bg-black/60 text-white hover:bg-black/80"
                  }`}
                  aria-label="Toggle Flashlight"
                >
                  <Zap className="w-4 h-4" />
                </button>
              )}
            </div>

            {cameraError && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Scanner Notice</p>
                  <p>{cameraError}</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Letter Code / Verification Token
                </label>
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. AL-2026-NIT-001 or JWT Token"
                  className="font-mono text-sm"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Found printed at the bottom right of the student's physical or digital allocation
                  letter.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!manualCode.trim()}>
                  Verify Pass
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
