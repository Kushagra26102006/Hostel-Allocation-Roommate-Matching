/**
 * @hostelhub/worker — Push Port
 * Web Push port via VAPID and web-push library.
 */

import webpush from "web-push";
import { NotificationService } from "@hostelhub/db";
import { createLogger } from "@hostelhub/shared";

const log = createLogger("push-port");

export interface SendPushOptions {
  userId: string;
  title: string;
  body: string;
  url: string;
  icon?: string | undefined;
}

export interface PushDeliveryResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  error?: string | undefined;
}

export class PushPort {
  private vapidConfigured = false;

  constructor(
    private readonly config: {
      publicKey?: string | undefined;
      privateKey?: string | undefined;
      subject: string;
    },
  ) {
    if (config.publicKey && config.privateKey) {
      try {
        webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
        this.vapidConfigured = true;
      } catch (err) {
        log.warn({ err }, "Invalid VAPID credentials provided for web push");
      }
    }
  }

  async send(options: SendPushOptions): Promise<PushDeliveryResult> {
    const subscriptions = await NotificationService.getUserPushSubscriptions(options.userId);
    if (subscriptions.length === 0) {
      return { success: true, sentCount: 0, failedCount: 0 };
    }

    const payloadString = JSON.stringify({
      title: options.title,
      body: options.body,
      icon: options.icon ?? "/favicon.ico",
      data: { url: options.url },
    });

    let sentCount = 0;
    let failedCount = 0;
    let lastError: string | undefined;

    for (const sub of subscriptions) {
      if (!this.vapidConfigured) {
        // Simulated push delivery in dev/test when VAPID keys are absent
        log.info(
          { userId: options.userId, endpoint: sub.endpoint, title: options.title },
          "[SIMULATED PUSH NOTIFICATION DELIVERED]",
        );
        sentCount++;
        continue;
      }

      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          payloadString,
          { timeout: 5000 },
        );
        sentCount++;
      } catch (err: unknown) {
        failedCount++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        lastError = err instanceof Error ? err.message : String(err);

        // 404 or 410 means subscription is permanently unsubscribed or expired
        if (statusCode === 404 || statusCode === 410) {
          log.info({ endpoint: sub.endpoint }, "Cleaning up expired push subscription");
          await NotificationService.deletePushSubscription(sub.endpoint);
        } else {
          log.error({ err, endpoint: sub.endpoint }, "Failed to deliver web push notification");
        }
      }
    }

    return {
      success: sentCount > 0 || failedCount === 0,
      sentCount,
      failedCount,
      error: failedCount > 0 ? lastError : undefined,
    };
  }
}
