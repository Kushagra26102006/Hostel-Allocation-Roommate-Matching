import { describe, it, expect } from "vitest";
import { RedactionService } from "@/lib/assistant/redaction";
import { AssistantGuardrails } from "@/lib/assistant/guardrails";

/**
 * Module E15: Privacy & Redaction Layer Tests
 *
 * These tests ensure that DPDP Act 2023 privacy obligations are enforced:
 * - Questionnaire answers, identity documents, fee/financial data, and
 *   third-party student data are NEVER sent to any external LLM.
 * - The assertPayloadPrivacy gate THROWS on any violation, causing the
 *   request to fail-safe rather than leak sensitive data.
 */
describe("E15 Privacy: Redaction Service & Outgoing Payload Privacy Gate", () => {
  // ─── 1. Aadhaar Number Redaction ──────────────────────────────────────────
  describe("Aadhaar Number Redaction", () => {
    const aadhaarVariants = [
      "My Aadhaar is 1234 5678 9012",
      "Aadhaar: 1234-5678-9012",
      "ID number 123456789012 for verification",
    ];

    it("redacts all Aadhaar number formats", () => {
      for (const input of aadhaarVariants) {
        const result = RedactionService.redact(input);
        expect(result.sanitized).toContain("[REDACTED_AADHAAR]");
        expect(result.redactionTypes).toContain("Aadhaar");
        expect(result.redactedCount).toBeGreaterThanOrEqual(1);
      }
    });

    it("assertPayloadPrivacy throws on unredacted Aadhaar numbers", () => {
      expect(() =>
        RedactionService.assertPayloadPrivacy("Student Aadhaar: 1234 5678 9012"),
      ).toThrow("Privacy Violation");
    });
  });

  // ─── 2. PAN Card Number Redaction ─────────────────────────────────────────
  describe("PAN Card Number Redaction", () => {
    it("redacts valid PAN numbers", () => {
      const result = RedactionService.redact("My PAN is ABCDE1234F");
      expect(result.sanitized).toContain("[REDACTED_PAN]");
      expect(result.redactionTypes).toContain("PAN");
    });

    it("assertPayloadPrivacy throws on unredacted PAN", () => {
      expect(() => RedactionService.assertPayloadPrivacy("PAN card: BNZPM2501F")).toThrow(
        "Privacy Violation",
      );
    });
  });

  // ─── 3. Credit Card / Financial Data Redaction ────────────────────────────
  describe("Financial Card Redaction", () => {
    it("redacts Visa card numbers", () => {
      const result = RedactionService.redact("Pay with card 4111111111111111");
      expect(result.sanitized).toContain("[REDACTED_FINANCIAL_CARD]");
      expect(result.redactionTypes).toContain("CreditCard");
    });

    it("redacts Mastercard numbers", () => {
      const result = RedactionService.redact("Card: 5500000000000004");
      expect(result.sanitized).toContain("[REDACTED_FINANCIAL_CARD]");
    });

    it("assertPayloadPrivacy throws on unredacted card numbers", () => {
      expect(() => RedactionService.assertPayloadPrivacy("Paying with 4111111111111111")).toThrow(
        "Privacy Violation",
      );
    });
  });

  // ─── 4. Bank Account & IFSC Redaction ─────────────────────────────────────
  describe("Bank Account & IFSC Redaction", () => {
    it("redacts bank account numbers", () => {
      const result = RedactionService.redact("My account: 123456789012345");
      expect(result.sanitized).toContain("[REDACTED_BANK_ACCOUNT]");
    });

    it("redacts IFSC codes", () => {
      const result = RedactionService.redact("IFSC: SBIN0001234");
      expect(result.sanitized).toContain("[REDACTED_IFSC]");
    });

    it("assertPayloadPrivacy throws on unredacted bank info", () => {
      expect(() =>
        RedactionService.assertPayloadPrivacy("Transfer to acc: 123456789012345"),
      ).toThrow("Privacy Violation");
    });
  });

  // ─── 5. Lifestyle Questionnaire Response Redaction ────────────────────────
  describe("Questionnaire Response Redaction", () => {
    const questionnaireInputs = [
      "sleeping hours: 11pm to 7am",
      "smoking: yes, heavy smoker",
      "cleanliness: very tidy, clean daily",
      "study routine: 6am-10am focused",
      "dietary: vegetarian, no eggs",
      "substance use: occasional alcohol",
    ];

    it("redacts all questionnaire response patterns", () => {
      for (const input of questionnaireInputs) {
        const result = RedactionService.redact(input);
        expect(result.sanitized, `Questionnaire not redacted: "${input}"`).toContain(
          "[REDACTED_QUESTIONNAIRE_RESPONSE]",
        );
        expect(result.redactionTypes).toContain("QuestionnaireResponse");
      }
    });

    it("assertPayloadPrivacy throws on raw questionnaire data in payload", () => {
      expect(() =>
        RedactionService.assertPayloadPrivacy(
          "User preferences: smoking: heavy, cleanliness: messy",
        ),
      ).toThrow("Privacy Violation");
    });
  });

  // ─── 6. Third-Party Email Address Redaction ───────────────────────────────
  describe("Third-Party Email Redaction", () => {
    it("redacts emails that do not belong to the authenticated user", () => {
      const result = RedactionService.redact("Contact rahul@nit.edu for details", "myself@nit.edu");
      expect(result.sanitized).toContain("[REDACTED_EMAIL]");
      expect(result.redactionTypes).toContain("ThirdPartyEmail");
    });

    it("preserves the authenticated user's own email", () => {
      const result = RedactionService.redact(
        "My email is myself@nit.edu and cc rahul@nit.edu",
        "myself@nit.edu",
      );
      expect(result.sanitized).toContain("myself@nit.edu");
      expect(result.sanitized).not.toContain("rahul@nit.edu");
    });

    it("assertPayloadPrivacy throws on foreign emails", () => {
      expect(() =>
        RedactionService.assertPayloadPrivacy("Send copy to priya@nit.edu", "student@nit.edu"),
      ).toThrow("Privacy Violation");
    });
  });

  // ─── 7. Combined Multi-Type Redaction ─────────────────────────────────────
  describe("Combined Multi-Type Redaction in Single Input", () => {
    it("redacts multiple sensitive data types simultaneously", () => {
      const poisonedInput = [
        "My Aadhaar is 1234 5678 9012,",
        "PAN is ABCDE1234F,",
        "account: 123456789012345,",
        "smoking: chain smoker,",
        "contact priya@nit.edu for my fee receipt.",
      ].join(" ");

      const result = RedactionService.redact(poisonedInput, "me@nit.edu");

      expect(result.sanitized).toContain("[REDACTED_AADHAAR]");
      expect(result.sanitized).toContain("[REDACTED_PAN]");
      expect(result.sanitized).toContain("[REDACTED_BANK_ACCOUNT]");
      expect(result.sanitized).toContain("[REDACTED_QUESTIONNAIRE_RESPONSE]");
      expect(result.sanitized).toContain("[REDACTED_EMAIL]");
      expect(result.redactedCount).toBeGreaterThanOrEqual(5);
    });

    it("redacted output passes assertPayloadPrivacy cleanly", () => {
      const poisonedInput = "Aadhaar: 9876 5432 1098, PAN: XYZAB1234C, sleeping hours: 10pm-6am";
      const { sanitized } = RedactionService.redact(poisonedInput);
      // Must NOT throw after redaction
      expect(() => RedactionService.assertPayloadPrivacy(sanitized)).not.toThrow();
    });
  });

  // ─── 8. End-to-End: Prompt Payload Never Contains Sensitive Data ──────────
  describe("End-to-End: Assembled Prompt Payload Privacy", () => {
    it("buildPromptPayload + redact cycle eliminates all sensitive data", () => {
      const messages = [
        {
          role: "user" as const,
          content:
            "Why was I assigned this room? My Aadhaar is 1111 2222 3333 and smoking: heavy. Contact roommate@nit.edu.",
        },
      ];

      const explanation = {
        studentName: "Rohan",
        roomNumber: "305",
        hostelName: "Aryabhata Hall",
        bedNo: "B",
        score: 87,
        breakdown: { P: 90, C: 85, F: 88, D: 80, K: 92 },
        friendlySentence: "Matched on study schedule and floor preference.",
      };

      // Step 1: Build the prompt payload
      const payload = AssistantGuardrails.buildPromptPayload(messages, [], explanation);

      // Step 2: Apply redaction (same flow as GeminiAssistant)
      for (const msg of payload) {
        const { sanitized } = RedactionService.redact(msg.content);
        msg.content = sanitized;
      }

      // Step 3: Verify no sensitive data survives in ANY message
      const fullPayloadText = payload.map((m) => m.content).join("\n");

      // Aadhaar must be gone
      expect(fullPayloadText).not.toMatch(/1111\s*2222\s*3333/);
      expect(fullPayloadText).toContain("[REDACTED_AADHAAR]");

      // Questionnaire data must be gone (structured format)
      expect(fullPayloadText).toContain("[REDACTED_QUESTIONNAIRE_RESPONSE]");

      // Third-party email must be gone
      expect(fullPayloadText).not.toContain("roommate@nit.edu");
      expect(fullPayloadText).toContain("[REDACTED_EMAIL]");

      // Step 4: assertPayloadPrivacy must pass on the cleaned payload
      expect(() => RedactionService.assertPayloadPrivacy(fullPayloadText)).not.toThrow();
    });

    it("assertPayloadPrivacy FAILS on non-redacted payload (test proves the gate works)", () => {
      const rawPayload =
        "Student Aadhaar: 5555 6666 7777, sleeping hours: midnight, contact dean@nit.edu";

      expect(() => RedactionService.assertPayloadPrivacy(rawPayload)).toThrow("Privacy Violation");
    });
  });

  // ─── 9. Edge Cases ────────────────────────────────────────────────────────
  describe("Edge Cases", () => {
    it("does not redact clean, non-sensitive text", () => {
      const cleanInput = "What is the curfew time on weekdays?";
      const result = RedactionService.redact(cleanInput);
      expect(result.sanitized).toBe(cleanInput);
      expect(result.redactedCount).toBe(0);
      expect(result.redactionTypes).toHaveLength(0);
    });

    it("handles empty string gracefully", () => {
      const result = RedactionService.redact("");
      expect(result.sanitized).toBe("");
      expect(result.redactedCount).toBe(0);
    });

    it("assertPayloadPrivacy passes on clean text", () => {
      expect(() =>
        RedactionService.assertPayloadPrivacy("How does the allocation scoring formula work?"),
      ).not.toThrow();
    });
  });
});
