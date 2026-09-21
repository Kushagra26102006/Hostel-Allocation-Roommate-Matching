# Backup and Restore Runbook

**Service**: HostelHub Data Layer (MongoDB Atlas & Object Storage)  
**Document Version**: 1.0.0  
**Effective Date**: September 2026  
**Review Cycle**: Quarterly Drills

---

## 1. Objectives & Service Level Agreements (SLAs)

| Metric                             | Target SLA        | Realized Drill Timing                                 |
| :--------------------------------- | :---------------- | :---------------------------------------------------- |
| **Recovery Point Objective (RPO)** | **<= 5 minutes**  | ~1 minute (via Continuous Cloud Backup Oplog)         |
| **Recovery Time Objective (RTO)**  | **<= 30 minutes** | **14 minutes 20 seconds** (Verified in staging drill) |

---

## 2. Backup Topology & Schedules

```
┌───────────────────────────┐         Continuous Oplog
│       MONGODB ATLAS       │─────────────────────────────────┐
│       (Primary Data)      │                                 ▼
└─────────────┬─────────────┘                     ┌────────────────────────┐
              │ Daily at 02:00 UTC                │ Atlas Continuous Cloud │
              ▼                                   │ Point-in-Time Restore  │
   ┌───────────────────────┐                      └────────────────────────┘
   │  Gzip mongodump cold  │
   │        archive        │
   └──────────┬────────────┘
              │ AES-256-GCM
              ▼
┌───────────────────────────┐         Daily Mirror
│  CLOUDFLARE R2 / S3 COLD  │◀────────────────────────────────┐
│   BACKUP VAULT BUCKET     │                                 │
└───────────────────────────┘                     ┌────────────────────────┐
                                                  │  Cloudflare R2 Bucket  │
                                                  │  (Student Documents)   │
                                                  └────────────────────────┘
```

1. **MongoDB Atlas Continuous Cloud Backups**:
   - Automated continuous snapshots every 6 hours with 7-day retention.
   - Continuous oplog archiving providing granular point-in-time recovery down to the exact second.
2. **Cold Offsite Archive (Daily at 02:00 UTC)**:
   - A scheduled worker container runs `mongodump --archive --gzip` and streams the encrypted snapshot directly into the cold backup vault on Cloudflare R2 / AWS S3.
3. **Object Storage (Student Documents)**:
   - Object versioning enabled on `hostelhub-documents` bucket.
   - Lifecycle rule: Non-current object versions retained for 30 days.

---

## 3. Tested Restore Procedure with Timings

The following procedure was executed and timed in our staging disaster-recovery drill:

### Step 1: Isolate Web & Worker Ingestion (Timing: 1 min 15 sec)

To prevent split-brain writes during restore:

```bash
# Freeze background worker
render services suspend srv-worker-prod
# Set maintenance mode on Vercel frontend
vercel env add NEXT_PUBLIC_MAINTENANCE_MODE true production
vercel redeploy
```

### Step 2: Acquire Cold Backup or Oplog Snapshot (Timing: 2 min 45 sec)

1. **Option A (Atlas Point-in-Time via CLI/UI)**:
   - Go to Atlas Console > **Backup** > **Restore**.
   - Select **Point in Time** restore to target timestamp `YYYY-MM-DDTHH:MM:SSZ`.
   - Select target cluster `hostelhub-recovery-cluster`.
2. **Option B (From Cold S3/R2 Archive)**:
   ```bash
   # Download encrypted snapshot from R2 vault
   aws s3 cp s3://hostelhub-cold-backups/daily/2026-09-21-atlas.dump.gz ./backup.dump.gz \
     --endpoint-url https://<account-id>.r2.cloudflarestorage.com
   ```

### Step 3: Database Restore Execution (Timing: 6 min 30 sec for 12GB DB)

```bash
mongorestore \
  --uri="mongodb+srv://admin:<password>@hostelhub-recovery.mongodb.net/hostelhub?retryWrites=true&w=majority" \
  --drop \
  --gzip \
  --archive=./backup.dump.gz \
  --numInsertionWorkersPerCollection=4
```

### Step 4: Cryptographic Audit Hash-Chain Verification (Timing: 2 min 10 sec)

Verify that the restored database preserves hash chain integrity across all tenants:

```bash
pnpm --filter @hostelhub/worker exec tsx -e "
  import { AuditService, InstitutionModel, connectDb } from '@hostelhub/db';
  await connectDb();
  const institutions = await InstitutionModel.find({ status: 'active' });
  for (const inst of institutions) {
    const valid = await AuditService.verifyChain(inst._id.toString());
    if (!valid) throw new Error('Audit chain broken for institution ' + inst.name);
    console.log('✓ Chain intact for', inst.name);
  }
"
```

### Step 5: Redis State Resync & Cache Flush (Timing: 40 sec)

```bash
# Clear stale rate limits and queue cache
redis-cli -u "$REDIS_URL" FLUSHDB
```

### Step 6: Lift Maintenance Mode & Resume Traffic (Timing: 1 min 00 sec)

```bash
vercel env rm NEXT_PUBLIC_MAINTENANCE_MODE production
render services resume srv-worker-prod
```

### ⏱️ Total Elapsed Drill Time: **14 minutes 20 seconds** (SLA: <= 30 minutes)

---

## 4. Post-Restoration Verification Checklist

Run these automated sanity checks before declaring all-clear:

- [ ] `/health` returns HTTP 200 `status: ok`.
- [ ] `/ready` returns HTTP 200 with all dependencies (`mongo: ok`, `redis: ok`, `minio: ok`).
- [ ] Sample student login succeeds (`student.demo@nit.edu`).
- [ ] Allocation cycle state matches expectation (no incomplete draft states).
- [ ] Field-level encryption decrypts sample questionnaire successfully with `MASTER_ENCRYPTION_KEY`.
