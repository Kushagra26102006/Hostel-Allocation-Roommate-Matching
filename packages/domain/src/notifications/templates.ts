/**
 * @hostelhub/domain — Notification Templates
 * Pure template functions for the 12 domain events.
 *
 * CRITICAL PRIVACY INVARIANT:
 * Message bodies must NOT expose personal identifiable information (PII)
 * such as student personal names, roll numbers, room numbers, medical notes,
 * or roommate identities. High-level statuses and deep links are used instead.
 */

import type {
  NotificationEventType,
  NotificationTemplateContext,
  RenderedNotificationMessage,
  NotificationChannel,
  NotificationPriority,
} from "./types.js";

export const DEFAULT_NOTIFICATION_MATRIX: Record<
  NotificationEventType,
  {
    channels: NotificationChannel[];
    priority: NotificationPriority;
    allowSms: boolean;
    allowWebhook: boolean;
    defaultDeepLink: string;
  }
> = {
  "application.submitted": {
    channels: ["in_app", "email"],
    priority: "normal",
    allowSms: false,
    allowWebhook: false,
    defaultDeepLink: "/application",
  },
  "window.closing": {
    channels: ["in_app", "email", "sms"],
    priority: "normal",
    allowSms: true, // Only if critical deadline (< 24h)
    allowWebhook: false,
    defaultDeepLink: "/application",
  },
  "document.rejected": {
    channels: ["in_app", "email"],
    priority: "normal",
    allowSms: false,
    allowWebhook: false,
    defaultDeepLink: "/application/documents",
  },
  "eligibility.result": {
    channels: ["in_app", "email"],
    priority: "normal",
    allowSms: false,
    allowWebhook: false,
    defaultDeepLink: "/application",
  },
  "draft.ready": {
    channels: ["in_app", "email", "webhook"],
    priority: "normal",
    allowSms: false,
    allowWebhook: true,
    defaultDeepLink: "/staff/warden/review",
  },
  "draft.approved": {
    channels: ["in_app", "email", "webhook"],
    priority: "normal",
    allowSms: false,
    allowWebhook: true,
    defaultDeepLink: "/staff/warden/review",
  },
  "allocation.published": {
    channels: ["in_app", "email", "push", "sms"],
    priority: "urgent",
    allowSms: true, // Specifically permitted for final allocation
    allowWebhook: true,
    defaultDeepLink: "/room",
  },
  "waitlist.promoted": {
    channels: ["in_app", "email", "push"],
    priority: "normal",
    allowSms: false,
    allowWebhook: false,
    defaultDeepLink: "/room",
  },
  "roomchange.decided": {
    channels: ["in_app", "email"],
    priority: "normal",
    allowSms: false,
    allowWebhook: false,
    defaultDeepLink: "/room",
  },
  "appeal.decided": {
    channels: ["in_app", "email"],
    priority: "normal",
    allowSms: false,
    allowWebhook: false,
    defaultDeepLink: "/room",
  },
  "sla.breached": {
    channels: ["in_app", "email", "webhook"],
    priority: "urgent",
    allowSms: false,
    allowWebhook: true,
    defaultDeepLink: "/staff/warden/review",
  },
  "auditchain.failed": {
    channels: ["in_app", "email", "webhook"],
    priority: "urgent",
    allowSms: false,
    allowWebhook: true,
    defaultDeepLink: "/staff/admin/audit",
  },
};

/**
 * Builds standard zero-PII HTML email content.
 */
