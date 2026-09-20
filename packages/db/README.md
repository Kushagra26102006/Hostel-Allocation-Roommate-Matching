# @hostelhub/db

Multi-tenant database foundation for HostelHub built with Mongoose, replica-set transactions, optimistic concurrency control, cursor pagination, and tamper-evident cryptographic audit logs.

## Architectural Boundaries

### ⚠️ Strict Model Import Boundary

Direct use of Mongoose models (`UserModel`, `InstitutionModel`, `AuditEntryModel`) outside the repository layer is **prohibited** and enforced via ESLint rule (`no-restricted-imports`).

All application business logic and routes must access database records strictly through:

- `BaseRepository<TDoc>` (or subclasses like `UserRepository`) with `.withTenant(institutionId)`
- `InstitutionRepository`
- `AuditService`

### Optimistic Concurrency

Tenant schemas include an auto-incrementing numeric `version` field. When updating documents, use:

```ts
await userRepo.updateWithVersion(userId, currentVersion, {
  $set: { name: "Updated Name" },
});
```

If the version has drifted, a `VersionConflictError` will be thrown.

### Append-Only Cryptographic Audit Log

Every audit record is cryptographically linked to the previous entry using SHA-256:
$$\text{hash}_n = \text{SHA256}(\text{hash}_{n-1} + \text{canonicalJson}(\text{entry}_n))$$

Schema hooks block all updates and deletions (`updateOne`, `updateMany`, `deleteOne`, `deleteMany`, etc.).
`AuditService.verifyChain(institutionId)` recomputes the entire chain and detects any tampering or sequence gaps.
