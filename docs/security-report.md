# HostelHub Security Baseline & Hardening Report

**Date**: September 21, 2026  
**Status**: PASSED / VERIFIED  
**Auditor**: HostelHub Security Working Group  
**Scope**: Web Application (`apps/web`), Background Worker (`apps/worker`), Shared Core (`packages/shared`), Database & Encryption (`packages/db`).

---

## 1. Executive Summary

This report documents the security posture, defense-in-depth hardening controls, threat model, and automated test evidence established for HostelHub. All controls adhere to OWASP Top 10 (2021) and Indian Digital Personal Data Protection (DPDP) Act requirements for multi-tenant higher education environments.

### Core Achievements

1. **HTTP Security Headers & Modern Transport**: Strict CSP with dynamic cryptographic nonces, HSTS with preloading, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and restricted `Permissions-Policy`.
2. **Strict Authorization & Tenant Isolation**: Table-driven matrix test covering 100% of defined RBAC routes across all roles (`anon`, `student`, `warden`, `chief_warden`, `hostel_admin`, `dean`, `sys_admin`) with zero permission bypasses and verified cross-tenant query boundaries.
3. **Upload Security & Anti-Malware**: Private presigned storage paths only (`tenants/${institutionId}/...`), ClamAV stream scanning over ScanPort via Docker Compose, automatic quarantine of infected files, and strict MIME/magic-byte sniffing validation.
4. **Anti-Tamper Audit Logging**: SHA-256 cryptographic hash-chained audit trails with nightly BullMQ worker verification and real-time `"auditchain.failed"` alerting.
5. **PII & Credential Redaction**: Automated logging safety tests guaranteeing zero emission of emails, phone numbers, auth tokens, passwords, or sensitive questionnaire answers in operational logs.
6. **Secrets & Dependency Hygiene**: Gitleaks secrets detection in CI, lockfile integrity checks, `dependabot.yml` automated dependency updates, and `pnpm audit` passing with **0 High and 0 Critical findings**.
7. **Automated DAST**: OWASP ZAP baseline scanner script and CI workflow (`.github/workflows/zap.yml`) verifying zero High and zero Medium vulnerabilities.

---

## 2. Threat Modeling & Attack Surfaces (STRIDE)

| Threat Category            | Primary Target                     | Potential Vector                                                   | Implemented Defense Control                                                                                                |
| :------------------------- | :--------------------------------- | :----------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| **Spoofing**               | Authentication & Session           | Session hijacking, forged JWT/cookies, tenant impersonation        | NextAuth session cookies with `HttpOnly`, `SameSite=lax`, `Secure`, tenant-bound session validation in `apiHandler`.       |
| **Tampering**              | Allocation Decisions, Audit Trails | Manual DB tampering, audit log deletion, unapproved drafts         | SHA-256 hash chains linking audit events; nightly worker `verifyChain` job; dry-run draft DB validation locks.             |
| **Repudiation**            | Warden Overrides & Student Appeals | Denying having submitted an appeal or approved an allocation       | Cryptographically signed audit log entries capturing timestamp, actor ID, IP address, user-agent, and before/after diffs.  |
| **Information Disclosure** | Student PII & Documents            | IDOR on document downloads, cross-tenant leak, verbose server logs | Presigned S3/MinIO URLs with TTL <= 15m; mandatory tenant scoping in all queries; Pino log redaction paths on PII/answers. |
| **Denial of Service**      | Login, Apply, Presign, Allocations | Rapid brute force, file exhaustion, algorithm flooding             | Redis sliding-window rate limiters per route; 1MB body limit; ClamAV stream scanning before document ingestion.            |
| **Elevation of Privilege** | Student accessing Admin APIs       | Role tampering, lack of server-side capability checks              | Centralized `apiHandler` enforcing permission matrix (`hasPermission(user.roles, capability)`) before route logic.         |

---

## 3. Defense-in-Depth Implementation Details

### 3.1 Content Security Policy & Frame Protection

- **Dynamic Nonces**: Every HTTP request receives a cryptographically secure random UUID nonce generated in `apps/web/src/middleware.ts`.
- **Policy Directives**:
  - `default-src 'self'`
  - `script-src 'self' 'nonce-{NONCE}' 'strict-dynamic'`
  - `style-src 'self' 'nonce-{NONCE}' https://fonts.googleapis.com`
  - `font-src 'self' https://fonts.gstatic.com data:`
  - `frame-ancestors 'none'` (anti-clickjacking)
  - `object-src 'none'`
  - `base-uri 'self'`
  - `form-action 'self'`

### 3.2 Cross-Site Request Forgery (CSRF) & Strict CORS

- **Mutation Guard**: In `apps/web/src/middleware.ts`, state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) with session authentication must supply an `Origin` or `Referer` matching the trusted host or explicit CORS origin allowlist (`ALLOWED_ORIGINS`).
- **CORS**: Preflight `OPTIONS` requests validate origins against `ALLOWED_ORIGINS` (or same-origin); unknown external origins receive 403 Forbidden with disallowed CORS headers.

### 3.3 File Upload Security & Malware Quarantine

- **Isolation**: Uploaded documents never sit in a public directory (no `public/uploads`). All assets reside in tenant-scoped object storage keys:
  `tenants/${institution_id}/applications/${application_id}/${document_id}-${filename}`
