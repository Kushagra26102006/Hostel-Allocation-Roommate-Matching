# HostelHub Backend Architecture

## Overview

HostelHub is designed as a **Modular Monolith** in strict TypeScript / Node.js / Express, MongoDB with Mongoose, Redis, and BullMQ.

### Key Architectural Tenets

1. **Multi-Tenant Isolation**: Every domain document and query enforces `institutionId`.
2. **Pure Allocation Engine**: Matching algorithms are pure functions isolated from HTTP requests.
3. **Deterministic Assignment**: PCG32 seeded PRNG, stable sorting, and input snapshot hashing guarantee identical results on re-runs.
4. **Governance Invariants**: Drafts must be submitted for review and approved before publication. Direct publication is prohibited.
5. **Audit Hash Chaining**: Append-only SHA-256 HMAC hash chains for all privileged actions.
6. **Privacy & Encryption**: Student lifestyle compatibility responses are encrypted with AES-256-GCM.

### Modules Map

- **M1 Inventory**: Hostels, blocks, floors, rooms, beds, occupancy summaries.
- **M2 Cycles & Applications**: Allocation cycles, applications, document verification, consents.
- **M3 Eligibility**: AST-based rule engine & policy enforcement.
- **M4 Preferences**: Multi-tiered student hostel/room rankings.
- **M5 Compatibility**: Consented questionnaire scoring, deal-breaker constraints, pairwise matching.
- **M6 Allocation Engine**: Deterministic Gale-Shapley, weighted soft scoring, bounded local search.
- **M7 Warden Review**: Overrides with mandatory reason logging, review submissions, and multi-tier approval.
- **M8 Waitlist**: Priority-ordered waitlists with hard constraint revalidation on promotion.
- **M9 Publication & Letters**: Draft publishing, signed QR-code PDF letter generation.
- **M10 Room Change**: Student room swap and transfer workflows.
- **M11 Appeals**: Grievance submissions with SLA auto-escalation.
- **M12 Notifications**: Multi-channel notifications (email, push, SMS, in-app).
- **M13 Reporting**: Occupancy, satisfaction, fairness, and cycle-time analytics.