function buildHtmlEmail(
  subject: string,
  lead: string,
  actionLabel: string,
  actionUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
    .body { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .btn { display: inline-block; background-color: #0284c7; color: #ffffff !important; text-decoration: none; padding: 10px 20px; font-size: 14px; font-weight: 600; border-radius: 8px; }
    .footer { margin-top: 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">${escapeHtml(subject)}</div>
    <div class="body">${escapeHtml(lead)}</div>
    <div><a class="btn" href="${escapeHtml(actionUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(actionLabel)}</a></div>
    <div class="footer">HostelHub Automated Notification. Please do not reply directly to this email. Sign in to your portal to manage your preferences.</div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Pure template renderer for each domain event.
 * Produces sanitized, PII-free message payloads.
 */
export function renderNotificationTemplate(
  eventType: NotificationEventType,
  context: NotificationTemplateContext = {},
  baseUrl = "https://hostelhub.internal",
): RenderedNotificationMessage {
  const config = DEFAULT_NOTIFICATION_MATRIX[eventType];
  const deepLink = context.actionUrl ?? `${baseUrl}${config.defaultDeepLink}`;

  switch (eventType) {
    case "application.submitted": {
      const subject = "Hostel Application Received";
      const bodyText =
        "Your hostel allocation application has been securely submitted and queued for verification. Track your status on the portal.";
      return {
        subject,
        bodyText,
        bodyHtml: buildHtmlEmail(subject, bodyText, "View Application", deepLink),
        deepLink,
        channels: config.channels,
        priority: config.priority,
      };
    }

    case "window.closing": {
      const hours = context.hoursRemaining ?? 24;
      const subject = `Application Window Closing Soon (${hours}h remaining)`;
      const bodyText = `The current application window closes in ${hours} hours. Ensure your preference forms and documents are finalized.`;
      const isCritical = hours <= 24;
      return {
        subject,
        bodyText,
        bodyHtml: buildHtmlEmail(subject, bodyText, "Finalize Application", deepLink),
        deepLink,
        smsText: isCritical
          ? `HostelHub: Application window closes in ${hours}h. Review your submission: ${deepLink}`
          : undefined,
        channels: isCritical ? config.channels : config.channels.filter((c) => c !== "sms"),
        priority: isCritical ? "urgent" : "normal",
      };
    }

    case "document.rejected": {
      const subject = "Document Verification Action Required";
      const reasonPart = context.reason ? ` Reason: ${context.reason}` : "";
      const bodyText = `One of your submitted verification documents requires revision.${reasonPart} Please upload a revised document to continue.`;
      return {
        subject,
        bodyText,
        bodyHtml: buildHtmlEmail(subject, bodyText, "Upload Document", deepLink),
        deepLink,
        channels: config.channels,
        priority: "normal",
      };
    }

    case "eligibility.result": {
      const statusText = context.status ?? "reviewed";
      const subject = "Housing Eligibility Status Updated";
      const bodyText = `Your hostel allocation eligibility status has been updated to "${statusText}". Sign in to review details.`;
      return {
        subject,
        bodyText,
        bodyHtml: buildHtmlEmail(subject, bodyText, "Check Status", deepLink),
        deepLink,
        channels: config.channels,
        priority: "normal",
      };
    }

    case "draft.ready": {
      const version = context.draftVersion ? ` (v${context.draftVersion})` : "";
      const subject = `Allocation Draft Ready for Warden Review${version}`;
      const bodyText =
        "An allocation algorithm draft has completed execution and is ready for SLA-governed warden review and verification.";
      return {
        subject,
        bodyText,
        bodyHtml: buildHtmlEmail(subject, bodyText, "Review Draft", deepLink),
        deepLink,
        webhookPayload: {
          text: `*[HostelHub Alert]* New allocation draft ready for review. SLA timer active. Link: ${deepLink}`,
        },
        channels: config.channels,
        priority: config.priority,
      };
    }

    case "draft.approved": {
      const subject = "Allocation Draft Approved";
      const bodyText =
        "The allocation draft has completed dual-authorization approval and is queued for final publication gate.";
      return {
        subject,
        bodyText,
        bodyHtml: buildHtmlEmail(subject, bodyText, "View Approved Draft", deepLink),
        deepLink,
        webhookPayload: {
          text: `*[HostelHub Alert]* Allocation draft approved. Ready for publication gate: ${deepLink}`,
        },
        channels: config.channels,
        priority: config.priority,
      };
    }

    case "allocation.published": {
      const subject = "Hostel Allocation Results Published";
      const bodyText =
        "Official hostel allocation results have been published. View your result reveal, download your official allocation letter, and view move-in details.";
      return {
        subject,
        bodyText,
        bodyHtml: buildHtmlEmail(subject, bodyText, "Reveal Allocation", deepLink),
        deepLink,
        smsText: `HostelHub: Your official hostel allocation is now published! View your result: ${deepLink}`,
        webhookPayload: {
          text: `*[HostelHub Alert]* Allocation cycle officially published. Results and signed letters live at: ${deepLink}`,
        },
        channels: config.channels,
        priority: "urgent",
      };
    }

    case "waitlist.promoted": {
      const subject = "Waitlist Promotion Notice";
      const bodyText =
        "A vacancy has become available and your allocation has been updated through automatic waitlist promotion. Please confirm your allotment.";
      return {
        subject,
        bodyText,
        bodyHtml: buildHtmlEmail(subject, bodyText, "Confirm Allotment", deepLink),
        deepLink,
        channels: config.channels,
        priority: config.priority,
      };
    }

    case "roomchange.decided": {
      const subject = "Room Change Request Decision";
      const bodyText =
        "A formal decision has been recorded on your room change application. Sign in to your portal to view the outcome and updated assignment.";
      return {
        subject,
        bodyText,
        bodyHtml: buildHtmlEmail(subject, bodyText, "View Decision", deepLink),
        deepLink,
        channels: config.channels,
        priority: config.priority,
      };
    }

    case "appeal.decided": {
      const subject = "Housing Appeal Decision";
      const bodyText =
        "The Welfare Committee has reviewed and recorded a decision on your special housing appeal. Review the decision details on your dashboard.";
      return {
        subject,
        bodyText,
        bodyHtml: buildHtmlEmail(subject, bodyText, "View Appeal Status", deepLink),
        deepLink,
        channels: config.channels,
        priority: config.priority,
      };
    }

    case "sla.breached": {
      const breachDetail = context.slaBreachType ? ` (${context.slaBreachType})` : "";
      const subject = `URGENT: Review SLA Threshold Breached${breachDetail}`;
      const bodyText =
        "A review SLA threshold has expired without the required approvals. Immediate operational review is required.";
      return {
        subject,
        bodyText,
        bodyHtml: buildHtmlEmail(subject, bodyText, "Open Review Queue", deepLink),
        deepLink,
        webhookPayload: {
          text: `<!here> *[CRITICAL SLA BREACH]* Review threshold expired${breachDetail}. Immediate action required: ${deepLink}`,
        },
        channels: config.channels,
        priority: "urgent",
      };
    }

    case "auditchain.failed": {
      const blockDetail = context.auditBlockHeight ? ` at block #${context.auditBlockHeight}` : "";
      const subject = `CRITICAL: Cryptographic Audit Hash-Chain Failure${blockDetail}`;
      const bodyText =
        "An immutable audit hash verification check has failed. Potential unauthorized modification detected. Review security audit log immediately.";
      return {
        subject,
        bodyText,
        bodyHtml: buildHtmlEmail(subject, bodyText, "Inspect Audit Chain", deepLink),
        deepLink,
        webhookPayload: {
          text: `<!channel> *[SECURITY ALERT]* Audit hash-chain integrity verification failed${blockDetail}. Inspect immediately: ${deepLink}`,
        },
        channels: config.channels,
        priority: "urgent",
      };
    }
  }
}
