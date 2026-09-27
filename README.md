# HostelHub (P03) — Policy-Driven Hostel Allocation & Roommate Compatibility Matching Platform

[![CI/CD Pipeline](https://github.com/Kushagra26102006/Hostel-Allocation-Roommate-Matching/actions/workflows/ci.yml/badge.svg)](https://github.com/Kushagra26102006/Hostel-Allocation-Roommate-Matching/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5%20Strict-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15%20App%20Router-black.svg)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0%20ReplicaSet-green.svg)](https://www.mongodb.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **HostelHub** is an enterprise-grade, explainable, and cryptographically tamper-evident residential allocation platform engineered for higher-education campuses (5,000–10,000+ residents). Built with a mathematical Gale-Shapley matching engine, Multi-Criteria Decision Analysis (MCDA), AES-256-GCM encrypted roommate surveys, and a SHA-256 forward-linked audit hash chain, HostelHub eliminates human favouritism while delivering an accessible, mobile-first PWA experience with a unified brand design system.

---

## 📸 Visual Showcase & Architectural Gallery

The platform features high-fidelity, real architectural assets and a single dominant brand palette (**Deep Electric Indigo `#3155FF`**) with slate neutrals and WCAG 2.2 AA compliant contrast:

|                 Campus Grounds & Hero                  |                    Modern Residence Hall                     |
| :----------------------------------------------------: | :----------------------------------------------------------: |
| ![Campus Hero](apps/web/public/images/campus-hero.jpg) | ![Residence Hall](apps/web/public/images/residence-hall.jpg) |
|      _High-speed campus-wide residential portal_       |     _Multi-block capacity with floor & bed hierarchies_      |

|                  Optimized Room Interior                   |                Collaborative Study Lounge                |
| :--------------------------------------------------------: | :------------------------------------------------------: |
| ![Room Interior](apps/web/public/images/room-interior.jpg) | ![Study Lounge](apps/web/public/images/study-lounge.jpg) |
|    _Visual room cards & interactive bed occupancy maps_    |    _Harmonious roommate matching & community living_     |

---

## 🌟 Key Functional Pillars

### 1. Mathematical Allocation & Roommate Matching Engine

- **Deterministic Gale-Shapley Algorithm:** Modified stable-matching engine supporting quota capacities, category reservation rules, and preference rankings.
- **Explainable Allocation Scores:** Transparent scoring breakdown (e.g. `87.4 / 100` — First-choice hostel `+40`, Room type match `+25`, Roommate compatibility `+18`, Distance factor `+4.4`).
- **Privacy-Consenting Roommate Compatibility:** Multi-factor lifestyle matching (sleep schedule, study habits, cleanliness, noise tolerance, smoking, food preferences) calculating mutual compatibility percentages with explanation chips (`✓ Similar sleep schedule`, `⚠ Different social preference`).
- **Cryptographic Seeding:** Fully deterministic tie-breaking utilizing SHA-256 seeds (`--seed 42`) ensuring zero algorithmic drift and 100% reproducibility.

### 2. Multi-Step Student Journey

- **Progressive Application Stepper:** 6-step form with real-time field validation, draft autosaving, and category eligibility verification.
- **Ranked Preferences UI:** Intuitive drag-and-drop & keyboard-accessible priority ordering (`01`, `02`, `03`, `04`) across hostels, blocks, room types, and floors.
- **Roommate Group Builder:** Mutual-consent invite codes (`HH-XXXXXX`) guaranteeing that students are only paired when both parties approve.
- **Digital Allotment Letter:** Print-ready official allocation letter with institution seal, authorized signature block, allocation reference, and public Ed25519-signed QR code.
- **Self-Service Actions:** In-portal room change requests, administrative appeals with SLA countdown timers, and live vacancy notifications.

### 3. Staff & Administrative Consoles

- **Interactive Bed Map (`/warden/bed-map`):** Real-time hierarchy drilldown (`Hostel → Block → Floor → Room → Bed`) showing live occupancy states (`Occupied`, `Available`, `Reserved`, `Maintenance`).
- **High-Density Review Ledger (`/warden/assignments`):** Rapid filtering, bulk search, dossier inspection drawer, and optimistic concurrency version conflict handling (`If-Match`).
- **Audited Warden Override Workflow (`/warden/review`):** Pre-validation of capacity and eligibility constraints before any manual room change, recording SHA-256 audit logs with mandatory warden justification.
- **Dynamic Waitlist Manager (`/warden/waitlist`):** Transparent queue positioning (`Current Position: #12`), vacancy-triggered promotions, and quota category filters.
- **Maker-Checker Publication Gate (`/chief-warden/publish`):** 4-stage governance pipeline (`DRAFT → UNDER REVIEW → APPROVED → PUBLISHED`) preventing unapproved allocations from reaching student portals.
- **Live Allocation Console (`/admin/allocation`):** Real-time Server-Sent Events (SSE) log terminal streaming the 7-stage Gale-Shapley pipeline progress.
- **Visual Policy Rule Builder (`/admin/policies`):** No-code `IF-THEN` conditional rule compiler for semester quotas, distance priority, and category restrictions.
- **Executive Analytics (`/dean/analytics`):** Real-time Dean dashboard featuring monochromatic indigo charts, occupancy heatmaps, and algorithm convergence metrics.
- **Tamper-Evident Audit Chain (`/sys-admin/audit`):** Cryptographic verification of SHA-256 hash chains across all administrative and allocation actions.

---

## 👥 Default Personas & Credentials (Seed 42)

The system seeds deterministic demo accounts for testing all six role perspectives:

| Role             | Email                  | Password               | Scope & Primary Actions                                                                               |
| :--------------- | :--------------------- | :--------------------- | :---------------------------------------------------------------------------------------------------- |
| **Student**      | `student.demo@nit.edu` | `Password123!`         | Application submission, preference ranking, roommate invites, digital allotment letter, appeals       |
| **Warden**       | `warden.demo@nit.edu`  | `Password123!` _(MFA)_ | Kaveri Hostel bed map, manual overrides with justification, waitlist promotions, assignments ledger   |
| **Chief Warden** | `chief.warden@nit.edu` | `Password123!` _(MFA)_ | Campus-wide hostel oversight, 4-stage Maker-Checker approval and cryptographic allocation publication |
| **Hostel Admin** | `admin.hostel@nit.edu` | `Password123!` _(MFA)_ | CSV inventory import wizard, policy rule builder, Gale-Shapley allocation run console                 |
| **Dean (DSW)**   | `dean.welfare@nit.edu` | `Password123!` _(MFA)_ | Read-only executive analytics, capacity heatmaps, demographic distribution, audit oversight           |
| **System Admin** | `sysadmin@nit.edu`     | `Password123!` _(MFA)_ | SHA-256 audit chain verification, cryptographic key rotation, system parameters, rate limit flags     |

---

## ⚡ Quickstart & Local Setup

### System Prerequisites

- **Node.js:** `>= 20.0.0`
- **pnpm:** `>= 9.0.0`
- **Docker & Docker Compose:** Running locally (for MongoDB, Redis, MinIO)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Kushagra26102006/Hostel-Allocation-Roommate-Matching.git
cd Hostel-Allocation-Roommate-Matching
pnpm install
```

### 2. Launch Background Infrastructure

```bash
# Starts MongoDB 7 (Replica Set), Redis 7, MinIO S3, and ClamAV
pnpm run infra:up
```

### 3. Initialize Environment Variables

```bash
# Copy root environment template
cp .env.example .env

# Web client environment
cp .env.example apps/web/.env.local

# Backend environment
cp backend/.env.example backend/.env
```

### 4. Seed Deterministic Test Data

```bash
# Seeds 100 applicants, 100 beds, policy rules, and test cycles under Seed 42
pnpm run seed:synthetic --seed 42 --applicants 100 --beds 100 --reset
```

### 5. Start Development Servers

```bash
# Start frontend (port 3000)
pnpm dev

# In a separate terminal, start backend API (port 4000)
pnpm --filter @hostelhub/backend dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser. Use the top-right Quick Role Switcher or login with any persona credentials above.

---

## 📜 Complete Monorepo Command Reference

| Script                | Command                                  | Purpose                                                      |
| :-------------------- | :--------------------------------------- | :----------------------------------------------------------- |
| **Start Web App**     | `pnpm dev`                               | Starts Next.js 15 dev server on `http://localhost:3000`      |
| **Start Backend**     | `pnpm --filter @hostelhub/backend dev`   | Starts Express API with tsx file watcher on port `4000`      |
| **Typecheck All**     | `pnpm -r run typecheck`                  | Runs `tsc --noEmit` across all 6 workspace packages (Strict) |
| **Run All Tests**     | `pnpm -r test`                           | Executes Vitest suites across domain, db, backend, and web   |
| **Run Web Tests**     | `pnpm --filter @hostelhub/web test`      | Runs 36 test files (334 test cases) for web client           |
| **Run Backend Tests** | `pnpm --filter @hostelhub/backend test`  | Runs unit, integration, and property-based backend tests     |
| **Run Linter**        | `pnpm run lint`                          | Runs ESLint 9 across all packages (0 errors/warnings)        |
| **Build Web**         | `pnpm --filter @hostelhub/web build`     | Compiles Next.js production bundle (133 routes)              |
| **Build Backend**     | `pnpm --filter @hostelhub/backend build` | Compiles TypeScript backend to `dist/`                       |
| **Build Worker**      | `pnpm --filter @hostelhub/worker build`  | Compiles BullMQ background worker to `dist/`                 |
| **Benchmark Engine**  | `pnpm run bench:allocation`              | Executes 8,000 × 8,000 allocation stress test                |
| **Start Docker**      | `pnpm run infra:up`                      | Starts MongoDB, Redis, MinIO, ClamAV via Docker Compose      |
| **Stop Docker**       | `pnpm run infra:down`                    | Gracefully stops all infrastructure containers               |
| **Reset Docker**      | `pnpm run infra:reset`                   | Tears down containers and wipes local docker volumes         |

---

## 🏛️ Monorepo Architecture & Directory Structure

```
Hostel-Allocation-Roommate-Matching/
├── apps/
│   ├── web/                     # Next.js 15 App Router frontend (PWA, SSR & Client Components)
│   │   ├── public/              # Static assets, Web App Manifest, architectural imagery
│   │   ├── src/
│   │   │   ├── app/             # App Router pages (student, warden, chief-warden, admin, dean, sys-admin)
│   │   │   ├── components/      # UI primitives (Button, Card, Badge, DataTable, StatCard, etc.)
│   │   │   ├── hooks/           # Custom React hooks (useMockApi, useAuth, useDebounce)
│   │   │   ├── lib/             # API client, motion tokens, crypto utilities, validators
│   │   │   ├── styles/          # Design tokens (tokens.css) & global styles (globals.css)
│   │   │   └── types/           # Strict TypeScript contracts & API models
│   └── worker/                  # BullMQ background worker for async matching & notifications
├── backend/                     # Node.js + Express + Mongoose REST API service
│   ├── src/
│   │   ├── controllers/         # REST API route handlers
│   │   ├── middleware/          # JWT auth, RBAC permissions, rate limiters, validation
│   │   ├── routes/              # Express API router definitions
│   │   └── services/            # Business logic, audit logging, allocation dispatchers
│   └── tests/                   # Backend unit, integration, and fast-check property tests
├── packages/
│   ├── domain/                  # Pure mathematical matching solver & domain entities (Zero dependencies)
│   │   ├── src/algorithms/      # Gale-Shapley matching implementation, MCDA scoring
│   │   └── src/entities/        # Student, Room, Bed, Policy domain interfaces
│   ├── db/                      # Mongoose models, tenant repository, and audit service
│   └── shared/                  # RBAC permissions matrix, constants, cipher utilities
├── docs/                        # Complete technical documentation set
│   ├── adr/                     # Architecture Decision Records (ADRs 0001–0007)
│   ├── api/                     # API reference guide and OpenAPI contract
│   ├── engine/                  # Algorithm specification and 8,000 benchmark report
│   ├── runbooks/                # Deployment, backup/restore, on-call runbooks
│   └── user-guides/             # Student quickstart and warden/admin operational guides
└── docker-compose.yml           # Local infrastructure orchestration definition
```

---

## 🎨 UI/UX Design System Specification

HostelHub adheres to a disciplined, enterprise-grade design system:

- **Dominant Brand Color:** Deep Electric Indigo (`hsl(228 100% 60%)` / `#3155FF`) used intentionally for primary calls-to-action, active indicators, and focus states.
- **Neutral Palette:** High-contrast slate neutrals (`hsl(222 47% 11%)` foreground, `hsl(210 40% 98%)` background, subtle `hsl(214 32% 91%)` borders).
- **Semantic Accents:**
  - `Success`: Emerald Green (`#10B981`)
  - `Warning`: Amber (`#F59E0B`)
  - `Destructive`: Crimson Red (`#EF4444`)
  - `Info`: Electric Blue (`#3B82F6`)
- **Motion Principles:** Micro-interactions (150–250ms ease-out) powered by Framer Motion and CSS primitives, fully honoring `prefers-reduced-motion`.
- **Accessibility:** Full WCAG 2.2 AA compliance, visible `:focus-visible` rings, semantic ARIA roles, and keyboard navigation across all interactive widgets.

---

## 🔐 Security, Cryptography & Privacy

1. **AES-256-GCM Sensitive Field Encryption:**
   - Lifestyle questionnaire responses and medical accommodations are encrypted at rest with tenant-isolated key IDs.
2. **Ed25519 Public QR Verification:**
   - Digital allotment letters embed an Ed25519 signature in a QR code. Security personnel can verify authenticity offline at campus gates using public keys.
3. **Immutable HMAC-SHA256 Forward-Linked Audit Chain:**
   - Every administrative override, room swap, and status transition is cryptographically linked to the previous log entry. Any tampering invalidates the hash chain immediately.
4. **Role-Based Access Control (RBAC):**
   - Explicit permissions enforced at both the API middleware and database query layers, preventing horizontal privilege escalation.

---

## 🚀 Production Deployment & Containerization

### Docker Compose Production Stack

A production multi-container setup includes:

```bash
# 1. Build and launch all services in detached mode
docker compose -f docker-compose.prod.yml up -d --build

# 2. Verify container health status
docker compose ps
```

### Environment Checklist for Production

- Set `NODE_ENV=production`.
- Generate 32-byte hex keys for `AUTH_SECRET`, `MASTER_ENCRYPTION_KEY`, and `JWT_SECRET`.
- Provide genuine SMTP credentials for transactional emails.
- Configure S3/MinIO bucket access for allotment letter PDF archiving.
- Enforce SSL termination at the reverse proxy (Nginx or Cloudflare).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
