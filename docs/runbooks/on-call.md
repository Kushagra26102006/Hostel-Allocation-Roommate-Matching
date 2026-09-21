# On-Call Basics & Incident Triage Runbook

**Audience**: On-call Primary & Secondary Engineers  
**System**: HostelHub Production Cluster  
**Document Version**: 1.0.0

---

## 1. On-Call Roles & Responsibilities

- **Primary On-Call**: First responder to automated alerts (Better Stack / UptimeRobot / Sentry). Acknowledges pages within **15 minutes**.
- **Secondary On-Call**: Backup responder if primary fails to acknowledge within SLA or during active SEV-1 incidents.
- **Incident Commander (IC)**: Escalation lead for high-severity customer-impacting outages (SEV-1/SEV-2).

---

## 2. Monitoring & Alerting Infrastructure

```
┌───────────────────────────┐     HTTP 200/503
│ UptimeRobot / BetterStack │────────────────────▶ /health & /ready probes
└─────────────┬─────────────┘
              │ PagerDuty / Telegram / Slack Webhook
              ▼
┌───────────────────────────┐     Stack Traces
│          SENTRY           │◀─────────────────── apps/web & apps/worker
└─────────────┬─────────────┘                     (PII Scrubbed)
              ▼
┌───────────────────────────┐     Scrape /metrics
│       GRAFANA CLOUD       │◀─────────────────── BullMQ queue depths
└───────────────────────────┘                     Run durations
```

---

## 3. High-Priority Alert Triage Cheatsheet

### Alert 1: `HostelHub_Readiness_Failing` (Severity: HIGH)

**Trigger**: `/ready` probe returned HTTP 503 for 2 consecutive checks.

1. **Check Dependency Breakdown**:
   ```bash
   curl -s https://hostelhub.campus.edu/ready | jq .
   ```
2. **If `mongo: "error..."`**:
   - Verify MongoDB Atlas status dashboard (https://status.mongodb.com/).
   - Check connection pool saturation in Atlas Metrics.
   - Verify IP Access List / Network Peering hasn't expired.
3. **If `redis: "error..."`**:
   - Check Upstash console or Redis container.
   - Test connectivity: `redis-cli -u "$REDIS_URL" ping`.
4. **If `minio: "error..."`**:
   - Check Cloudflare R2 / MinIO API credentials.

---

### Alert 2: `Queue_Depth_Exceeded` (Severity: MEDIUM / HIGH)

**Trigger**: `hostelhub_queue_jobs_count{queue="allocation-jobs",state="waiting"} > 50` for > 10m.

1. **Inspect Worker Health**:
   - Verify worker container is running: `render services list` or `fly status`.
   - Check worker logs for unhandled crashes:
     ```bash
     fly logs -a hostelhub-worker
     ```
2. **Scale Worker Replicas**:
   If legitimate batch traffic is causing the backlog:
   ```bash
   fly scale count 3 -a hostelhub-worker
   ```
3. **Inspect Stalled Jobs**:
   Access Redis CLI or BullMQ dashboard to inspect `failed` or `stalled` jobs.

---

### Alert 3: `auditchain.failed` Event (Severity: CRITICAL / SEV-1)

**Trigger**: BullMQ notification event with `type: "auditchain.failed"`.

1. **Follow Containment Protocol**:
   - Refer directly to [`docs/runbooks/incident-response.md`](file:///Users/kushagra/Desktop/untitled%20folder%202/docs/runbooks/incident-response.md) Scenario A.
   - Freeze active allocation cycles for the affected tenant.
   - Notify Incident Commander immediately.

---

### Alert 4: `Sentry_Error_Spike` (Severity: MEDIUM)

**Trigger**: New unhandled exception frequency > 20 errors/min.

1. Open Sentry Dashboard (https://sentry.io).
2. Group by `issue.id` and inspect the top stack trace.
3. Check release tag (`SENTRY_RELEASE`) to determine if a recent deployment caused regression.
4. If related to recent release, trigger instant rollback per [`docs/runbooks/deployment.md`](file:///Users/kushagra/Desktop/untitled%20folder%202/docs/runbooks/deployment.md).

---

## 4. Shift Handover Checklist

At the conclusion of each weekly rotation, outgoing and incoming engineers perform a handover:

- [ ] No unacknowledged or snoozed alerts in Better Stack / UptimeRobot.
- [ ] Review any SEV-2/SEV-3 incidents that occurred during the week.
- [ ] Review Sentry issue inbox for any newly emerging non-critical warnings.
- [ ] Verify backup verification tests passed without warnings.
- [ ] Transfer PagerDuty / on-call scheduling override.
