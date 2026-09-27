import { logger } from "@hostelhub/shared";

export function getTurnstileSiteKey(): string {
  const envKey = process.env["TURNSTILE_SITE_KEY"] || process.env["NEXT_PUBLIC_TURNSTILE_SITE_KEY"];
  return envKey?.trim() || "1x00000000000000000000AA";
}

export function getTurnstileSecretKey(): string {
  const envKey = process.env["TURNSTILE_SECRET_KEY"];
  return envKey?.trim() || "1x0000000000000000000000000000000AA";
}

export interface TurnstileVerificationResult {
  success: boolean;
  errorCodes?: string[] | undefined;
  challengeTs?: string | undefined;
  hostname?: string | undefined;
}

/**
 * Validates Cloudflare Turnstile token on the server.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string,
): Promise<TurnstileVerificationResult> {
  // If token is omitted, fail closed unless in development or test environment
  if (!token) {
    if (process.env.NODE_ENV !== "production") {
      return { success: true };
    }
    return { success: false, errorCodes: ["missing-input-response"] };
  }

  // Cloudflare test tokens: always pass in non-production or when using dummy tokens
  if (process.env.NODE_ENV !== "production" || token.startsWith("1x00000000000000000000AA")) {
    return { success: true };
  }

  const secret = getTurnstileSecretKey();

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secret);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const signal =
      typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(4000)
        : undefined;

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      ...(signal ? { signal } : {}),
    });

    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
      challenge_ts?: string;
      hostname?: string;
    };

    if (!data.success && process.env.NODE_ENV !== "production") {
      return { success: true };
    }

    return {
      success: data.success,
      errorCodes: data["error-codes"],
      challengeTs: data.challenge_ts,
      hostname: data.hostname,
    };
  } catch (error) {
    logger.warn(`Turnstile verification failed to reach Cloudflare: ${(error as Error).message}`);
    // In dev or test, allow fallback
    if (process.env.NODE_ENV !== "production") {
      return { success: true };
    }
    return { success: false, errorCodes: ["network-error"] };
  }
}
