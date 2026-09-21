# ADR 0003 — Cryptographic Storage and Key Rotation

**Date:** 2026-09-20  
**Status:** Accepted  
**Deciders:** Security & Architecture Team

---

## Context

HostelHub collects sensitive student personal data (sleep routine, dietary habits, medical accessibility requirements, income documents) and issues legally binding housing allotment letters. Under the **Digital Personal Data Protection (DPDP) Act 2023** and university compliance regulations:

1. Sensitive behavioral questionnaire responses must never sit in plaintext in the database.
2. Allocation letters must be verifiable offline and by physical gate security via QR code without exposing database credentials.
3. Cryptographic keys must support periodic rotation without invalidating previously issued valid letters or breaking existing encrypted records.

---

## Decision

We implement a two-tier cryptographic architecture:

```
[Student Sensitive Data]  ──► [AES-256-GCM Envelope Encryption] ──► [Encrypted Ciphertext in DB]
                                      ↑
                             Key Version Header (kid: v1, v2)

[Allotment Letter PDF]    ──► [Ed25519 Asymmetric Signature]   ──► [QR Code Token on Letter]
                                      ↑                                       ↓
                             Private Signing Key               [Public Key Verification Portal]
```

### 1. Symmetric Data-at-Rest Encryption (AES-256-GCM)

- **Algorithm:** Authenticated AES-256-GCM with a random 96-bit Initialization Vector (IV) and 128-bit authentication tag.
- **Envelope Format:**
  $$\text{Payload} = \text{kid} \mathbin{\Vert} \text{iv} \mathbin{\Vert} \text{ciphertext} \mathbin{\Vert} \text{auth\_tag}$$
- Ensures confidentiality, data integrity, and tamper detection.

### 2. Asymmetric Digital Signatures (Ed25519)

- **Algorithm:** Ed25519 (RFC 8032 Edwards-curve Digital Signature Algorithm).
- **Use Case:** Allocation letters contain a digitally signed JWT token encoded in a QR code.
- **Verification:** The public key is exposed on `/api/v1/verify/[token]` and static public jwks endpoints. Physical gatekeepers scan the QR code to verify validity without requiring database access or network authentication.

### 3. Key Rotation Protocol

- Keys are versioned with a unique Key ID (`kid`), e.g., `key-2026-q1`, `key-2026-q2`.
- **Dual-Verification Window:**
  - When rotating keys, the new key becomes active for _writing_ new records and signing new letters.
  - The previous key is retained in the keystore in _read-only verification_ mode for 90 days.
  - Background migration scripts re-encrypt existing records using the active key lazily.
- Keys are provisioned via environment variables (`ENCRYPTION_KEY`, `LETTER_SIGNING_PRIVATE_KEY`) or cloud KMS.

---

## Consequences

### Positive

- **Database Dump Immunity:** Even with unauthorized read access to MongoDB, student compatibility questionnaires and sensitive survey records remain encrypted with AES-256-GCM.
- **Forged Letter Prevention:** Allocation passes cannot be altered or fabricated because the digital signature will fail verification on `/verify`.
- **Zero-Downtime Rollover:** Rotation does not invalidate existing issued letters.

### Negative / Trade-offs

- CPU overhead for symmetric decryption during compatibility vector batch processing. Benchmarks show < 5 ms overhead for 100 student pairings.
