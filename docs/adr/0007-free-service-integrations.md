# ADR 0007 — Free and Open-Source Service Integrations & Data Transmission Register

**Date:** 2026-09-20  
**Status:** Accepted  
**Deciders:** Security, Privacy & Infrastructure Team

---

## Context

To minimize operational costs while maintaining production-grade reliability, HostelHub integrates several free, self-hosted, and open-source services. Under the **Digital Personal Data Protection (DPDP) Act 2023** and university compliance regulations, every third-party service integration must be rigorously documented with an exact data transmission register confirming that **no unnecessary student personally identifiable information (PII) leaves the trust boundary**.

---

## Decision

We maintain a strict inventory of all external service integrations, detailing their purpose, hosting model, and exact data fields transmitted:

| Service / Tool                  | Purpose                                                                  | Hosting Model                  | Data Sent                                                                         | Privacy & PII Safeguards                                                                                                                            |
| :------------------------------ | :----------------------------------------------------------------------- | :----------------------------- | :-------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sentry**                      | Crash reporting, application error tracking, and performance monitoring  | Cloud (Free Tier)              | Stack traces, HTTP status codes, route paths, release version, browser user-agent | **Strict PII Scrubber Active:** `beforeSend` strips emails, student names, roll numbers, IP addresses, and request bodies. `sendDefaultPii: false`. |
| **Cloudflare Turnstile**        | CAPTCHA bot protection on login & registration                           | Cloud (Free Tier)              | Client IP address, challenge response token, HTTP headers                         | No user credentials, form values, or session tokens are shared. Turnstile does not track users across sites.                                        |
| **LibreTranslate / MyMemory**   | Machine-translation drafting for Hindi (`hi`) and Punjabi (`pa`) locales | Self-Hosted / Free API         | Static UI translation strings only (e.g. "Save draft", "Floor preference")        | **Zero runtime user data transmitted.** Translation runs strictly at build-time or in local CLI scripts; runtime requests use static JSON files.    |
| **ClamAV**                      | Antivirus scanning of uploaded PDF/JPEG documents                        | Self-Hosted (Docker container) | Raw binary byte stream of uploaded file                                           | Processed entirely inside the institutional network perimeter (`clamav:3310`). No files leave the infrastructure.                                   |
| **MinIO / AWS S3**              | Object storage for income certificates and student documents             | Self-Hosted / Private Bucket   | Encrypted binary document payloads keyed by random UUIDs                          | Files are stored in private buckets with no public read access. Downloads require short-lived (15-minute) presigned URLs.                           |
| **Redis**                       | BullMQ task queue, rate-limiting counters, pub/sub for SSE               | Self-Hosted (Docker container) | Transient task IDs, rate-limiting IP keys, notification payloads                  | In-memory only; protected by Redis AUTH password. No long-term storage.                                                                             |
| **Email (Resend / Nodemailer)** | Transactional email dispatches                                           | Cloud / Local SMTP Relay       | Recipient email address, recipient name, notification subject, message HTML       | Sent over TLS 1.3. Emails contain action deeplinks rather than sensitive medical or questionnaire details.                                          |
| **UptimeRobot**                 | Synthetic uptime monitoring                                              | Cloud (Free Tier)              | HTTP GET to public `/health` and `/ready` endpoints                               | Probes receive generic JSON `{ "status": "ok" }`. No application state or tenant data exposed.                                                      |

---

## Consequences

### Positive

- **Complete DPDP Act Compliance:** Auditors can verify that student personal data (lifestyle survey, academic rank, disability details) is never transmitted to external analytics or AI vendors.
- **Cost Efficiency:** Utilizes free tiers and self-hosted open-source components without vendor lock-in.

### Negative / Trade-offs

- Self-hosting ClamAV and MinIO requires managing Docker service health, memory limits (ClamAV requires ~1.2 GB RAM for signature definitions), and storage volume backups.
