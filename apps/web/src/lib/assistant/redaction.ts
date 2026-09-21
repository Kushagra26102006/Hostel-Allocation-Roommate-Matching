/**
 * Privacy & Redaction Service for AI Assistant.
 *
 * Enforces DPDP Act 2023 principles:
 * - NEVER send questionnaire answers, identity documents, fee/financial data,
 *   or third-party student data to any external LLM.
 */

// Regex patterns for Indian identity numbers & financial data
const AADHAAR_REGEX = /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g;
const PAN_REGEX = /\b[A-Z]{5}\d{4}[A-Z]{1}\b/gi;
const CREDIT_CARD_REGEX = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g;
const BANK_ACCOUNT_REGEX = /\b(?:acc(?:ount)?|a\/c)\s*[:#-]?\s*\d{9,18}\b/gi;
const IFSC_REGEX = /\b[A-Z]{4}0[A-Z0-9]{6}\b/gi;

// Sensitive questionnaire keywords and values that must be redacted
const QUESTIONNAIRE_KEYWORDS_REGEX =
  /\b(?:sleep(?:ing)?\s*(?:hours|schedule|routine)|smoking|cigarette|non-smoker|cleanliness|tidiness|study\s*(?:routine|quietness)|dietary|vegetarian|non-veg|vegan|substance\s*use)\s*[:=]\s*[^,\n.]+/gi;

// Email addresses that do not match the current authorized user
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

export interface RedactionResult {
  sanitized: string;
  redactedCount: number;
  redactionTypes: string[];
}

export class RedactionService {
  /**
   * Redacts sensitive personal and financial data from input text before sending to LLMs.
   */
  static redact(text: string, currentStudentEmail?: string): RedactionResult {
    let sanitized = text;
    let count = 0;
    const types: Set<string> = new Set();

    // 1. Redact Aadhaar Numbers
    if (AADHAAR_REGEX.test(sanitized)) {
      sanitized = sanitized.replace(AADHAAR_REGEX, () => {
        count++;
        types.add("Aadhaar");
        return "[REDACTED_AADHAAR]";
      });
    }

    // 2. Redact PAN Numbers
    if (PAN_REGEX.test(sanitized)) {
      sanitized = sanitized.replace(PAN_REGEX, () => {
        count++;
        types.add("PAN");
        return "[REDACTED_PAN]";
      });
    }

    // 3. Redact Financial / Card Numbers
    if (CREDIT_CARD_REGEX.test(sanitized)) {
      sanitized = sanitized.replace(CREDIT_CARD_REGEX, () => {
        count++;
        types.add("CreditCard");
        return "[REDACTED_FINANCIAL_CARD]";
      });
    }

    if (BANK_ACCOUNT_REGEX.test(sanitized)) {
      sanitized = sanitized.replace(BANK_ACCOUNT_REGEX, () => {
        count++;
        types.add("BankAccount");
        return "[REDACTED_BANK_ACCOUNT]";
      });
    }

    if (IFSC_REGEX.test(sanitized)) {
      sanitized = sanitized.replace(IFSC_REGEX, () => {
        count++;
        types.add("IFSC");
        return "[REDACTED_IFSC]";
      });
    }

    // 4. Redact Lifestyle Questionnaire Responses
    if (QUESTIONNAIRE_KEYWORDS_REGEX.test(sanitized)) {
      sanitized = sanitized.replace(QUESTIONNAIRE_KEYWORDS_REGEX, () => {
        count++;
        types.add("QuestionnaireResponse");
        return "[REDACTED_QUESTIONNAIRE_RESPONSE]";
      });
    }

    // 5. Redact Non-User Email Addresses
    sanitized = sanitized.replace(EMAIL_REGEX, (match) => {
      if (currentStudentEmail && match.toLowerCase() === currentStudentEmail.toLowerCase()) {
        return match;
      }
      count++;
      types.add("ThirdPartyEmail");
      return "[REDACTED_EMAIL]";
    });

    return {
      sanitized,
      redactedCount: count,
      redactionTypes: Array.from(types),
    };
  }

  /**
   * Strict privacy assertion. Throws an error if any prohibited field appears in the outgoing payload.
   */
  static assertPayloadPrivacy(payload: string, currentStudentEmail?: string): void {
    if (AADHAAR_REGEX.test(payload)) {
      throw new Error("Privacy Violation: Outgoing payload contains unredacted Aadhaar number.");
    }
    if (PAN_REGEX.test(payload)) {
      throw new Error("Privacy Violation: Outgoing payload contains unredacted PAN card number.");
    }
    if (CREDIT_CARD_REGEX.test(payload)) {
      throw new Error(
        "Privacy Violation: Outgoing payload contains unredacted Credit Card number.",
      );
    }
    if (BANK_ACCOUNT_REGEX.test(payload)) {
      throw new Error("Privacy Violation: Outgoing payload contains unredacted Bank Account info.");
    }
    if (QUESTIONNAIRE_KEYWORDS_REGEX.test(payload)) {
      throw new Error(
        "Privacy Violation: Outgoing payload contains raw lifestyle questionnaire data.",
      );
    }

    // Check for foreign emails
    const emails = payload.match(EMAIL_REGEX);
    if (emails) {
      for (const email of emails) {
        if (!currentStudentEmail || email.toLowerCase() !== currentStudentEmail.toLowerCase()) {
          throw new Error(
            `Privacy Violation: Outgoing payload contains third-party email: ${email}`,
          );
        }
      }
    }
  }
}
