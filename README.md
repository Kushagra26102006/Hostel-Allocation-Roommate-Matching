# Hostel Allocation & Roommate Matching

[![Build Status](https://img.shields.io/badge/Build-Passing-emerald.svg)](#build-commands)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5%20Strict-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15%20App%20Router-black.svg)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0%20ReplicaSet-green.svg)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.0%20BullMQ-red.svg)](https://redis.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> A modern, mathematical, and cryptographically verifiable residential hostel allocation and roommate compatibility platform for higher education institutions (5,000–10,000+ residents). Built with a Gale-Shapley stable matching engine, Multi-Criteria Decision Analysis (MCDA), AES-256-GCM encrypted questionnaire responses, and a SHA-256 forward-linked audit hash chain.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [System Requirements](#system-requirements)
- [Local Setup & Quick Start](#local-setup--quick-start)
- [Environment Variables](#environment-variables)
- [MongoDB Setup](#mongodb-setup)
- [Redis Setup](#redis-setup)
- [MinIO / S3 Setup](#minios3-setup)
- [Docker Setup](#docker-setup)
- [Development Commands](#development-commands)
- [Build Commands](#build-commands)
- [Testing Commands](#testing-commands)
- [Production Deployment Instructions](#production-deployment-instructions)
- [Security Notes & Vulnerability Reporting](#security-notes--vulnerability-reporting)
- [License](#license)

---

## Project Overview

Hostel Allocation & Roommate Matching eliminates manual bias, student dissatisfaction, and administrative bottlenecks in university dorm distribution. It combines:

1. **Mathematical Determinism:** Multi-Criteria Decision Analysis (MCDA) and stable roommate allocation (Gale-Shapley variant) ensuring fair, Pareto-optimal distributions.
2. **Explainable Matching:** Transparent scoring based on synchronized sleep habits, study quietness, room tidiness, and climate preferences.
3. **Cryptographic Integrity:** End-to-end AES-256-GCM encrypted lifestyle questionnaires, public Ed25519 digital signature passes, and immutable audit logs.
4. **Premium Dark Campus SaaS UI:** High-contrast responsive interface with 3D key-cards, animated compatibility gauges, interactive SVG floor cutaways, and offline-capable PWA support.

---

## Key Features

- **Interactive Room & Bed Allotment:** 3D digital key-card pass with NFC chip rendering, animated room reveal, confetti celebrations, and verified allotment certificate downloads.
- **AI-Driven Roommate Compatibility Portal:** Lifestyle alignment across 6 dimensions (Sleep, Study, Cleanliness, Noise, AC, Policy) with mutual deal-breaker guarantees.
- **Maker-Checker Four-Layer Publishing Gate:** Prevents unauthorized publication across the UI, service, API, and schema levels.
- **Offline PWA Architecture:** Background synchronization, IndexedDB drafts, and Web Push notifications.
- **Public Ed25519 QR Verification:** Security desk verification of cryptographically signed room passes without requiring database access.
- **Real-Time Automated Waitlist:** Instant bed reassignment upon student cancellation with BullMQ job queuing.
- **Multilingual Support:** Complete localization in English (`en`), Hindi (`hi`), and Punjabi (`pa`).

---

## Technology Stack

| Layer             | Technologies                                                                                              |
| :---------------- | :-------------------------------------------------------------------------------------------------------- |
| **Frontend**      | Next.js 15 (App Router), React 19, TypeScript 5.5, Tailwind CSS, Framer Motion, Lucide Icons              |
| **Backend / API** | Node.js 20+, Next.js Route Handlers, Zod Validation, OpenRouteService                                     |
| **Database**      | MongoDB 7.0 (Single-node Replica Set `rs0` with Change Streams and Multi-Document Transactions), Mongoose |
| **Queue / Cache** | Redis 7.0, BullMQ background job processing                                                               |
| **Storage**       | MinIO / AWS S3 (S3-compatible object storage)                                                             |
| **Security**      | NextAuth v5, AES-256-GCM, Ed25519 signatures, Argon2id, ClamAV antivirus daemon                           |
| **Tooling & CI**  | pnpm workspaces, Vitest, Playwright, Docker & Docker Compose, ESLint Flat Config, Prettier                |

---

## Repository Structure

```
.
├── apps/
│   ├── web/                     # Next.js 15 App Router web application & API
│   │   ├── src/app/             # Application routes ((student), (staff), api/v1)
│   │   ├── src/components/      # Reusable UI & design system components
│   │   └── Dockerfile           # Standalone production container definition
│   └── worker/                  # BullMQ background job worker
│       ├── src/                 # Queue workers (allocations, notifications, emails)
│       └── Dockerfile           # Production worker container definition
├── packages/
│   ├── domain/                  # Pure mathematical matching solver & entities (Zero DB dependencies)
│   ├── db/                      # Mongoose models, tenant repository, and audit service
│   └── shared/                  # RBAC permissions matrix, constants, cipher utilities
├── infra/                       # Infrastructure configuration & Mongo replica set scripts
├── docs/                        # Architecture Decision Records (ADRs) & specifications
├── docker-compose.yml           # Local backing services (Mongo, Redis, MinIO, Mailpit, ClamAV)
├── package.json                 # Monorepo workspace scripts
└── pnpm-workspace.yaml          # pnpm workspace definition
```

---

## System Requirements

- **Node.js:** `>= 20.0.0 LTS`
- **pnpm:** `>= 9.0.0`
- **Docker & Docker Compose:** Required for backing services
- **Memory:** Minimum 4 GB RAM recommended for local simulation

---

## Local Setup & Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Kushagra26102006/Hostel-Allocation-Roommate-Matching.git
cd Hostel-Allocation-Roommate-Matching
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Review `.env` and set your preferred configuration (development defaults work out of the box with the local Docker containers).

### 4. Start Infrastructure Containers

```bash
pnpm run infra:up
```

This starts:

- MongoDB 7.0 (`localhost:27017` as replica set `rs0`)
- Redis 7.0 (`localhost:6379`)
- MinIO (`localhost:9000` / Console `localhost:9001`)
- Mailpit (`localhost:1025` SMTP / `localhost:8025` Web UI)
- ClamAV (`localhost:3310`)

### 5. Seed Synthetic Campus Data

```bash
pnpm run seed:synthetic --seed 42 --applicants 100 --beds 100 --reset
```

### 6. Start Development Servers

In one terminal, start the Next.js web application:

```bash
pnpm run dev
```

In a second terminal, start the background worker:

```bash
pnpm --filter @hostelhub/worker dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

All configuration is externalized via environment variables. See [`.env.example`](.env.example) for a complete template.

| Variable                | Description                                                   | Default / Example                                    |
| :---------------------- | :------------------------------------------------------------ | :--------------------------------------------------- |
| `NODE_ENV`              | Application environment (`development` / `production`)        | `development`                                        |
| `APP_URL`               | Base canonical application URL                                | `http://localhost:3000`                              |
| `AUTH_SECRET`           | 32+ character entropy string for NextAuth session encryption  | Generate with `openssl rand -hex 32`                 |
| `MASTER_ENCRYPTION_KEY` | 32+ character master key for AES-256-GCM questionnaire cipher | Generate with `openssl rand -hex 32`                 |
| `ENCRYPTION_KEY_ID`     | Identifier for active encryption key version                  | `key-v1`                                             |
| `MONGODB_URI`           | MongoDB connection URI with replicaSet query parameter        | `mongodb://localhost:27017/hostelhub?replicaSet=rs0` |
| `REDIS_URL`             | Redis instance URL                                            | `redis://localhost:6379`                             |
| `S3_ENDPOINT`           | S3-compatible storage endpoint URL                            | `http://localhost:9000`                              |
| `S3_REGION`             | S3 region identifier                                          | `us-east-1`                                          |
| `S3_ACCESS_KEY`         | S3 API access key                                             | Configured securely in deployment                    |
| `S3_SECRET_KEY`         | S3 API secret key                                             | Configured securely in deployment                    |
| `S3_BUCKET`             | Destination S3 bucket name                                    | `hostelhub`                                          |
| `SMTP_HOST`             | Outbound mail server hostname                                 | `localhost`                                          |
| `SMTP_PORT`             | Outbound mail server port                                     | `1025`                                               |

---

## MongoDB Setup

Hostel Allocation & Roommate Matching relies on MongoDB multi-document transactions and change streams, which require a **replica set**.

- **Local Development:** The provided `docker-compose.yml` automatically initializes a single-node replica set named `rs0`.
- **Production:** Use MongoDB Atlas (M10+) or a self-hosted replica set with TLS enabled. Ensure the connection string includes `?replicaSet=<name>&retryWrites=true&w=majority`.

---

## Redis Setup

Redis provides caching and powers BullMQ queues for asynchronous matching, document generation, and email/SMS dispatch.

- **Local Development:** Accessible on `localhost:6379` via Docker.
- **Production:** Use Redis 7+ standalone or Redis Cluster with password authentication: `rediss://:password@host:6379`.

---

## MinIO / S3 Setup

All student identity documents, medical certificates, and generated PDF allotment letters are stored in S3-compatible storage.

- **Local Development:** MinIO runs at `http://localhost:9000` (Console: `http://localhost:9001`). The `createbuckets` service automatically creates the `hostelhub` bucket on first startup.
- **Production:** Compatible with AWS S3, Cloudflare R2, Google Cloud Storage, or self-hosted MinIO clusters.

---

## Docker Setup

### Validating Configuration

```bash
docker compose config
```

### Starting Services

```bash
docker compose up -d
```

### Stopping Services

```bash
docker compose down
```

### Resetting Volumes

```bash
docker compose down -v
```

---

## Development Commands

| Command                               | Description                                                              |
| :------------------------------------ | :----------------------------------------------------------------------- |
| `pnpm dev`                            | Starts the Next.js development server on port 3000                       |
| `pnpm --filter @hostelhub/worker dev` | Starts the BullMQ worker in development mode                             |
| `pnpm run lint`                       | Runs ESLint across all monorepo packages                                 |
| `pnpm run typecheck`                  | Runs TypeScript typecheck (`tsc --noEmit`) across all workspace packages |
| `pnpm run test`                       | Runs the Vitest test suites across all packages                          |
| `pnpm run bench:allocation`           | Executes the 8,000 × 8,000 resident matching algorithm benchmark         |
| `pnpm run format`                     | Runs Prettier across the codebase                                        |

---

## Build Commands

Build all monorepo packages and apps:

```bash
pnpm run build
```

This builds:

1. `@hostelhub/shared` -> `dist/`
2. `@hostelhub/domain` -> `dist/`
3. `@hostelhub/db` -> `dist/`
4. `@hostelhub/worker` -> `dist/`
5. `@hostelhub/web` -> Next.js production build (`.next/standalone`)

---

## Testing Commands

Run all automated unit and integration tests:

```bash
pnpm run test
```

Run tests for a specific workspace:

```bash
pnpm --filter @hostelhub/domain test
pnpm --filter @hostelhub/db test
pnpm --filter @hostelhub/web test
pnpm --filter @hostelhub/worker test
```

---

## Production Deployment Instructions

### 1. Containerized Deployment (Recommended)

1. Build production Docker images:
   ```bash
   docker build -f apps/web/Dockerfile -t hostelhub-web:latest .
   docker build -f apps/worker/Dockerfile -t hostelhub-worker:latest .
   ```
2. Deploy the containers with your container orchestrator (Kubernetes, AWS ECS, Docker Swarm, or Railway/Render).
3. Inject production environment variables via Kubernetes Secrets or your cloud secrets manager.

### 2. Standard Node.js Process Manager (PM2 / Systemd)

1. Set `NODE_ENV=production`.
2. Build the workspace: `pnpm run build`.
3. Start the Next.js standalone server:
   ```bash
   node apps/web/.next/standalone/apps/web/server.js
   ```
4. Start the worker process:
   ```bash
   node apps/worker/dist/index.js
   ```

---

## Security Notes & Vulnerability Reporting

- **Zero Plaintext Storage:** Questionnaires are encrypted with AES-256-GCM using per-institution encryption keys.
- **Audit Hash Chain:** Allocation transitions and approvals are logged in a forward-linked SHA-256 audit log.
- **No Production Secrets:** No secrets, database passwords, or private keys are tracked in version control.
- **Vulnerability Disclosure:** Please report security issues directly to the repository maintainer or institution security administrator.

---

## License

This project is licensed under the [MIT License](LICENSE).
