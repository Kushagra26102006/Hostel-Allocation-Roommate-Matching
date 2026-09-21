# ADR 0004 — Cryptographic Audit Hash Chain

**Date:** 2026-09-20  
**Status:** Accepted  
**Deciders:** Security & Compliance Team

---

## Context

Residential allocation systems in educational institutions face allegations of administrative tampering, retroactive bed reassignment, and clandestine backroom overrides. Traditional relational database audit logs (storing `created_at`, `user_id`, and `action`) can be altered by database administrators or compromised credentials without leaving a trace.

HostelHub requires an **append-only, mathematically tamper-evident audit record** that provides cryptographic proof of every administrative intervention.

---

## Decision

We implement a **SHA-256 Forward-Linked Cryptographic Hash Chain** implemented via `AuditService` in `packages/db/src/services/audit.service.ts`.

```
[Genesis Block]
      ↓
[Audit Entry 1] ─── SHA256(Genesis_Hash || Event_1) ──► Hash_1
      ↓
[Audit Entry 2] ─── SHA256(Hash_1 || Event_2)        ──► Hash_2
      ↓
[Audit Entry 3] ─── SHA256(Hash_2 || Event_3)        ──► Hash_3
```

### 1. Hash Formula & Invariant

For every new audit entry $i$ within an institution:
$$H_i = \text{SHA256}\left( H_{i-1} \mathbin{\Vert} \text{CanonicalJSON}(E_i) \right)$$
Where:

- $H_{i-1}$ is the hash of the immediately preceding audit entry (or the institution's Genesis Hash for the first entry).
- $E_i$ is the canonicalized event payload:
  ```json
  {
    "action": "DRAFT_ASSIGNMENT_OVERRIDE",
    "actor": { "user_id": "usr_warden_01", "email": "warden@nit.edu", "roles": ["warden"] },
    "target": { "draft_id": "draft_42", "bed_id": "bed_101b" },
    "timestamp": "2026-09-21T10:00:00.000Z",
    "reason": "Medical recommendation for ground floor access"
  }
  ```
- Canonical JSON uses deterministic key sorting to eliminate JSON serialization ambiguities.

### 2. Guardrails & Immutability

- **Database Level:** The `audit_logs` collection permits only `insert` operations. Updates and deletions are rejected by Mongoose schema pre-hooks.
- **Verification API:** The system provides an automated audit verification function `verifyChain(institutionId)` that walks the chain from genesis to the head, recalculating hashes. Any modification, deletion, or reordering of a past entry immediately breaks the cryptographic continuity and pinpoints the exact tampered index.

---

## Consequences

### Positive

- **Indisputable Audit Trail:** Any warden override, chief warden approval, or bed vacation is permanently bound to the actor's identity and timestamp.
- **Independent Verification:** The Dean of Student Welfare or external auditors can verify the entire institutional log with a single click.

### Negative / Trade-offs

- Writing audit entries requires locking or monotonic sequence numbering per institution to prevent parallel branch forks. In high-concurrency scenarios, entries are serialized per tenant using Redis locks.
