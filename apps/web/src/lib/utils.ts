import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge Tailwind classes with conflict resolution.
 * Standard shadcn/ui helper — used in every component.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
