# Deployment & Rollback Runbook

**Service**: HostelHub Platform  
**Target Environment**: Staging & Production  
**Document Version**: 1.0.0

---

## 1. Target Infrastructure Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT / BROWSER                          │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
       ┌─────────────────────────┐      ┌─────────────────────────┐
       │     VERCEL EDGE/CDN     │      │     CLOUDFLARE R2       │
       │   apps/web (Next.js 15) │      │  (Encrypted Documents)  │
       └────────────┬────────────┘      └────────────┬────────────┘
                    │                                │
                    ├─────────────────┐              │
                    ▼                 ▼              │
       ┌─────────────────────────┐   ┌───────────────┴─────────┐
       │   RENDER / FLY.IO /     │   │      MONGODB ATLAS      │
       │        RAILWAY          │──▶│   (Multi-Doc Tx Replica)│
       │  apps/worker (BullMQ)   │   └─────────────────────────┘
       └────────────┬────────────┘                 ▲
                    │                              │
                    ▼                              │
       ┌─────────────────────────┐                 │
       │    UPSTASH / REDIS      │─────────────────┘
       │  (Queues & Rate Limit)  │
       └─────────────────────────┘
```

| Component                | Target Platform               | Justification                                                                                                                                              |
| :----------------------- | :---------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend & Web API**   | **Vercel**                    | Global edge network, automatic preview deployments per pull request, zero-config Next.js 15 optimization, fast rollbacks.                                  |
| **Background Worker**    | **Render / Fly.io / Railway** | Persistent long-running Node.js process running BullMQ queues (allocations, notifications, audit verifier) with SIGTERM handling.                          |
| **Primary Database**     | **MongoDB Atlas**             | Managed replica set supporting multi-document ACID transactions (`session.startTransaction()`) required by atomic draft publishing and bed swap workflows. |
| **Cache & Queue Broker** | **Upstash Redis / Container** | Low-latency Redis with eviction protection, required by BullMQ (`maxRetriesPerRequest: null`).                                                             |
| **Object Storage**       | **Cloudflare R2 / MinIO**     | S3-compatible, zero egress fees, presigned private URLs for uploaded student identity documents.                                                           |

---

## 2. MongoDB Atlas Transaction Compatibility Notice

> [!IMPORTANT]
> **MongoDB Atlas Replica Set Verification**:
> HostelHub strictly requires multi-document ACID transactions for allocation publishing, waitlist promotion, and atomic bed swaps (`packages/db/src/connection.ts`).
>
> - **Atlas Tier Support**: All MongoDB Atlas tiers (including **M0 Free Tier**, **M2**, **M5**, and **M10+**) run as a **3-node replica set** and fully support multi-document transactions.
> - **Connection String Requirement**: The connection string MUST include `retryWrites=true&w=majority`:
>   ```
>   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/hostelhub?retryWrites=true&w=majority
>   ```
> - **Self-Hosted Staging**: If using self-hosted MongoDB for staging or testing instead of Atlas, MongoDB MUST be initiated as a single-node or multi-node replica set (`mongod --replSet rs0` followed by `rs.initiate()`). Standalone instances will fail transaction calls with `TransactionNumbers are only allowed on a replica set member or mongos`.

---

## 3. Fresh Clone to Working Staging Deployment

Follow these exact steps from a clean repository clone:

### Step 1: Clone and Install

```bash
git clone https://github.com/hostelhub/hostelhub.git
cd hostelhub
pnpm install --frozen-lockfile
```

### Step 2: Configure Environment Variables

Copy template and populate with staging credentials:

```bash
cp .env.example .env.local
```

Ensure the following staging values are populated:

- `MONGODB_URI`: Staging Atlas replica set connection string.
- `REDIS_URL`: Staging Upstash or container Redis URL.
- `AUTH_SECRET`: Run `openssl rand -base64 32` to generate a 32-byte secret.
- `MASTER_ENCRYPTION_KEY`: Run `openssl rand -hex 32` (64 hex characters).
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`: Cloudflare R2 staging bucket credentials.

