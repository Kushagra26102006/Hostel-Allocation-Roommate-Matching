/**
 * Locale-aware formatters for numbers, currencies, dates, and relative times.
 * Supports English (en-IN), Hindi (hi-IN), and Punjabi (pa-IN).
 */

import type { Locale } from "@/stores/locale-store";

const BCP47_LOCALES: Record<Locale, string> = {
  en: "en-IN",
  hi: "hi-IN",
  pa: "pa-IN",
};

/**
 * Format date according to active locale
 */
export function formatDate(
  date: Date | string | number,
  locale: Locale = "en",
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  };

  const bcp47 = BCP47_LOCALES[locale] || "en-IN";
  return new Intl.DateTimeFormat(bcp47, defaultOptions).format(d);
}

/**
 * Format date with time according to active locale
 */
export function formatDateTime(date: Date | string | number, locale: Locale = "en"): string {
  return formatDate(date, locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format Indian Rupee currency according to active locale
 */
export function formatCurrency(amount: number, locale: Locale = "en"): string {
  const bcp47 = BCP47_LOCALES[locale] || "en-IN";
  return new Intl.NumberFormat(bcp47, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format numbers with locale groupings
 */
export function formatNumber(
  num: number,
  locale: Locale = "en",
  options?: Intl.NumberFormatOptions,
): string {
  const bcp47 = BCP47_LOCALES[locale] || "en-IN";
  return new Intl.NumberFormat(bcp47, options).format(num);
}

/**
 * Format percentages according to locale
 */
export function formatPercent(
  val: number, // e.g. 0.85
  locale: Locale = "en",
): string {
  const bcp47 = BCP47_LOCALES[locale] || "en-IN";
  return new Intl.NumberFormat(bcp47, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(val);
}
