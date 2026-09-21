import type { ErrorEvent } from "@sentry/nextjs";

const PII_KEYS = new Set([
  "email",
  "phone",
  "phonenumber",
  "mobile",
  "password",
  "token",
  "accesstoken",
  "secret",
  "authorization",
  "cookie",
  "questionnaire",
  "answers",
  "responses",
  "guardian_email",
  "emergency_contact",
]);

/**
 * Deeply scrubs PII and secret values from an object or array.
 */
export function scrubPii<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    // Redact emails
    let scrubbed = obj.replace(
      /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g,
      "[REDACTED_EMAIL]",
    );
    // Redact phone numbers (10 digits with optional country code)
    scrubbed = scrubbed.replace(/(\+91[\-\s]?)?[6-9]\d{9}/g, "[REDACTED_PHONE]");
    // Redact bearer tokens
    scrubbed = scrubbed.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED_TOKEN]");
    return scrubbed as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => scrubPii(item)) as unknown as T;
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (PII_KEYS.has(lowerKey)) {
        result[key] = "[REDACTED_PII]";
      } else {
        result[key] = scrubPii(value);
      }
    }
    return result as T;
  }

  return obj;
}

/**
 * Sentry beforeSend hook ensuring no personal data leaves the infrastructure.
 */
export function sentryBeforeSend(event: ErrorEvent): ErrorEvent | null {
  if (event.request) {
    if (event.request.cookies) {
      event.request.cookies = {};
    }
    if (event.request.headers) {
      const headers = { ...event.request.headers };
      delete headers["authorization"];
      delete headers["cookie"];
      delete headers["x-auth-token"];
      event.request.headers = headers;
    }
    if (event.request.data) {
      event.request.data = scrubPii(event.request.data);
    }
  }

  if (event.user) {
    // Strip user identifiers except anonymized id
    event.user = {
      id: event.user.id ?? "anonymous",
    };
  }

  if (event.extra) {
    event.extra = scrubPii(event.extra);
  }

  if (event.breadcrumbs) {
    for (const b of event.breadcrumbs) {
      if (b.data) b.data = scrubPii(b.data);
      if (b.message) b.message = scrubPii(b.message);
    }
  }

  return event;
}
