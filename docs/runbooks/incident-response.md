# Incident Response Runbook

**System**: HostelHub Multi-Tenant Allocation Platform  
**Document Version**: 1.0.0  
**Effective Date**: September 2026  
**Review Cycle**: Biannual

---

## 1. Incident Severity Matrix

| Level                | Definition                                                                                                                                                            | Response SLA | Escalation Target                                                                      |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------- | :------------------------------------------------------------------------------------- |
| **SEV-1 (Critical)** | Active data breach, cross-tenant data leakage, audit hash-chain break (`auditchain.failed`), system-wide allocation corruption, or compromised Master Encryption Key. | 15 minutes   | Incident Commander (IC), CTO, Chief Information Security Officer (CISO), Legal Counsel |
| **SEV-2 (High)**     | ClamAV detection of active malware upload wave, targeted DDoS / rate-limit exhaustion, partial role elevation bug, or third-party auth outage.                        | 30 minutes   | Incident Commander, Lead Backend Engineer, Security Engineer                           |
| **SEV-3 (Medium)**   | Isolated user authorization failure, single-file upload scan failure, non-critical dependency advisory, or minor CSP violation spike.                                 | 2 hours      | On-call Engineer, Product Lead                                                         |

---

## 2. Emergency Contacts & Roles

- **Incident Commander (IC)**: Responsible for commanding the incident call, orchestrating triage, approving destructive actions, and managing timelines.
- **Technical Lead (TL)**: Performs live forensics, executes emergency migrations or rollbacks, and coordinates codebase fixes.
- **Communications Officer (CO)**: Manages internal stakeholder updates and regulatory filings (e.g., CERT-In, data protection authorities).

---

## 3. Incident Containment Procedures

### Scenario A: Audit Chain Verification Failure (`auditchain.failed`)

An alert indicates that an institution's SHA-256 hash chain was broken or tampered with.

1. **Lock Allocation Cycles Immediately**:
   Run emergency lock script or CLI command to set all active drafts for that institution to locked:
   ```bash
   # Emergency cycle freeze for tenant
   pnpm --filter @hostelhub/db exec tsx -e "
     import { AllocationCycleModel, connectDb } from '@hostelhub/db';
     await connectDb();
     await AllocationCycleModel.updateMany({ institution_id: '$INSTITUTION_ID' }, { status: 'locked' });
     console.log('Cycles frozen.');
   "
   ```
2. **Inspect Broken Event**:
   Extract broken sequence number and stored previous hash from the alert payload.
3. **Database Audit Query**:
   ```javascript
   db.audit_logs.find({
     institution_id: ObjectId("$INSTITUTION_ID"),
     sequence: { $gte: $BROKEN_SEQ - 1, $lte: $BROKEN_SEQ + 1 },
   });
   ```
4. **Determine Root Cause**:
   - Out-of-band direct database edit (malicious insider or DB breach)
   - Clock drift or concurrency race condition
5. **Remediation**:
   - If unauthorized DB mutation occurred, isolate database credentials immediately.
   - Restore database from point-in-time oplog before the tampered sequence.
   - Re-run `AuditService.verifyChain("$INSTITUTION_ID")`.

---

### Scenario B: Compromised Master Encryption Key or AUTH_SECRET

If `MASTER_ENCRYPTION_KEY` or `AUTH_SECRET` is suspected leaked (e.g. committed to public repository or leaked through debug log):

1. **Step 1: Rotate `AUTH_SECRET` (Invalidate All Active Sessions)**
   - Generate a new 32-byte secret:
     ```bash
     openssl rand -base64 32
     ```
   - Update `AUTH_SECRET` environment variable in deployment infrastructure (Kubernetes Secret / Doppler / AWS SSM).
   - Perform rolling restart of `apps/web`.
   - All active user sessions are immediately invalidated, forcing re-authentication.

