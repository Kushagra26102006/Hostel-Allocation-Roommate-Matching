import * as Sentry from "@sentry/nextjs";
import { sentryBeforeSend } from "./src/lib/observability/sentry-scrubber";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  release:
    process.env.SENTRY_RELEASE ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.npm_package_version ??
    "1.0.0",
  environment: process.env.NODE_ENV ?? "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  beforeSend: sentryBeforeSend,
  sendDefaultPii: false,
});
