import * as Sentry from "@sentry/node";

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
]);

function scrubWorkerPii<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    let scrubbed = obj.replace(
      /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g,
      "[REDACTED_EMAIL]",
    );
    scrubbed = scrubbed.replace(/(\+91[\-\s]?)?[6-9]\d{9}/g, "[REDACTED_PHONE]");
    scrubbed = scrubbed.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED_TOKEN]");
    return scrubbed as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => scrubWorkerPii(item)) as unknown as T;
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (PII_KEYS.has(key.toLowerCase())) {
        result[key] = "[REDACTED_PII]";
      } else {
        result[key] = scrubWorkerPii(value);
      }
    }
    return result as T;
  }

  return obj;
}

export function initWorkerSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    release: process.env.SENTRY_RELEASE ?? process.env.GIT_COMMIT_SHA ?? "1.0.0",
    environment: process.env.NODE_ENV ?? "production",
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.extra) {
        event.extra = scrubWorkerPii(event.extra);
      }
      if (event.breadcrumbs) {
        for (const b of event.breadcrumbs) {
          if (b.data) b.data = scrubWorkerPii(b.data);
          if (b.message) b.message = scrubWorkerPii(b.message);
        }
      }
      return event;
    },
  });
}