- **ClamAV Integration**:
  - Containerized `clamav` daemon in `docker-compose.yml` (`clamav/clamav:stable_base`, port 3310).
  - Stream scanning via TCP ScanPort.
  - When malware is detected, `status: "quarantined"` is persisted, metadata is flagged with infected virus signature, and the API responds with RFC 7807 problem `422 MALWARE_DETECTED`.

### 3.4 Rate Limiting Review

Sliding window rate limiters backed by Redis (`apps/web/src/lib/auth/rate-limiter.ts`) enforce strict thresholds across sensitive endpoints:

| Endpoint                          | Method  | Rate Limit             | Action on Exceeded        |
| :-------------------------------- | :------ | :--------------------- | :------------------------ |
| `/api/auth/callback/credentials`  | `POST`  | 5 req / 60s per IP     | 429 Problem + retry-after |
| `/api/v1/applications`            | `POST`  | 10 req / 60s per User  | 429 Problem + retry-after |
| `/api/v1/applications/:id/submit` | `POST`  | 10 req / 60s per User  | 429 Problem + retry-after |
| `/api/v1/documents/presign`       | `POST`  | 10 req / 60s per User  | 429 Problem + retry-after |
| `/api/v1/documents/:id/verify`    | `PATCH` | 30 req / 60s per Admin | 429 Problem + retry-after |

---

## 4. Test Evidence

### 4.1 Table-Driven Authorization Matrix Test

- **File**: `apps/web/src/__tests__/authorization-matrix.test.ts`
- **Results**: **93 tests passed, 0 failed**
- **Tested Roles**: `anon`, `student`, `warden`, `chief_warden`, `hostel_admin`, `dean`, `sys_admin`
- **Tested Routes**:
  - `GET /api/v1/health` (Public -> anon allowed)
  - `GET /api/v1/reports/occupancy` (Protected -> `dean` allowed; all others 401/403)
  - `POST /api/v1/policy/rulesets` (Protected -> `hostel_admin` allowed; all others 401/403)
  - `POST /api/v1/inventory/hostels` (Protected -> `hostel_admin` allowed; all others 401/403)
  - `POST /api/v1/inventory/rooms` (Protected -> `hostel_admin` allowed; all others 401/403)
  - `POST /api/v1/inventory/beds` (Protected -> `hostel_admin` allowed; all others 401/403)
  - `GET /api/v1/weights-versions` (Protected -> `sys_admin` allowed; all others 401/403)
  - `POST /api/v1/simulations` (Protected -> `hostel_admin`, `chief_warden` allowed; others 401/403)
  - `PATCH /api/v1/documents/:id/verify` (Protected -> `hostel_admin` allowed; others 401/403)
  - `POST /api/v1/drafts/:id/approve` (Protected -> `warden`, `chief_warden` allowed; others 401/403)
  - `POST /api/v1/drafts/:id/publish` (Protected -> `warden`, `chief_warden` allowed; others 401/403)
  - `POST /api/v1/drafts/:id/amend` (Protected -> `warden`, `chief_warden` allowed; others 401/403)
  - `GET /api/v1/applications` (Authenticated session required -> all roles allowed, anon rejected)
- **Cross-Tenant Isolation Checks**:
  - Verified `x-institution-id` spoofing headers cannot override the session `institution_id`.
  - Verified student queries are strictly clamped to their own `student_id`.

### 4.2 Logging Safety & PII Redaction

- **File**: `apps/web/src/__tests__/logging-safety.test.ts`
- **Results**: **1 test passed (10 assertions)**
- **Evidence**:
  - Simulated login payloads containing `email`, `password`, `turnstileToken`: Redacted to `[REDACTED]`.
  - Application submission payloads with student phone numbers, guardian emails, emergency contacts: Redacted to `[REDACTED]`.
  - Roommate questionnaire payloads containing personal habits (`smoking`, `sleep_schedule`, `hobbies`): Redacted to `[REDACTED]`.
  - Auth session tokens and JWTs: Redacted across all levels.

### 4.3 Audit-Chain Verifier Worker Job

- **File**: `apps/worker/src/__tests__/audit-verifier.test.ts`
- **Results**: **2 tests passed**
- **Evidence**:
  - Valid audit chains: Successfully verified across all institutions without errors.
  - Corrupted/Tampered audit entries: Discovered immediately, log warning emitted, and `"auditchain.failed"` domain event dispatched to the notifications queue with broken sequence number and hash.

### 4.4 Dependency & Secrets Hygiene

- **Gitleaks**: Configured in `.gitleaks.toml` and `.github/workflows/ci.yml`. Zero committed secrets detected.
- **Dependency Audit**:
  - `pnpm audit --audit-level=high`: Exited with code 0 (all high/critical production CVEs patched with overrides for `next@15.5.25`, `postcss@>=8.5.18`, `sharp@>=0.35.4`, `webpack@5.101.2`).
- **Dependabot**: Configured in `.github/dependabot.yml` covering `npm`, `github-actions`, and `docker`.
- **Lockfile Check**: Verified frozen lockfile and git diff check in CI.

### 4.5 OWASP ZAP Baseline Scan

- **Automation**: `scripts/zap-baseline-scan.sh` and `.github/workflows/zap.yml`.
- **Results**: Clean baseline scans with zero High and zero Medium findings.
