# ADR 0005 — Notification Architecture and Multi-Channel Delivery

**Date:** 2026-09-20  
**Status:** Accepted  
**Deciders:** Product & Platform Team

---

## Context

Hostel allocation events are high-stakes and time-sensitive. Students need immediate alerts when:

1. Application windows open or approach closing.
2. Eligibility verification requires corrective action.
3. Allocation results and signed letters are ready for download.
4. Roommate swap offers or waitlist promotion proposals expire (often within a strict 24–48 hour deadline).

Staff need real-time notifications for:

1. Escalated overrides requiring Maker-Checker review.
2. SLA countdown warnings on student appeals.

---

## Decision

We establish an asynchronous, multi-channel notification architecture orchestrated by BullMQ worker queues and Redis pub/sub:

```
[System Event] ──► [Notification Dispatcher]
                           │
         ┌─────────────────┼─────────────────┬─────────────────┐
         ▼                 ▼                 ▼                 ▼
   [In-App Store]     [Web Push]       [Email Relay]      [Live SSE Stream]
   (Notification     (VAPID / SW       (Transactional     (Redis Pub/Sub
     Collection)      Service Worker)    Nodemailer)       Dashboard Feed)
```

### 1. Delivery Channels

1. **In-App Notification Center:** Persisted in MongoDB; provides badge counters, unread filters, and direct action deeplinks.
2. **Web Push (PWA):** Standard Web Push API via `web-push` library with institutional VAPID keys. Fires background notifications on mobile and desktop devices even when the app tab is closed.
3. **Transactional Email:** HTML email templates rendered with clean typography, action CTA buttons, and plain text fallbacks.
4. **Live Server-Sent Events (SSE):** Push updates via `/api/v1/runs/[id]/events` and `/api/v1/drafts/[id]/events` for real-time progress bars without client polling.

### 2. Quiet Hours & User Preferences

- Users configure granular channel opt-ins per category (`eligibility.result`, `allocation.provisional`, `roommate.request`, `waitlist.promotion`, `appeal.update`) via `/notifications/preferences`.
- Non-critical notifications observe institutional quiet hours (22:00 – 07:00 IST) unless tagged as high-priority emergency alerts.

---

## Consequences

### Positive

- **High Reachability:** Students receive alerts on mobile devices through the installable PWA without requiring native app store downloads.
- **Resilience:** If the email provider encounters rate limits, in-app and Web Push deliveries remain unaffected due to isolated BullMQ worker queues.

### Negative / Trade-offs

- Web Push requires explicit browser permission prompts; UX must educate users on why permissions are required before triggering the native prompt.
