import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string | undefined;
  from?: string | undefined;
}

export interface EmailPort {
  sendEmail(options: SendEmailOptions): Promise<{ messageId: string; success: boolean }>;
}

export class ConsoleEmailAdapter implements EmailPort {
  async sendEmail(options: SendEmailOptions): Promise<{ messageId: string; success: boolean }> {
    const id = `console-email-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    logger.info(
      {
        messageId: id,
        to: options.to,
        subject: options.subject,
        from: options.from || env.EMAIL_FROM,
      },
      "📧 [Email Sent via Console Adapter]",
    );
    return { messageId: id, success: true };
  }
}

export class ResendEmailAdapter implements EmailPort {
  constructor(private apiKey: string) {}

  async sendEmail(options: SendEmailOptions): Promise<{ messageId: string; success: boolean }> {
    if (!this.apiKey) {
      return new ConsoleEmailAdapter().sendEmail(options);
    }
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: options.from || env.EMAIL_FROM,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.error({ status: response.status, body: errText }, "Resend API error");
        return { messageId: "", success: false };
      }

      const resData = (await response.json()) as { id: string };
      return { messageId: resData.id, success: true };
    } catch (error) {
      logger.error({ error }, "Failed to send email via Resend");
      return { messageId: "", success: false };
    }
  }
}

export function getEmailAdapter(): EmailPort {
  if (env.EMAIL_PROVIDER === "resend" && env.EMAIL_API_KEY) {
    return new ResendEmailAdapter(env.EMAIL_API_KEY);
  }
  return new ConsoleEmailAdapter();
}
