import { describe, it, expect } from "vitest";
import { Writable } from "node:stream";
import { createLogger } from "@hostelhub/shared";

describe("Logging Safety Test (PII & Secrets Leak Prevention)", () => {
  it("redacts email, phone, token, password, and questionnaire answers across platform flows", async () => {
    const logChunks: string[] = [];

    const captureStream = new Writable({
      write(chunk: Buffer | string, _encoding, callback) {
        logChunks.push(chunk.toString());
        callback();
      },
    });

    // Instantiate shared logger configured with capture destination stream
    const testLogger = createLogger("security-audit-logger", {
      level: "debug",
      destination: captureStream,
    });

    const sensitiveData = {
      rawPassword: "SuperSecretPassword123!",
      rawToken: "jwt.header.payload-secret-token-xyz999",
      rawEmail: "student.ananya.sharma@campus.edu",
      rawPhone: "+919876543210",
      rawAnswer1: "strictly_vegetarian_only",
      rawAnswer2: "night_owl_study_schedule",
    };

    // 1. Simulate Login & Authentication Flow Logging
    testLogger.info(
      {
        event: "auth.login.attempt",
        email: sensitiveData.rawEmail,
        password: sensitiveData.rawPassword,
        headers: {
          authorization: `Bearer ${sensitiveData.rawToken}`,
        },
      },
      "User authentication attempt processed",
    );

    // 2. Simulate Token Generation & Session Issuance Flow Logging
    testLogger.info(
      {
        event: "session.issued",
        userId: "usr_student_12345",
        token: sensitiveData.rawToken,
        secret: "session_hmac_secret_key_888",
      },
      "Session created for authenticated user",
    );

    // 3. Simulate Student Application Submission Flow Logging
    testLogger.info(
      {
        event: "application.submitted",
        applicationId: "app_67890",
        profile: {
          fullName: "Ananya Sharma",
          email: sensitiveData.rawEmail,
          phone: sensitiveData.rawPhone,
          city: "New Delhi",
        },
      },
      "Student housing application submitted",
    );

    // 4. Simulate Roommate Compatibility Questionnaire Flow Logging
    testLogger.info(
      {
        event: "questionnaire.saved",
        studentId: "usr_student_12345",
        questionnaire: {
          answers: {
            diet: sensitiveData.rawAnswer1,
            habits: sensitiveData.rawAnswer2,
          },
        },
        responses: [sensitiveData.rawAnswer1, sensitiveData.rawAnswer2],
      },
      "Student compatibility responses stored",
    );

    const fullLogOutput = logChunks.join("\n");

    // ── ASSERTIONS ─────────────────────────────────────────────────────────────
    // 1. None of the raw sensitive values must ever appear in the output stream
    expect(fullLogOutput).not.toContain(sensitiveData.rawPassword);
    expect(fullLogOutput).not.toContain(sensitiveData.rawToken);
    expect(fullLogOutput).not.toContain(sensitiveData.rawEmail);
    expect(fullLogOutput).not.toContain(sensitiveData.rawPhone);
    expect(fullLogOutput).not.toContain(sensitiveData.rawAnswer1);
    expect(fullLogOutput).not.toContain(sensitiveData.rawAnswer2);

    // 2. The censor string [REDACTED] must be applied in their place
    expect(fullLogOutput).toContain("[REDACTED]");

    // 3. Non-sensitive contextual metadata must remain intact for debugging
    expect(fullLogOutput).toContain("auth.login.attempt");
    expect(fullLogOutput).toContain("session.issued");
    expect(fullLogOutput).toContain("application.submitted");
    expect(fullLogOutput).toContain("questionnaire.saved");
    expect(fullLogOutput).toContain("Ananya Sharma");
    expect(fullLogOutput).toContain("New Delhi");
  });
});
