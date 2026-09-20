"use client";

import enMessages from "@/messages/en.json";
import hiMessages from "@/messages/hi.json";
import paMessages from "@/messages/pa.json";
import { useLocaleStore, type Locale } from "@/stores/locale-store";

export type Messages = typeof enMessages;

export const MESSAGES_BY_LOCALE: Record<Locale, Messages> = {
  en: enMessages,
  hi: hiMessages,
  pa: paMessages,
};

/**
 * Returns active message dictionary.
 * If used on server or outside hook, falls back to enMessages.
 */
export function getMessages(locale?: Locale): Messages {
  if (locale && MESSAGES_BY_LOCALE[locale]) {
    return MESSAGES_BY_LOCALE[locale];
  }
  return enMessages;
}

/**
 * Client React hook to get translated message dictionary based on active locale store.
 */
export function useMessages(): Messages {
  const locale = useLocaleStore((state) => state.locale);
  return MESSAGES_BY_LOCALE[locale] ?? enMessages;
}

export const messages = enMessages;