### Step 3: Run Validation Suite Locally

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm openapi:check
```

### Step 4: Seed Initial Synthetic Staging Data

```bash
pnpm seed:synthetic
```

This idempotently initializes demo institution `NIT-DEMO`, sample hostels, room blocks, allocation cycles, and student demo accounts.

### Step 5: Deploy Frontend to Vercel (Staging)

1. Link project to Vercel:
   ```bash
   npx vercel link
   ```
2. Set Environment Variables in Vercel Dashboard or CLI:

   ```bash
   npx vercel env add MONGODB_URI staging
   npx vercel env add REDIS_URL staging
   npx vercel env add AUTH_SECRET staging
   npx vercel env add MASTER_ENCRYPTION_KEY staging
   ```

   ![Vercel Settings Configuration Placeholder](file:///Users/kushagra/Desktop/untitled%20folder%202/docs/images/vercel-config-placeholder.png)

3. Deploy preview/staging build:
   ```bash
   npx vercel deploy --prebuilt
   ```

### Step 6: Deploy Background Worker to Render / Fly.io (Staging)

1. **Using Render Blueprint / Docker**:
   - Create a Background Worker service referencing `apps/worker/Dockerfile`.
   - Set environment variables: `MONGODB_URI`, `REDIS_URL`, `MASTER_ENCRYPTION_KEY`, `ENCRYPTION_KEY_ID=v1`.
     ![Render Worker Settings Placeholder](file:///Users/kushagra/Desktop/untitled%20folder%202/docs/images/render-config-placeholder.png)

2. **Using Fly.io**:
   ```bash
   fly launch --dockerfile apps/worker/Dockerfile
   fly secrets set MONGODB_URI="..." REDIS_URL="..." MASTER_ENCRYPTION_KEY="..."
   fly deploy
   ```

### Step 7: Verify Staging Health & Readiness

Probe the live staging deployment:

```bash
curl -f https://staging.hostelhub.campus.edu/health
curl -f https://staging.hostelhub.campus.edu/ready
curl -f https://staging.hostelhub.campus.edu/metrics
```

Expected output:

- `/health`: `{"status":"ok","ts":"..."}` (HTTP 200)
- `/ready`: `{"status":"ok","deps":{"mongo":"ok","redis":"ok","minio":"ok"}}` (HTTP 200)

---

## 4. Production Promotion Workflow

Production deployments are gated behind GitHub Environments:

```
[PR merged to main]
        │
        ▼
[Staging Auto-Deploy] ──▶ [Smoke Tests & Probes Pass]
                                    │
                                    ▼
                      [GitHub Environment Gate]
                      (Requires Lead Reviewer Approval)
                                    │
                                    ▼
                          [Deploy to Production]
                                    │
                                    ▼
                       [Canary Health-Check Gate]
                           (Pass: Keep / Fail: Rollback)
```

1. Merges to `main` automatically deploy to staging.
2. Go to **Actions** > **Deployment Pipeline** in GitHub repository.
3. Click **Review Deployments** for the `production` environment.
4. Review release notes, diff, and staging verification logs.
5. Click **Approve and Deploy**.

---

## 5. Emergency Rollback Procedures

If the post-deployment health check fails or SEV-1 anomalies arise:

### 1. Instant Vercel Frontend Rollback (< 30 seconds)

```bash
# Roll back production alias to the previous stable deployment
vercel rollback --token=$VERCEL_TOKEN
```

Or in Vercel Dashboard:

- Go to **Deployments**.
- Locate previous green deployment.
- Click the three dots `...` > **Assign Domain to this deployment**.

### 2. Worker Rollback on Render / Fly.io (< 60 seconds)

- **Render**:
  - Open Render Dashboard > `hostelhub-worker` > **Deploys**.
  - Select previous successful deployment > click **Rollback to this deploy**.
- **Fly.io**:
  ```bash
  fly releases
  # Roll back to previous release version number (e.g., v42)
  fly releases rollback 42
  ```

### 3. Database Oplog Point-in-Time Restore (If Schema Corrupted)

Follow [`docs/runbooks/backup-restore.md`](file:///Users/kushagra/Desktop/untitled%20folder%202/docs/runbooks/backup-restore.md) to restore Atlas to point-in-time prior to deployment.
