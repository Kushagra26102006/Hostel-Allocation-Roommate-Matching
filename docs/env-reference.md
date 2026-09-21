# HostelHub Environment Variable Reference

This document provides the definitive configuration reference for all environment variables used across the HostelHub web application (`apps/web`), background worker (`apps/worker`), and database layer (`packages/db`).

---

## 1. Quick Setup Reference

| Environment           | Primary Target                        | Configuration File                           |
| :-------------------- | :------------------------------------ | :------------------------------------------- |
| **Local Development** | Docker Compose Stack                  | `.env.local` or `.env` in repository root    |
| **Staging**           | Vercel (Preview) + Render / Fly.io    | Vercel Project Settings + Render Environment |
| **Production**        | Vercel (Production) + Render / Fly.io | Doppler / Infisical / Secret Manager         |

---

## 2. Core Infrastructure Variables

| Variable Name           | Default Value                                                      | Required | Secret? | Service         | Description                                                                                                                                         |
| :---------------------- | :----------------------------------------------------------------- | :------- | :------ | :-------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`              | `development`                                                      | Yes      | No      | Web, Worker     | Node runtime environment (`development`, `test`, `production`).                                                                                     |
| `PORT`                  | `3000`                                                             | No       | No      | Web             | HTTP listening port for Next.js web application.                                                                                                    |
| `MONGODB_URI`           | `mongodb://localhost:27017/hostelhub?directConnection=true`        | Yes      | **Yes** | Web, Worker, DB | MongoDB connection string. In production Atlas, requires replica set URI with `retryWrites=true&w=majority` to support multi-document transactions. |
| `REDIS_URL`             | `redis://localhost:6379`                                           | Yes      | **Yes** | Web, Worker     | Redis connection URL. Used for BullMQ queues and sliding-window rate limiting. Compatible with Upstash Redis and self-hosted Redis.                 |
| `AUTH_SECRET`           | `hostelhub-secret-min-32-chars-long!`                              | Yes      | **Yes** | Web             | 32-byte cryptographic secret used by NextAuth.js for session cookie signing and encryption.                                                         |
| `NEXTAUTH_URL`          | `http://localhost:3000`                                            | Yes      | No      | Web             | Canonical URL of the application. Set to `https://hostelhub.campus.edu` in production.                                                              |
| `MASTER_ENCRYPTION_KEY` | `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` | Yes      | **Yes** | Web, Worker, DB | 64-character hex string (32 bytes) used for field-level AES-256-GCM encryption of sensitive student data (questionnaires, PII).                     |
| `ENCRYPTION_KEY_ID`     | `v1`                                                               | Yes      | No      | Web, Worker, DB | Key identifier for key-rotation management in field encryption.                                                                                     |

---

## 3. Object Storage (MinIO / Cloudflare R2 / AWS S3)

| Variable Name          | Default Value           | Required | Secret? | Service     | Description                                                                                      |
| :--------------------- | :---------------------- | :------- | :------ | :---------- | :----------------------------------------------------------------------------------------------- |
| `S3_ENDPOINT`          | `http://localhost:9000` | Yes      | No      | Web, Worker | S3-compatible API endpoint (e.g., `https://<account-id>.r2.cloudflarestorage.com` or MinIO URL). |
| `S3_REGION`            | `auto`                  | No       | No      | Web, Worker | S3 region (`auto` for Cloudflare R2, `us-east-1` for standard).                                  |
| `S3_BUCKET`            | `hostelhub-documents`   | Yes      | No      | Web, Worker | Private object storage bucket name for student documents.                                        |
| `S3_ACCESS_KEY_ID`     | `minioadmin`            | Yes      | **Yes** | Web, Worker | API access key ID for object storage.                                                            |
| `S3_SECRET_ACCESS_KEY` | `minioadmin`            | Yes      | **Yes** | Web, Worker | API secret access key for object storage.                                                        |
| `S3_FORCE_PATH_STYLE`  | `true`                  | No       | No      | Web, Worker | Set `true` for local MinIO, `false` for AWS S3 / Cloudflare R2.                                  |

