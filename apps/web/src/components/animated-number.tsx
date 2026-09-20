"use client";

import * as React from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { useMotionPreference } from "@/hooks/use-motion-preference";

interface AnimatedNumberProps {
  /** Starting value */
  from?: number;
  /** Ending value */
  to: number;
  /** Duration in milliseconds (approximate) */
  duration?: number;
  /** Format the displayed number. Defaults to toLocaleString() */
  format?: (value: number) => string;
  className?: string;
}

/**
 * AnimatedNumber — counts up from `from` to `to` using framer-motion's useSpring.
 * Falls back to instant display when reduced motion is preferred.
 */
export function AnimatedNumber({
  from = 0,
  to,
  duration: _duration = 1200,
  format = (v) => Math.round(v).toLocaleString(),
  className,
}: AnimatedNumberProps) {
  const { prefersReducedMotion } = useMotionPreference();

  const springValue = useSpring(from, {
    stiffness: 60,
    damping: 20,
    mass: 0.8,
  });

  React.useEffect(() => {
    if (!prefersReducedMotion) {
      springValue.set(to);
    }
  }, [to, prefersReducedMotion]);

  const displayValue = useTransform(springValue, (v) => format(v));

  if (prefersReducedMotion) {
    return <span className={className}>{format(to)}</span>;
  }

  return (
    <motion.span className={className}>{displayValue}</motion.span>
  );
}
