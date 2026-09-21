# ADR 0006 — Deployment Architecture and Container Strategy

**Date:** 2026-09-20  
**Status:** Accepted  
**Deciders:** DevOps & Infrastructure Team

---

## Context

HostelHub consists of a user-facing Next.js 15 web application (`@hostelhub/web`) and a background asynchronous job processor (`@hostelhub/worker`). The deployment setup must:

1. Support zero-downtime rolling updates.
2. Provide 100% environment parity between local developer environments, CI pipelines, staging, and production.
3. Decouple long-running CPU-intensive allocation calculations and scheduled cron jobs from HTTP request threads.

---

## Decision

We adopt **Multi-Stage Containerized Micro-Deployments** coordinated via GitHub Actions CI/CD:

```
[GitHub PR] ──► [CI Gate: Lint/Typecheck/Test/Audit/Coverage/Build]
                       │
                       ▼
[Merge to main] ──► [Build Multi-Stage Docker Images (web & worker)]
                       │
                       ▼
                 [Auto-Deploy to Staging Environment]
                       │
                       ▼
                 [Manual Approval Gate]
                       │
                       ▼
                 [Deploy to Production] ──► [Health Check Gate: /health & /ready]
                                                ├── Success: Traffic Shift
                                                └── Failure: Instant Rollback
```

### 1. Dual Container Images

- **`apps/web/Dockerfile`:** Next.js standalone server with static asset bundling. Serves HTTP API routes, Server Actions, and client UI.
- **`apps/worker/Dockerfile`:** Lightweight Node.js 20 runtime executing BullMQ workers for background jobs (SLA timers, notification dispatches, allocation calculations).

### 2. Infrastructure Parity via Docker Compose

- A standard `docker-compose.yml` provides:
  - **MongoDB 7.0:** Database engine with replica set configuration for transactions.
  - **Redis 7.2:** Cache, rate-limiting, and BullMQ queue backend.
  - **MinIO:** S3-compatible private object storage for student uploads.
  - **ClamAV:** Malware scan daemon on port 3310.
- Command `pnpm run infra:up` spins up all supporting infrastructure locally in seconds.

### 3. Pipeline Safeguards

- Coverage gate enforces at least 70% branch/statement coverage across domain and service code.
- Gitleaks scans every commit for leaked secrets.
- Production deploys run automated synthetic probes (`/health` and `/ready`); if unready within 60 seconds, deployment cancels and initiates rollback.

---

## Consequences

### Positive

- **Fault Isolation:** Memory-intensive allocation benchmarks or queue surges cannot crash the user-facing web server.
- **Reproducibility:** Docker images built and validated in CI are pushed directly to staging and production without re-compilation.

### Negative / Trade-offs

- Two separate container images must be built and maintained in the monorepo.
