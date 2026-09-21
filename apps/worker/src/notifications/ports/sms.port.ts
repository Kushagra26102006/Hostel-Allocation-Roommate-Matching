/**
 * @hostelhub/worker — SMS Port
 * Implements SMS port with console logging (dev/test) and Twilio adapter.
 *
 * CRITICAL GUARDRAIL:
 * SMS is strictly permitted ONLY for:
 * 1. Final allocation publication ("allocation.published")
 * 2. Critical application window closing deadline ("window.closing" <= 24h)
 * Any attempt to dispatch SMS for other event types is rejected.
 */

import type { NotificationEventType } from "@hostelhub/domain";
import { createLogger } from "@hostelhub/shared";

const log = createLogger("sms-port");

export interface SendSmsOptions {
  to: string;
  text: string;
  eventType: NotificationEventType;
  hoursRemaining?: number | undefined;
}

export interface SmsDeliveryResult {
  success: boolean;
  sid?: string | undefined;
  error?: string | undefined;
}

export class SmsPort {
  constructor(
    private readonly config: {
      provider: "console" | "twilio";
      accountSid?: string | undefined;
      authToken?: string | undefined;
      fromNumber?: string | undefined;
    },
  ) {}

  async send(options: SendSmsOptions): Promise<SmsDeliveryResult> {
    // 1. Enforce strict prompt book guardrail
    const isAllocationPublished = options.eventType === "allocation.published";
    const isCriticalDeadline =
      options.eventType === "window.closing" && (options.hoursRemaining ?? 24) <= 24;

    if (!isAllocationPublished && !isCriticalDeadline) {
      const errorMsg = `SMS prohibited for event type "${options.eventType}". Only allocation.published and critical deadlines allow SMS.`;
      log.warn({ eventType: options.eventType, to: options.to }, errorMsg);
      return { success: false, error: errorMsg };
    }

    // 2. Twilio Adapter
    if (this.config.provider === "twilio" && this.config.accountSid && this.config.authToken) {
      return this.sendViaTwilio(options);
    }

    // 3. Console Adapter (Default)
    log.info(
      {
        to: options.to,
        eventType: options.eventType,
        text: options.text,
      },
      "[SIMULATED SMS DELIVERED]",
    );

    return {
      success: true,
      sid: `sms-console-${Date.now()}`,
    };
  }

  private async sendViaTwilio(options: SendSmsOptions): Promise<SmsDeliveryResult> {
    try {
      const auth = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString(
        "base64",
      );
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;

      const params = new URLSearchParams();
      params.append("To", options.to);
      params.append("From", this.config.fromNumber ?? "+15005550006");
      params.append("Body", options.text);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `Twilio error (${res.status}): ${errText}` };
      }

      const data = (await res.json()) as { sid?: string };
      return { success: true, sid: data.sid };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
