# HostelHub API Reference & Integration Guide

The HostelHub RESTful API adheres to OpenAPI 3.1 standards, RFC 7807 Problem Details for error handling, and strict tenant isolation via `x-institution-id` headers and NextAuth JWT sessions.

The complete machine-readable specification is maintained in:
👉 **[`docs/openapi.json`](../openapi.json)**

---

## 1. Authentication & Security Headers

All authenticated endpoints require either a signed session cookie (`hostelhub.session-token`) or an `Authorization: Bearer <API_KEY>` header.

```bash
# Example Headers for API Requests
Authorization: Bearer hh_live_9a8b7c6d5e4f...
x-institution-id: 66f000000000000000000000
Content-Type: application/json
```

---

## 2. Core Endpoint Workflows

### A. Student Application Submission (J1)

Create an application draft:

```bash
POST /api/v1/applications
Content-Type: application/json

{
  "cycle_id": "66f000000000000000000010"
}
```

_Response (`201 Created`):_

```json
{
  "_id": "66f000000000000000000020",
  "status": "draft",
  "version": 1
}
```

Submit application:

```bash
POST /api/v1/applications/66f000000000000000000020/submit
```

_Response (`200 OK`):_

```json
{
  "message": "Application submitted successfully",
  "reference_number": "APP-2026-NIT-0042",
  "submitted_at": "2026-09-21T10:00:00.000Z",
  "status": "submitted"
}
```

---

### B. Warden Manual Bed Override (J4, J9)

Moves an assigned student to another bed within an unapproved draft. Requires an `If-Match` header to enforce optimistic concurrency control:

```bash
POST /api/v1/drafts/66f000000000000000000030/override
If-Match: "1"
Content-Type: application/json

{
  "assignmentId": "asgn_001",
  "toBedId": "bed_102a",
  "reason": "Medical accommodation: student requires ground-floor placement.",
  "expectedVersion": 1
}
```

_Response on success (`200 OK`):_

```json
{
  "success": true,
  "version": 2,
  "overrideId": "ovr_001",
  "escalated": false,
  "escalationReasons": []
}
```

_Response on concurrency collision (`409 Conflict`):_

```json
{
  "type": "https://errors.hostelhub.edu/version-conflict",
  "title": "Version Conflict",
  "status": 409,
  "detail": "Draft has been modified by another staff member (current version: 2, expected: 1).",
  "code": "VERSION_CONFLICT"
}
```

---

### C. Vacate Bed and Trigger Dynamic Waitlist Promotion (J6)

Marks a bed vacated due to student withdrawal or room change, and evaluates the top waitlisted candidate:

```bash
POST /api/v1/waitlist/vacate
Content-Type: application/json

{
  "draft_id": "66f000000000000000000030",
  "bed_id": "bed_101b",
  "trigger": "withdrawal",
  "reason": "Student formally withdrew from degree programme",
  "policy_override": "auto_confirm"
}
```

_Response (`200 OK`):_

```json
{
  "success": true,
  "vacated_bed_id": "bed_101b",
  "promotion_result": {
    "action": "auto_promoted",
    "candidate": {
      "studentId": "stud_042",
      "name": "Rohan Patel",
      "position": 1
    }
  }
}
```

---

### D. Public Ed25519 Allocation Letter Verification (J7)

Public endpoint (rate-limited, no authentication required) for physical security guard verification:

```bash
GET /api/v1/verify/eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

_Response (`200 OK`):_

```json
{
  "valid": true,
  "status": "verified",
  "institutionName": "National Institute of Technology",
  "studentName": "Aarav Sharma",
  "rollNumber": "CS2026-001",
  "hostelName": "Aryabhata Hall",
  "roomNumber": "304",
  "bedNumber": "A",
  "verifiedAt": "2026-09-21T10:30:00.000Z"
}
```

---

## 3. RFC 7807 Error Response Standard

All API errors return standardized JSON problem details:

```json
{
  "type": "https://errors.hostelhub.edu/publish-gate-error",
  "title": "Publish Gate Error",
  "status": 422,
  "detail": "Cannot publish draft without a valid Maker-Checker ApprovalRecord.",
  "code": "BAD_REQUEST",
  "instance": "/api/v1/drafts/66f000000000000000000030/publish"
}
```
