"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMotionPreference } from "@/hooks/use-motion-preference";
import { cn } from "@/lib/utils";

interface GradientMeshProps {
  className?: string;
  /** Number of animated blobs. Defaults to 4. */
  blobCount?: number;
}

const BLOB_CONFIGS = [
  {
    size: "600px",
    color: "hsl(var(--brand-600) / 0.35)",
    initial: { x: "10%", y: "20%" },
    animate: { x: ["10%", "25%", "10%"], y: ["20%", "35%", "20%"] },
    duration: 14,
  },
  {
    size: "500px",
    color: "hsl(var(--accent) / 0.25)",
    initial: { x: "60%", y: "10%" },
    animate: { x: ["60%", "45%", "60%"], y: ["10%", "30%", "10%"] },
    duration: 18,
  },
  {
    size: "450px",
    color: "hsl(var(--info) / 0.20)",
    initial: { x: "20%", y: "60%" },
    animate: { x: ["20%", "40%", "20%"], y: ["60%", "45%", "60%"] },
    duration: 22,
  },
  {
    size: "400px",
    color: "hsl(var(--accent) / 0.18)",
    initial: { x: "70%", y: "55%" },
    animate: { x: ["70%", "55%", "70%"], y: ["55%", "70%", "55%"] },
    duration: 16,
  },
] as const;

/**
 * Animated gradient mesh background.
 * Position this absolutely behind page content.
 * Respects useMotionPreference — falls back to static gradient.
 */
export function GradientMesh({ className, blobCount = 4 }: GradientMeshProps) {
  const { prefersReducedMotion } = useMotionPreference();
  const blobs = BLOB_CONFIGS.slice(0, blobCount);

  if (prefersReducedMotion) {
    return (
      <div
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
        style={{
          background:
            "radial-gradient(ellipse at 20% 30%, hsl(var(--brand-600)/0.3) 0%, transparent 60%), " +
            "radial-gradient(ellipse at 70% 60%, hsl(var(--accent)/0.2) 0%, transparent 60%)",
        }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div className="absolute inset-0" style={{ filter: "blur(80px)" }}>
        <AnimatePresence>
          {blobs.map((blob, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: blob.size,
                height: blob.size,
                background: blob.color,
                x: blob.initial.x,
                y: blob.initial.y,
                translateX: "-50%",
                translateY: "-50%",
              }}
              animate={{ x: [...blob.animate.x], y: [...blob.animate.y] }}
              transition={{
                duration: blob.duration,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
              }}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
