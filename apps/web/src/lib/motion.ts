import type { Variants } from "framer-motion";

/**
 * Motion constants — TypeScript mirror of the CSS custom property motion tokens.
 * Import from here instead of writing magic numbers in components.
 */

/** Duration presets in milliseconds */
export const duration = {
  instant: 100,
  fast: 180,
  normal: 240,
  slow: 380,
  crawl: 700,
} as const;

export type Duration = keyof typeof duration;

/** Cubic-bezier easing presets (compatible with framer-motion `ease` prop) */
export const easing = {
  standard: [0.2, 0, 0, 1] as const,
  emphasized: [0.05, 0.7, 0.1, 1] as const,
  smooth: [0.16, 1, 0.3, 1] as const,
  linear: [0, 0, 1, 1] as const,
} as const;

export type Easing = keyof typeof easing;

/** Spring physics presets for framer-motion */
export const spring = {
  stiffness: 180,
  damping: 24,
  /** General-purpose spring */
  default: { type: "spring" as const, stiffness: 180, damping: 24 },
  /** Bouncy spring for micro-interactions */
  bouncy: { type: "spring" as const, stiffness: 320, damping: 22 },
  /** Gentle spring for larger panels */
  gentle: { type: "spring" as const, stiffness: 100, damping: 20 },
} as const;

/** Stagger delay between child animations (seconds and milliseconds) */
export const staggerDelay = 0.05;
export const stagger = 50;

/** Standard Framer Motion Animation Variants */
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.24, ease: easing.smooth },
  },
  exit: { opacity: 0, transition: { duration: 0.16 } },
};

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: easing.smooth },
  },
  exit: { opacity: 0, y: 8, transition: { duration: 0.18 } },
};

export const fadeScaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.22, ease: easing.smooth },
  },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.16 } },
};

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

export const drawerVariants: Variants = {
  hidden: { x: "100%", opacity: 0.6 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", damping: 28, stiffness: 260 },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: { duration: 0.2, ease: easing.standard },
  },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.22, ease: easing.smooth },
  },
  exit: { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.15 } },
};

export const cardHoverTransition = {
  y: -2,
  transition: { duration: 0.18, ease: easing.smooth },
};

export const buttonPressAnimation = {
  scale: 0.97,
  transition: { duration: 0.12, ease: easing.standard },
};

/**
 * CSS variable names — use with `var(--duration-*)` in CSS
 */
export const cssVars = {
  duration100: "--duration-100",
  duration180: "--duration-180",
  duration240: "--duration-240",
  duration380: "--duration-380",
  duration700: "--duration-700",
  easeStandard: "--ease-standard",
  easeEmphasized: "--ease-emphasized",
} as const;
