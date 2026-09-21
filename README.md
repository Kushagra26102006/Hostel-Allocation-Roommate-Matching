# HostelHub (P03) — Autonomous Campus Housing & Allocation Platform

[![CI/CD Pipeline](https://github.com/hostelhub/hostelhub/actions/workflows/ci.yml/badge.svg)](https://github.com/hostelhub/hostelhub/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5%20Strict-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15%20App%20Router-black.svg)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0%20ReplicaSet-green.svg)](https://www.mongodb.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **HostelHub** is a production-grade, explainable, and cryptographically tamper-evident residential allocation platform designed for large universities (5,000–10,000+ residents). Built with a mathematical Gale-Shapley matching engine, Multi-Criteria Decision Analysis (MCDA), AES-256-GCM encrypted roommate surveys, and a SHA-256 forward-linked audit hash chain, HostelHub eliminates human favouritism while delivering an installable, accessible PWA experience.

---

## 📸 Key Features & Visual Overview

- **Installable Progressive Web App (PWA):** Offline application drafting with IndexedDB persistence, background synchronization, and Web Push notifications.
- **Multilingual Support:** Complete localization in English (`en`), Hindi (`hi`), and Punjabi (`pa`).
- **Interactive Bed Map & Review Console:** Visual room occupancy heat maps, accessible bed indicators, and optimistic concurrency version conflict resolution (`If-Match`).
- **Maker-Checker Four-Layer Publishing Gate:** Prevents unauthorized publication at the UI, service, API, and database schema levels.
- **Public Ed25519 QR Verification:** Gatekeepers can verify digitally signed student allotment letters without database credentials.
- **Dynamic Waitlist & Bed Vacating:** Automatic candidate selection and real-time room occupancy reconciliation.

---

## ⚡ One-Command Local Setup

### Prerequisites

- **Node.js:** `>= 20.0.0`
- **pnpm:** `>= 9.0.0`
- **Docker & Docker Compose:** Running locally

### Quick Start

```bash
# 1. Clone repository & install dependencies
git clone https://github.com/hostelhub/hostelhub.git
cd hostelhub
pnpm install

# 2. Start backing services (MongoDB, Redis, MinIO, ClamAV)
pnpm run infra:up

# 3. Seed deterministic test data (Seed 42)
pnpm run seed:synthetic --seed 42 --applicants 100 --beds 100 --reset

# 4. Start Next.js development server
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 All Monorepo Scripts Reference

| Script                      | Command                                           | Purpose                                                       |
| :-------------------------- | :------------------------------------------------ | :------------------------------------------------------------ |
| `pnpm dev`                  | `pnpm --filter @hostelhub/web dev`                | Starts Next.js development server on port 3000                |
| `pnpm build`                | `pnpm -r build`                                   | Compiles all packages and applications                        |
| `pnpm lint`                 | `eslint .`                                        | Runs ESLint flat config across the entire monorepo            |
| `pnpm typecheck`            | `pnpm -r typecheck`                               | Runs `tsc --noEmit` across all 5 workspace projects           |
| `pnpm test`                 | `pnpm -r test`                                    | Runs unit and integration test suites via Vitest              |
| `pnpm test:e2e`             | `pnpm --filter @hostelhub/web test:e2e`           | Runs Playwright critical journeys J1 to J10                   |
| `pnpm bench:allocation`     | `tsx scripts/bench-allocation.ts`                 | Executes 8,000 × 8,000 allocation performance benchmark       |
| `pnpm seed:synthetic`       | `tsx packages/db/src/seed/synthetic.ts`           | Deterministic synthetic generator with fixed seed             |
| `pnpm permissions:generate` | `tsx scripts/generate-permissions-doc.ts`         | Generates `docs/roles-permissions.md` from code               |
| `pnpm permissions:check`    | `tsx scripts/generate-permissions-doc.ts --check` | CI check verifying permission docs match `permissions.ts`     |
| `pnpm openapi:check`        | `tsx scripts/check-openapi-diff.ts`               | Verifies OpenAPI contract specification parity                |
| `pnpm i18n:check`           | `pnpm --filter @hostelhub/web i18n:check`         | Verifies translation key completeness across `en`, `hi`, `pa` |
| `pnpm infra:up`             | `docker compose up -d`                            | Launches MongoDB, Redis, MinIO, and ClamAV containers         |
| `pnpm infra:down`           | `docker compose down`                             | Stops background infrastructure containers                    |

---

## 🏛️ Monorepo Architecture

```
hostelhub/
├── apps/
│   ├── web/                     # Next.js 15 App Router frontend & API routes
│   │   ├── e2e/                 # Playwright E2E test suites (Journeys J1–J10)
│   │   └── src/                 # React Server/Client Components, hooks, API handlers
│   └── worker/                  # BullMQ background job worker runtime
├── packages/
│   ├── domain/                  # Pure mathematical matching solver & domain entities
│   ├── db/                      # Mongoose models, tenant repository, and audit service
│   └── shared/                  # RBAC permissions matrix, constants, cipher utilities
├── docs/                        # Complete technical documentation set
│   ├── adr/                     # Architecture Decision Records (ADRs 0001–0007)
│   ├── api/                     # API reference guide and OpenAPI contract
│   ├── engine/                  # Algorithm specification and 8,000 benchmark report
│   ├── runbooks/                # Deployment, backup/restore, on-call runbooks
│   └── user-guides/             # Student quickstart and warden/admin operational guides
└── scripts/                     # CI gates, benchmark runners, doc generators
```

### Dependency Flow

```
[apps/web]    ──depends on──► [packages/domain] ◄──depends on── [packages/db]
      │                               ▲                                ▲
      ▼                               │                                │
[packages/shared] ◄───────────────────┴────────────────────────────────┘
```

- **`packages/domain`** has zero database or external runtime dependencies.
- All database operations are strictly multi-tenant isolated via `institution_id`.

---

## 📚 Complete Documentation Set

- **Architecture Decision Records (ADRs):**
  - [ADR 0001: Technology Stack Choice](docs/adr/0001-stack-choice.md)
  - [ADR 0002: Allocation Engine Design & Determinism](docs/adr/0002-engine-design-determinism.md)
  - [ADR 0003: Cryptographic Storage & Key Rotation](docs/adr/0003-encryption-key-rotation.md)
  - [ADR 0004: Cryptographic Audit Hash Chain](docs/adr/0004-audit-hash-chain.md)
  - [ADR 0005: Notification Architecture & Delivery](docs/adr/0005-notification-design.md)
  - [ADR 0006: Deployment Architecture & Container Strategy](docs/adr/0006-deployment-choices.md)
  - [ADR 0007: Free-Service Integrations & Data Transmission Register](docs/adr/0007-free-service-integrations.md)
- **API & Contracts:**
  - [API Integration Guide](docs/api/README.md)
  - [OpenAPI 3.1 Specification JSON](docs/openapi.json)
- **Data Model & Schema:**
  - [Entity Relationship Diagram & Database Constraints](docs/data-model.md)
- **Matching Engine:**
  - [Algorithm Specification & Constraint Formulation](docs/engine/specification.md)
  - [8,000 × 8,000 Allocation Benchmark Report](docs/engine/benchmark-report.md)
- **Security & Authorization:**
  - [Role-Based Access Control (RBAC) Matrix](docs/roles-permissions.md)
  - [Security Hardening & Evidence Report](docs/security-report.md)
  - [Privacy Policy & Third-Party Disclosure Register](docs/privacy.md)
- **User Guides:**
  - [Student Quick-Start Guide](docs/user-guides/student-quickstart.md)
  - [Warden & Administrator Operations Guide](docs/user-guides/warden-admin-guide.md)
- **Operations & Runbooks:**
  - [Deployment & Rollback Runbook](docs/runbooks/deployment.md)
  - [Backup & Restore Runbook](docs/runbooks/backup-restore.md)
  - [Incident Response & Security Runbook](docs/runbooks/incident-response.md)
  - [On-Call Engineering Reference](docs/runbooks/on-call.md)
- **Handover & Operational Continuity:**
  - [Known Issues & Technical Debt Register](docs/known-issues.md)
  - [60–90 Minute Live Handover Demonstration Script](docs/handover-walkthrough.md)
  - [Accessibility (WCAG 2.2 AA) & Performance Audit](docs/a11y-perf-report.md)

---

## 👥 Default Demo Credentials (Seed 42)

| Persona / Role              | Email                  | Password               | Scope                                                |
| :-------------------------- | :--------------------- | :--------------------- | :--------------------------------------------------- |
| **Student**                 | `student.demo@nit.edu` | `Password123!`         | Own application, results, questionnaire, appeals     |
| **Warden**                  | `warden.demo@nit.edu`  | `Password123!` _(MFA)_ | Kaveri Hostel bed review, overrides, waitlist        |
| **Chief Warden**            | `chief.warden@nit.edu` | `Password123!` _(MFA)_ | All campus hostels, Maker-Checker approvals, publish |
| **Hostel Admin**            | `admin.hostel@nit.edu` | `Password123!` _(MFA)_ | Inventory CSV imports, cycle setup, matching trigger |
| **Dean of Student Welfare** | `dean.welfare@nit.edu` | `Password123!` _(MFA)_ | Macro analytics, audit hash chain verification       |
| **System Administrator**    | `sysadmin@nit.edu`     | `Password123!` _(MFA)_ | Optimization weights, system flags, API keys         |

---

## 🔒 Security & Vulnerability Reporting

Please report security issues directly to `security@hostelhub.edu`. See [`docs/runbooks/incident-response.md`](docs/runbooks/incident-response.md) for vulnerability handling runbooks.

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE).
