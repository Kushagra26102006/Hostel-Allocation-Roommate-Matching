import { describe, it, expect } from "vitest";
import { scrubPii, sentryBeforeSend } from "../lib/observability/sentry-scrubber";
import type { ErrorEvent } from "@sentry/nextjs";

describe("Sentry Observability & PII Scrubber", () => {
  it("scrubs email addresses and phone numbers from strings", () => {
    const raw =
      "Contact student at rahul.sharma@nit.edu or +919876543210 regarding room allocation.";
    const scrubbed = scrubPii(raw);

    expect(scrubbed).not.toContain("rahul.sharma@nit.edu");
    expect(scrubbed).not.toContain("9876543210");
    expect(scrubbed).toContain("[REDACTED_EMAIL]");
    expect(scrubbed).toContain("[REDACTED_PHONE]");
  });

  it("scrubs sensitive dictionary keys (password, token, questionnaire, answers)", () => {
    const payload = {
      user_id: "usr_123",
      email: "test@example.com",
      password: "SuperSecretPassword123!",
      token: "secret-token-xyz",
      questionnaire: {
        sleep_schedule: "night_owl",
        smoking: false,
      },
      metadata: {
        guardian_email: "parent@example.com",
        normalField: "safe value",
      },
    };

    const scrubbed = scrubPii(payload) as Record<string, unknown>;

    expect(scrubbed.email).toBe("[REDACTED_PII]");
    expect(scrubbed.password).toBe("[REDACTED_PII]");
    expect(scrubbed.token).toBe("[REDACTED_PII]");
    expect(scrubbed.questionnaire).toBe("[REDACTED_PII]");
    const meta = scrubbed.metadata as Record<string, unknown>;
    expect(meta.guardian_email).toBe("[REDACTED_PII]");
    expect(meta.normalField).toBe("safe value");
  });

  it("scrubs headers and cookies in Sentry beforeSend hook", () => {
    const event: ErrorEvent = {
      type: undefined,
      request: {
        headers: {
          authorization: "Bearer secret-bearer-token",
          cookie: "session_token=xyz123",
          "x-custom": "safe-header",
        },
        cookies: {
          session_id: "token-123",
        },
        data: {
          email: "student@campus.edu",
        },
      },
      user: {
        id: "usr_999",
        email: "student@campus.edu",
        username: "student99",
      },
    };

    const result = sentryBeforeSend(event);
    expect(result).not.toBeNull();
    expect(result!.request!.headers).not.toHaveProperty("authorization");
    expect(result!.request!.headers).not.toHaveProperty("cookie");
    expect(result!.request!.cookies).toEqual({});
    expect(result!.request!.headers!["x-custom"]).toBe("safe-header");
    expect(result!.user).toEqual({ id: "usr_999" }); // Strips email/username
  });
});
