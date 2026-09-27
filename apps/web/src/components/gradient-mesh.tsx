"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useMotionPreference } from "@/hooks/use-motion-preference";
import { cn } from "@/lib/utils";

interface GradientMeshProps {
  className?: string | undefined;
  blobCount?: number | undefined;
}

interface BlobConfig {
  size: string;
  color: string;
  initial: { x: string; y: string };
  animate: { x: string[]; y: string[] };
  duration: number;
}

const BLOB_CONFIGS: BlobConfig[] = [
  {
    size: "600px",
    color: "hsl(var(--brand-500) / 0.07)",
    initial: { x: "10%", y: "15%" },
    animate: { x: ["10%", "20%", "10%"], y: ["15%", "25%", "15%"] },
    duration: 18,
  },
  {
    size: "500px",
    color: "hsl(var(--brand-600) / 0.05)",
    initial: { x: "65%", y: "10%" },
    animate: { x: ["65%", "55%", "65%"], y: ["10%", "20%", "10%"] },
    duration: 22,
  },
  {
    size: "450px",
    color: "hsl(var(--brand-400) / 0.04)",
    initial: { x: "30%", y: "60%" },
    animate: { x: ["30%", "40%", "30%"], y: ["60%", "50%", "60%"] },
    duration: 25,
  },
];

/**
 * Restrained subtle electric indigo backdrop.
 * Creates depth without rainbow saturation.
 * Respects prefers-reduced-motion.
 */
export function GradientMesh({ className, blobCount = 3 }: GradientMeshProps) {
  const { prefersReducedMotion } = useMotionPreference();
  const blobs = BLOB_CONFIGS.slice(0, blobCount);

  if (prefersReducedMotion) {
    return (
      <div
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--brand-500) / 0.06), transparent 70%)",
        }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          initial={blob.initial}
          animate={blob.animate}
          transition={{
            duration: blob.duration,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
          className="absolute rounded-full blur-[100px] will-change-transform"
          style={{
            width: blob.size,
            height: blob.size,
            background: blob.color,
          }}
        />
      ))}
    </div>
  );
}
