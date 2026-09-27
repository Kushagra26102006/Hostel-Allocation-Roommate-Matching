import { logger } from "../../config/logger.js";

export interface SendSmsOptions {
  to: string;
  body: string;
}

export interface SmsPort {
  sendSms(options: SendSmsOptions): Promise<{ messageId: string; success: boolean }>;
}

export class ConsoleSmsAdapter implements SmsPort {
  async sendSms(options: SendSmsOptions): Promise<{ messageId: string; success: boolean }> {
    const id = `sms-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    logger.info(
      { messageId: id, to: options.to, body: options.body },
      "📱 [SMS Sent via Console Adapter]",
    );
    return { messageId: id, success: true };
  }
}

export function getSmsAdapter(): SmsPort {
  return new ConsoleSmsAdapter();
}
