# Role-Based Access Control (RBAC) Permissions Matrix

> **Auto-generated document** from [`packages/shared/src/permissions.ts`](../packages/shared/src/permissions.ts).
> Do not edit manually. Run `pnpm run generate:permissions-doc` to update.

## Overview of Roles

| Role               | Description                       | Scope                                                                                                  |
| :----------------- | :-------------------------------- | :----------------------------------------------------------------------------------------------------- |
| **`student`**      | Resident / Applicant student      | Own profile, application, questionnaire, results, room changes, appeals                                |
| **`warden`**       | Residential block warden          | Assigned hostel drafts, bed map overrides, waitlist promotions                                         |
| **`chief_warden`** | Head of campus residence welfare  | All hostels, escalated overrides, maker-checker approval, draft publication, appeals                   |
| **`hostel_admin`** | Administrative operations manager | Inventory CSV imports, cycle setup, eligibility policies, algorithm run trigger, document verification |
| **`dean`**         | Dean of Student Welfare (DoSW)    | Read-only macro analytics, audit hash chain verification, drafts inspection                            |
| **`sys_admin`**    | Platform system administrator     | Engine weights, user management, feature flags, API keys, webhooks, system audit                       |

## Complete Capability Permission Matrix

| Capability                      | Description                                             | `student` | `warden` | `chief_warden` | `hostel_admin` | `dean` | `sys_admin` |
| :------------------------------ | :------------------------------------------------------ | :-------: | :------: | :------------: | :------------: | :----: | :---------: |
| `application:own`               | Create, edit, and submit own hostel application         |    ✅     |    ❌    |       ❌       |       ❌       |   ❌   |     ❌      |
| `preferences:own`               | Rank hostel and room type preferences                   |    ✅     |    ❌    |       ❌       |       ❌       |   ❌   |     ❌      |
| `questionnaire:own`             | Complete or delete compatibility questionnaire          |    ✅     |    ❌    |       ❌       |       ❌       |   ❌   |     ❌      |
| `result:own`                    | View assigned bed, download letter & access QR pass     |    ✅     |    ❌    |       ❌       |       ❌       |   ❌   |     ❌      |
| `room_change:request`           | Submit mutual swap or room transfer request             |    ✅     |    ❌    |       ❌       |       ❌       |   ❌   |     ❌      |
| `appeal:submit`                 | Lodge an allocation grievance to appeals committee      |    ✅     |    ❌    |       ❌       |       ❌       |   ❌   |     ❌      |
| `hostel:review_own`             | View bed maps & assignments in assigned hostel          |    ❌     |    ✅    |       ✅       |       ❌       |   ❌   |     ❌      |
| `allocation:override_own`       | Move student bed with mandatory audit reason            |    ❌     |    ✅    |       ✅       |       ❌       |   ❌   |     ❌      |
| `allocation:approve_own`        | Provide Maker approval on draft allocation              |    ❌     |    ✅    |       ✅       |       ❌       |   ❌   |     ❌      |
| `allocation:publish_own`        | Publish approved draft to provisional list              |    ❌     |    ✅    |       ✅       |       ❌       |   ❌   |     ❌      |
| `waitlist:manage_own`           | Review waitlist candidates & vacate beds                |    ❌     |    ✅    |       ✅       |       ❌       |   ❌   |     ❌      |
| `decisions:manage_own`          | Record warden review determinations                     |    ❌     |    ✅    |       ✅       |       ❌       |   ❌   |     ❌      |
| `hostel:review_all`             | View bed maps across all campus residences              |    ❌     |    ❌    |       ✅       |       ❌       |   ❌   |     ❌      |
| `allocation:escalated_approval` | Two-person rule approval on escalated overrides         |    ❌     |    ❌    |       ✅       |       ❌       |   ❌   |     ❌      |
| `allocation:run`                | Execute Gale-Shapley matching algorithm run             |    ❌     |    ❌    |       ✅       |       ✅       |   ❌   |     ❌      |
| `appeals:decide`                | Adjudicate formal student housing appeals               |    ❌     |    ❌    |       ✅       |       ❌       |   ❌   |     ❌      |
| `inventory:manage`              | CRUD operations on hostels, blocks, floors, rooms, beds |    ❌     |    ❌    |       ❌       |       ✅       |   ❌   |     ❌      |
| `cycles:manage`                 | Create, configure, and schedule allocation cycles       |    ❌     |    ❌    |       ❌       |       ✅       |   ❌   |     ❌      |
| `policy:rules`                  | Configure AST DSL eligibility policies and rules        |    ❌     |    ❌    |       ❌       |       ✅       |   ❌   |     ❌      |
| `document:verify`               | Approve or reject student uploaded documents            |    ❌     |    ❌    |       ❌       |       ✅       |   ❌   |     ❌      |
| `analytics:read`                | View executive allocation reports & equity charts       |    ❌     |    ❌    |       ❌       |       ❌       |   ✅   |     ❌      |
| `audit:read`                    | Inspect append-only cryptographic audit chain           |    ❌     |    ❌    |       ❌       |       ❌       |   ✅   |     ✅      |
| `drafts:read`                   | Inspect provisional allocation drafts across campus     |    ❌     |    ❌    |       ❌       |       ❌       |   ✅   |     ❌      |
| `weights:configure`             | Tune Multi-Criteria optimization weights                |    ❌     |    ❌    |       ❌       |       ❌       |   ❌   |     ✅      |
| `users:manage`                  | Provision staff accounts and user directory             |    ❌     |    ❌    |       ❌       |       ❌       |   ❌   |     ✅      |
| `roles:manage`                  | Assign or revoke staff operational roles                |    ❌     |    ❌    |       ❌       |       ❌       |   ❌   |     ✅      |
| `feature_flags:manage`          | Toggle system capabilities and feature flags            |    ❌     |    ❌    |       ❌       |       ❌       |   ❌   |     ✅      |
| `api_keys:manage`               | Create and revoke machine-to-machine API keys           |    ❌     |    ❌    |       ❌       |       ❌       |   ❌   |     ✅      |
| `webhooks:manage`               | Configure institutional webhook dispatch endpoints      |    ❌     |    ❌    |       ❌       |       ❌       |   ❌   |     ✅      |

## Multi-Role Resolution Strategy

When a user holds multiple roles (e.g. `['warden', 'hostel_admin']`), permissions are evaluated additively using `hasPermission(roles, capability)`:

- If **any** of the assigned roles grants the required capability, the operation is **permitted**.
- If **none** of the assigned roles grants the capability, the operation returns `403 Forbidden`.
- Institutional scoping (`institution_id`) is strictly enforced regardless of granted roles.