---

## 4. Anti-Bot, Anti-Malware & Security

| Variable Name                    | Default Value                         | Required | Secret? | Service | Description                                                                |
| :------------------------------- | :------------------------------------ | :------- | :------ | :------ | :------------------------------------------------------------------------- |
| `TURNSTILE_SECRET_KEY`           | `1x0000000000000000000000000000000AA` | Yes      | **Yes** | Web     | Cloudflare Turnstile secret key for server-side captcha verification.      |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `1x0000000000000000000000AA`          | Yes      | No      | Web     | Public Turnstile site key exposed to client browser widgets.               |
| `CLAMAV_HOST`                    | `localhost`                           | No       | No      | Web     | Hostname of containerized ClamAV scan daemon (`clamav` in Docker Compose). |
| `CLAMAV_PORT`                    | `3310`                                | No       | No      | Web     | Port for ClamAV TCP ScanPort stream scanning.                              |
| `ALLOWED_ORIGINS`                | `http://localhost:3000`               | No       | No      | Web     | Comma-delimited list of permitted CORS origins.                            |

---

## 5. Observability & Monitoring

| Variable Name                | Default Value | Required | Secret? | Service     | Description                                                           |
| :--------------------------- | :------------ | :------- | :------ | :---------- | :-------------------------------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN`     | _(None)_      | No       | No      | Web         | Sentry Data Source Name for frontend error reporting.                 |
| `SENTRY_DSN`                 | _(None)_      | No       | **Yes** | Web, Worker | Sentry DSN for server-side Next.js routes and background worker.      |
| `SENTRY_RELEASE`             | `1.0.0`       | No       | No      | Web, Worker | Sentry release version tag (defaults to commit SHA in CI/CD).         |
| `LOG_LEVEL`                  | `info`        | No       | No      | Web, Worker | Pino logger output level (`trace`, `debug`, `info`, `warn`, `error`). |
| `PROMETHEUS_METRICS_ENABLED` | `true`        | No       | No      | Web         | Enables telemetry metrics exposition at `/api/v1/metrics`.            |

---

## 6. Email & SMS Delivery (Mock vs Production)

| Variable Name    | Default Value | Required | Secret? | Service | Description                                                           |
| :--------------- | :------------ | :------- | :------ | :------ | :-------------------------------------------------------------------- |
| `EMAIL_PROVIDER` | `mock`        | No       | No      | Worker  | Notification delivery provider (`mock`, `ses`, `sendgrid`, `resend`). |
| `SMS_PROVIDER`   | `mock`        | No       | No      | Worker  | SMS gateway provider (`mock`, `sns`, `twilio`).                       |
| `SMTP_HOST`      | _(None)_      | No       | No      | Worker  | SMTP host when using standard email transport.                        |
| `SMTP_PORT`      | `587`         | No       | No      | Worker  | SMTP port (587 TLS, 465 SSL).                                         |
| `SMTP_USER`      | _(None)_      | No       | **Yes** | Worker  | SMTP authentication username.                                         |
| `SMTP_PASSWORD`  | _(None)_      | No       | **Yes** | Worker  | SMTP authentication password.                                         |

---

## 7. Security Best Practices for Secret Management

1. **Never commit `.env` or `.env.local` to Git**. All secrets are scanned via Gitleaks in CI.
2. **Environment Separation**: Maintain distinct credentials for Staging and Production databases and Redis clusters.
3. **Secret Rotation**: Follow [`docs/runbooks/incident-response.md`](file:///Users/kushagra/Desktop/untitled%20folder%202/docs/runbooks/incident-response.md) for zero-downtime rotation of `MASTER_ENCRYPTION_KEY` and `AUTH_SECRET`.
