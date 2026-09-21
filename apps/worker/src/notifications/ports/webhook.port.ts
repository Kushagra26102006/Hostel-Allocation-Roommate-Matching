/**
 * @hostelhub/worker — Webhook Port
 * Slack / Discord operational alerts adapter for wardens and administrators.
 */

import { createLogger } from "@hostelhub/shared";

const log = createLogger("webhook-port");

export interface SendWebhookOptions {
  url?: string | undefined;
  payload: Record<string, unknown>;
  eventType: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  status?: number | undefined;
  error?: string | undefined;
}

export class WebhookPort {
  constructor(private readonly defaultWebhookUrl?: string | undefined) {}

  async send(options: SendWebhookOptions): Promise<WebhookDeliveryResult> {
    const targetUrl = options.url ?? this.defaultWebhookUrl;

    if (!targetUrl) {
      log.info(
        { eventType: options.eventType, payload: options.payload },
        "[SIMULATED OPERATIONAL WEBHOOK DISPATCHED]",
      );
      return { success: true, status: 200 };
    }

    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options.payload),
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const errorMsg = `Webhook target responded with status ${res.status}: ${text}`;
        log.warn({ status: res.status, errorMsg }, "Webhook delivery failed");
        return { success: false, status: res.status, error: errorMsg };
      }

      log.info({ targetUrl, eventType: options.eventType }, "Operational alert webhook delivered");
      return { success: true, status: res.status };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error({ err, targetUrl }, "Error sending operational webhook");
      return { success: false, error: errorMsg };
    }
  }
}
