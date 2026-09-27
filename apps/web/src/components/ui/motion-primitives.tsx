"use client";

import * as React from "react";
import { motion, AnimatePresence, type MotionStyle } from "framer-motion";
import { useMotionPreference } from "@/hooks/use-motion-preference";
import {
  fadeInVariants,
  fadeUpVariants,
  fadeScaleVariants,
  staggerContainerVariants,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface MotionWrapperProps {
  children: React.ReactNode;
  className?: string | undefined;
  delay?: number | undefined;
  duration?: number | undefined;
  id?: string | undefined;
  style?: MotionStyle | undefined;
}

export function FadeIn({ children, className, delay = 0, id, style }: MotionWrapperProps) {
  const { prefersReducedMotion } = useMotionPreference();

  if (prefersReducedMotion) {
    return (
      <div className={className} id={id} style={style as React.CSSProperties}>
        {children}
      </div>
    );
  }

  const motionProps: Record<string, unknown> = {
    initial: "hidden",
    animate: "visible",
    exit: "exit",
    variants: fadeInVariants,
    transition: { delay },
    className,
  };
  if (id) motionProps["id"] = id;
  if (style) motionProps["style"] = style;

  return <motion.div {...motionProps}>{children}</motion.div>;
}

export function FadeUp({ children, className, delay = 0, id, style }: MotionWrapperProps) {
  const { prefersReducedMotion } = useMotionPreference();

  if (prefersReducedMotion) {
    return (
      <div className={className} id={id} style={style as React.CSSProperties}>
        {children}
      </div>
    );
  }

  const motionProps: Record<string, unknown> = {
    initial: "hidden",
    animate: "visible",
    exit: "exit",
    variants: fadeUpVariants,
    transition: { delay },
    className,
  };
  if (id) motionProps["id"] = id;
  if (style) motionProps["style"] = style;

  return <motion.div {...motionProps}>{children}</motion.div>;
}

export function FadeScale({ children, className, delay = 0, id, style }: MotionWrapperProps) {
  const { prefersReducedMotion } = useMotionPreference();

  if (prefersReducedMotion) {
    return (
      <div className={className} id={id} style={style as React.CSSProperties}>
        {children}
      </div>
    );
  }

  const motionProps: Record<string, unknown> = {
    initial: "hidden",
    animate: "visible",
    exit: "exit",
    variants: fadeScaleVariants,
    transition: { delay },
    className,
  };
  if (id) motionProps["id"] = id;
  if (style) motionProps["style"] = style;

  return <motion.div {...motionProps}>{children}</motion.div>;
}

export function StaggerContainer({ children, className, id, style }: MotionWrapperProps) {
  const { prefersReducedMotion } = useMotionPreference();

  if (prefersReducedMotion) {
    return (
      <div className={className} id={id} style={style as React.CSSProperties}>
        {children}
      </div>
    );
  }

  const motionProps: Record<string, unknown> = {
    initial: "hidden",
    animate: "visible",
    variants: staggerContainerVariants,
    className,
  };
  if (id) motionProps["id"] = id;
  if (style) motionProps["style"] = style;

  return <motion.div {...motionProps}>{children}</motion.div>;
}

export interface MotionCardProps {
  children: React.ReactNode;
  className?: string | undefined;
  hover?: boolean | undefined;
  onClick?: (() => void) | undefined;
  id?: string | undefined;
  style?: MotionStyle | undefined;
}

export function MotionCard({
  children,
  className,
  hover = true,
  onClick,
  id,
  style,
}: MotionCardProps) {
  const { prefersReducedMotion } = useMotionPreference();

  if (prefersReducedMotion) {
    return (
      <div
        id={id}
        style={style as React.CSSProperties}
        className={cn(
          "rounded-card border border-border/70 bg-surface p-6 shadow-sm transition-colors",
          className,
        )}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  const motionProps: Record<string, unknown> = {
    className: cn(
      "rounded-card border border-border/70 bg-surface p-6 shadow-sm transition-all duration-200 hover:border-brand-500/30 hover:shadow-md",
      className,
    ),
    onClick,
  };
  if (hover) {
    motionProps["whileHover"] = { y: -2, transition: { duration: 0.18, ease: "easeOut" } };
    motionProps["whileTap"] = { scale: 0.99 };
  }
  if (id) motionProps["id"] = id;
  if (style) motionProps["style"] = style;

  return <motion.div {...motionProps}>{children}</motion.div>;
}

export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string | undefined;
}) {
  const { prefersReducedMotion } = useMotionPreference();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.22 }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function HoverScale({
  children,
  className,
  scale = 1.02,
}: {
  children: React.ReactNode;
  className?: string | undefined;
  scale?: number | undefined;
}) {
  const { prefersReducedMotion } = useMotionPreference();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      whileHover={{ scale }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