2. **Step 2: Key Rotation for Field-Level Encryption (`MASTER_ENCRYPTION_KEY`)**
   - HostelHub domain supports multi-version key rings via `ENCRYPTION_KEY_ID`.
   - Set the new key as current in secret manager:
     - Old: `ENCRYPTION_KEY_ID=v1`, `MASTER_ENCRYPTION_KEY_v1=...`
     - New: `ENCRYPTION_KEY_ID=v2`, `MASTER_ENCRYPTION_KEY_v2=...`
   - Run re-encryption migration:
     ```bash
     pnpm --filter @hostelhub/db exec tsx scripts/rotate-encryption-keys.ts --old-version=v1 --new-version=v2
     ```
   - Verify all student PII decrypts successfully with v2.
   - Deprecate and delete v1.

---

### Scenario C: ClamAV Malware Quarantine Trigger

When an uploaded file is flagged as `status: "quarantined"`:

1. **Verify Quarantine Isolation**:
   Confirm the document cannot be accessed or downloaded by student or warden.
2. **Inspect Virus Signature**:
   Check metadata field `virus_signature` in `application_documents` collection.
3. **Blacklist / Invalidate Uploader**:
   If coordinated attack is detected, temporarily freeze the student account and examine related IPs:
   ```bash
   pnpm --filter @hostelhub/db exec tsx -e "
     import { UserModel, connectDb } from '@hostelhub/db';
     await connectDb();
     await UserModel.updateOne({ _id: '$STUDENT_ID' }, { status: 'suspended' });
   "
   ```
4. **Purge Storage**:
   Purge the infected object from S3/MinIO quarantine bucket after forensics snapshot.

---

### Scenario D: Suspected Data Breach / Cross-Tenant Exfiltration

1. **Isolate Compromised Node or Tenant**:
   If an institution's data is being queried by unauthorized actors:
   - Identify offending IP / User ID in access logs (`X-Request-Id`).
   - Revoke Redis session tokens for user:
     ```bash
     redis-cli keys "session:$USER_ID*" | xargs redis-cli del
     ```
   - Apply WAF IP block on Cloudflare / AWS WAF for attacking CIDRs.
2. **Preserve Forensic Evidence**:
   - Export access logs for target tenant:
     ```bash
     docker logs hostelhub-web-1 --since "4h" | grep "$INSTITUTION_ID" > incident-logs-$TIMESTAMP.json
     ```
   - Do NOT reboot or destroy containers before memory/disk forensics if root compromise is suspected.

---

## 4. Mandatory Regulatory Compliance & Notification

Under India's **Digital Personal Data Protection (DPDP) Act 2023** and **CERT-In Cyber Security Directions**:

1. **CERT-In Reporting Window**:
   Cyber security incidents involving personal data breaches or unauthorized access to systems must be reported to **CERT-In** (incident@cert-in.org.in) within **6 hours** of becoming aware.
2. **Data Principal Notification**:
   If breach affects student PII (passwords, identity documents, phone numbers):
   - Notify Data Protection Board of India (DPBI).
   - Draft and dispatch email notifications to impacted students and university registrars within 72 hours containing:
     - Nature and extent of compromised data
     - Measures taken to contain and mitigate the risk
     - Recommended precautions (password resets, monitoring accounts)
     - Contact details of HostelHub Data Protection Officer (DPO).

---

## 5. Post-Mortem & Blameless Root Cause Analysis (RCA)

Within 48 hours of resolving any SEV-1 or SEV-2 incident:

1. **Hold Post-Mortem Meeting**:
   Attendees: Incident Commander, Technical Lead, Product Lead, impacted stakeholders.
2. **RCA Template Structure**:
   - **Summary**: Concise description of what happened and business impact.
   - **Timeline (UTC)**: Second-by-second chronology from initial trigger to resolution.
   - **Root Cause**: Deep 5-Whys analysis explaining technical failure mode and why automated tests didn't catch it.
   - **Action Items**: Preventative engineering tasks assigned with Jira tickets and due dates within 14 days.
