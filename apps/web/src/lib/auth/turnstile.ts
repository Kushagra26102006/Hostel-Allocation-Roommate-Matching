import { logger } from "@hostelhub/shared";

export function getTurnstileSiteKey(): string {
  const envKey = process.env["TURNSTILE_SITE_KEY"];
  if (process.env.NODE_ENV === "production" && (!envKey || envKey.includes("00000"))) {
    throw new Error("TURNSTILE_SITE_KEY is required and must be a valid key in production.");
  }
  return envKey ?? "1x00000000000000000000AA";
}

export function getTurnstileSecretKey(): string {
  const envKey = process.env["TURNSTILE_SECRET_KEY"];
  if (process.env.NODE_ENV === "production" && (!envKey || envKey.includes("00000"))) {
    throw new Error("TURNSTILE_SECRET_KEY is required and must be a valid key in production.");
  }
  return envKey ?? "1x0000000000000000000000000000000AA";
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

  const secret = getTurnstileSecretKey();

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secret);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
