/**
 * Motion constants — TypeScript mirror of the CSS custom property motion tokens.
 * Import from here instead of writing magic numbers in components.
 */

/** Duration presets in milliseconds */
export const duration = {
  instant: 100,
  fast: 180,
  normal: 280,
  slow: 480,
  crawl: 800,
} as const;

export type Duration = keyof typeof duration;

/** Cubic-bezier easing presets (compatible with framer-motion `ease` prop) */
export const easing = {
  standard: [0.2, 0, 0, 1] as const,
  emphasized: [0.05, 0.7, 0.1, 1] as const,
  linear: [0, 0, 1, 1] as const,
} as const;

export type Easing = keyof typeof easing;

/** Spring physics presets for framer-motion */
export const spring = {
  stiffness: 170,
  damping: 22,
  /** General-purpose spring */
  default: { type: "spring" as const, stiffness: 170, damping: 22 },
  /** Bouncy spring for micro-interactions */
  bouncy: { type: "spring" as const, stiffness: 300, damping: 20 },
  /** Gentle spring for larger elements */
  gentle: { type: "spring" as const, stiffness: 80, damping: 20 },
} as const;

/** Stagger delay between child animations (ms) */
export const stagger = 50;

/**
 * CSS variable names — use with `var(--duration-*)` in CSS
 * or as reference when you need the variable name string.
 */
export const cssVars = {
  duration100: "--duration-100",
  duration180: "--duration-180",
  duration280: "--duration-280",
  duration480: "--duration-480",
  duration800: "--duration-800",
  easeStandard: "--ease-standard",
  easeEmphasized: "--ease-emphasized",
} as const;
