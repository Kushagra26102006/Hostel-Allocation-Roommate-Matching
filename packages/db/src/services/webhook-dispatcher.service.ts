import crypto from "node:crypto";
import type { Types } from "mongoose";
import { WebhookRepository } from "../repository/webhook.repository.js";
import { WebhookDeliveryLogRepository } from "../repository/webhook-delivery-log.repository.js";
import type { WebhookDocument, WebhookEventType } from "../models/webhook.model.js";

export interface DispatchResult {
  webhookId: string;
  url: string;
  success: boolean;
  statusCode: number;
  attempts: number;
  durationMs: number;
  autoDisabled: boolean;
  logId?: string | undefined;
  error?: string | undefined;
}

export interface WebhookDispatcherOptions {
  maxRetries?: number | undefined;
  backoffFactorMs?: number | undefined;
  fetchFn?: typeof fetch | undefined;
}

export class WebhookDispatcherService {
  private readonly webhookRepo: WebhookRepository;
  private readonly logRepo: WebhookDeliveryLogRepository;
  private readonly fetchFn: typeof fetch;

  constructor(
    private readonly institutionId: string | Types.ObjectId,
    private readonly options: WebhookDispatcherOptions = {},
  ) {
    this.webhookRepo = new WebhookRepository(this.institutionId);
    this.logRepo = new WebhookDeliveryLogRepository(this.institutionId);
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
  }

  /**
   * Generates HMAC-SHA256 signature for payload with timestamp.
   * Cryptographically binds timestamp + "." + payload to prevent replay and tampering.
   */
  public static generateSignature(
    secret: string,
    timestamp: string | number,
    rawPayload: string,
  ): string {
    return crypto.createHmac("sha256", secret).update(`${timestamp}.${rawPayload}`).digest("hex");
  }

  /**
   * Verifies an incoming webhook signature with timing-safe comparison and replay timestamp check.
   */
  public static verifySignature(
    secret: string,
    timestamp: string | number,
    rawPayload: string,
    providedSignature: string,
    maxAgeSeconds = 300,
  ): { valid: boolean; reason?: string } {
    const tsNum = typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
    if (isNaN(tsNum)) {
      return { valid: false, reason: "Invalid timestamp header" };
    }

    // Check replay attack window (5 minutes default)
    const now = Math.floor(Date.now() / 1000);
    // Allow timestamps in seconds or ms
    const normalizedTs = tsNum > 1e11 ? Math.floor(tsNum / 1000) : tsNum;
    if (Math.abs(now - normalizedTs) > maxAgeSeconds) {
      return { valid: false, reason: "Webhook timestamp expired (replay attack prevention)" };
    }

    const expectedSignature = WebhookDispatcherService.generateSignature(
      secret,
      timestamp,
      rawPayload,
    );

    const sigBuffer = Buffer.from(providedSignature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length) {
      return { valid: false, reason: "Signature length mismatch" };
    }

    const matches = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    return matches ? { valid: true } : { valid: false, reason: "Signature mismatch" };
  }

  /**
   * Dispatches an event payload to all active webhooks subscribed to the event.
   */
  public async dispatch(
    event: WebhookEventType,
    payload: Record<string, unknown>,
  ): Promise<DispatchResult[]> {
    const webhooks = await this.webhookRepo.findActiveByEvent(event);
    if (webhooks.length === 0) {
      return [];
    }

    const results: DispatchResult[] = [];
    for (const webhook of webhooks) {
      const result = await this.deliverToWebhook(webhook, event, payload);
      results.push(result);
    }

    return results;
  }

  /**
   * Delivers a single test ping to a specified webhook.
   */
  public async sendTestPing(webhookId: string | Types.ObjectId): Promise<DispatchResult> {
    const webhook = await this.webhookRepo.findById(webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    const testPayload = {
      event: "application.submitted" as WebhookEventType,
      timestamp: new Date().toISOString(),
      institution_id: this.institutionId.toString(),
      is_test: true,
      data: {
        application_id: "app_test_demo_123",
        student_name: "Aarav Sharma",
        student_roll: "2026-CS-042",
        gender: "male",
        cycle: "AY-2026-27-FALL",
        submitted_at: new Date().toISOString(),
      },
    };

    return this.deliverToWebhook(webhook, "application.submitted", testPayload);
  }

  /**
   * Performs delivery with exponential backoff retries (default 3 attempts).
   */
  private async deliverToWebhook(
    webhook: WebhookDocument,
    event: WebhookEventType,
    payload: Record<string, unknown>,
  ): Promise<DispatchResult> {
    const maxRetries = this.options.maxRetries ?? 3;
    const backoffBase = this.options.backoffFactorMs ?? 500;
    const rawPayload = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = WebhookDispatcherService.generateSignature(
      webhook.secret,
      timestamp,
      rawPayload,
    );

    let attempt = 0;
    let lastStatusCode = 0;
    let lastResponseBody = "";
    let lastError: string | undefined;
    let isSuccess = false;
    const startTime = performance.now();

    while (attempt < maxRetries) {
      attempt++;
      try {
        const res = await this.fetchFn(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Signature": signature,
            "X-Signature-Timestamp": timestamp,
            "X-HostelHub-Event": event,
            "User-Agent": "HostelHub-Webhook-Dispatcher/1.0",
          },
          body: rawPayload,
          signal: AbortSignal.timeout(8000),
        });

        lastStatusCode = res.status;
        const text = await res.text();
        lastResponseBody = text.slice(0, 1000);

        if (res.ok) {
          isSuccess = true;
          break;
        } else {
          lastError = `HTTP error status ${res.status}`;
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        lastStatusCode = 0;
      }

      // If more attempts remain, sleep with exponential backoff
      if (attempt < maxRetries) {
        const delayMs = backoffBase * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    const durationMs = Math.round(performance.now() - startTime);
    let autoDisabled = false;

    if (isSuccess) {
      await this.webhookRepo.recordSuccess(webhook._id);
    } else {
      const failResult = await this.webhookRepo.recordFailure(webhook._id, 5);
      autoDisabled = failResult.autoDisabled;
    }

    // Save Delivery Log
    const logDoc = await this.logRepo.create({
      webhook_id: webhook._id,
      event,
      url: webhook.url,
      payload,
      signature,
      timestamp,
      status_code: lastStatusCode,
      response_body: lastResponseBody || undefined,
      duration_ms: durationMs,
      attempt,
      success: isSuccess,
      error_message: lastError,
      delivered_at: new Date(),
    });

    return {
      webhookId: webhook._id.toString(),
      url: webhook.url,
      success: isSuccess,
      statusCode: lastStatusCode,
      attempts: attempt,
      durationMs,
      autoDisabled,
      logId: logDoc._id.toString(),
      error: lastError,
    };
  }
}
