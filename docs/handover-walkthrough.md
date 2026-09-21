# HostelHub Engineering Handover & Comprehensive Demo Script (60–90 Minutes)

This document provides a turnkey, minute-by-minute demonstration script for onboarding a new engineer, presenting to institutional leadership, or walking auditors through the complete capabilities of HostelHub.

---

## Preparation & Prerequisites (T - 5 Minutes)

1. **Start Local Infrastructure:**
   ```bash
   pnpm run infra:up
   ```
2. **Seed Deterministic Synthetic Dataset (Seed 42):**
   ```bash
   pnpm seed:synthetic --seed 42 --applicants 100 --beds 100 --reset
   ```
3. **Start Development Server:**
   ```bash
   pnpm dev
   ```
   _Open browser tabs at `http://localhost:3000`._

---

## Minute-by-Minute Script

### Act I: Architecture, Tech Stack & Security Baseline (00:00 – 10:00)

- **Goal:** Introduce the monorepo architecture, design philosophy, and security posture.
- **Narrative:**
  - "HostelHub is a Next.js 15, TypeScript, MongoDB, and Redis monorepo engineered to eliminate human bias in university residential allocation."
  - Highlight pnpm workspaces: `packages/domain` (pure mathematical solver), `packages/db` (Mongoose schema with tenant isolation), `packages/shared` (types and permissions), `apps/web` (Next.js app router), `apps/worker` (BullMQ async processor).
- **Exact Clicks / Actions:**
  1. Show `packages/domain/src/allocation/galeShapley.ts` — pure functions, zero database coupling.
  2. Show `packages/shared/src/permissions.ts` and `docs/roles-permissions.md`.
  3. Open terminal and run `pnpm typecheck && pnpm lint` to demonstrate 100% type safety and lint cleanliness.

---

### Act II: Student Journey — Application, Ranking & Compatibility (10:00 – 25:00)

- **Persona:** `Aarav Sharma` (`student.demo@nit.edu`)
- **Exact Clicks:**
  1. Visit `http://localhost:3000/login`. Enter email `student.demo@nit.edu`, password `Password123!`.
  2. Visit `/applications/new`. Walk through the 5-step stepper:
     - **Profile:** Show real-time pincode auto-fill and hometown distance calculation.
     - **Documents:** Drag and drop a sample PDF; show the simulated ClamAV malware scan turning green.
     - **Preferences:** Rank hostel towers (Tagore 1st, Kalam 2nd, Raman 3rd).
     - **Review & Submit:** Disconnect Wi-Fi / simulate offline mode in DevTools to show the **Offline Draft Synchronization Banner** with IndexedDB persistence. Reconnect and click **Submit Application**.
  3. Visit `/roommate`:
     - Click **Questionnaire**. Complete the 7-dimension slider cards. Show how deal-breakers work.
     - Click **Privacy & Encryption**. Explain the AES-256-GCM envelope encryption. Demonstrate the JSON data export and the **Delete & Revoke** confirmation modal.

---

### Act III: Administrative Operations — Inventory & Cycle Setup (25:00 – 40:00)

- **Persona:** `Vikram Singh` (`admin.hostel@nit.edu` - Hostel Admin, with MFA)
- **Exact Clicks:**
  1. Log in at `/login` with MFA. Enter 6-digit TOTP from authenticator.
  2. Navigate to `/staff/admin/inventory`:
     - Click **Inventory Tree** to expand Hostels ──► Floors ──► Rooms ──► Beds.
     - Switch to **Occupancy Heat Map** to show real-time bed capacity visualisations.
     - Click **Import CSV** to show the 4-step bulk import wizard with dry-run validation.
  3. Navigate to `/staff/admin/cycles`:
     - Open the **Cycle Wizard**.
     - Review quota seat capacities ($SC: 15\%, ST: 7.5\%, OBC: 27\%, EWS: 10\%$).
     - Trigger an **Allocation Run**. Point out the live Server-Sent Events (SSE) progress bar moving through Freeze ──► Eligibility ──► Matching ──► Compatibility ──► Invariant Check.

---

### Act IV: Warden Review, Bed Map & Concurrency Conflict (40:00 – 55:00)

- **Persona:** `Dr. Rajesh Kumar` (`warden.demo@nit.edu` - Warden)
- **Exact Clicks:**
  1. Open `/staff/warden/review/[id]`.
  2. Inspect the **Interactive Bed Map**: show room occupancy indicators, accessible room badges, and roommate harmony scores.
  3. **Execute Manual Override:** Click Bed 101A. Click **Manual Override**. Move student to Bed 102A. Type reason: `"Medical recommendation for ground floor access"`. Submit.
  4. **Demonstrate Concurrency Conflict (J9):**
     - Explain the `If-Match` optimistic concurrency header.
     - Open a second incognito browser representing Warden 2 attempting to edit the same bed at version 1.
     - Show the resulting `409 Version Conflict` alert dialog preventing blind overwrites.
  5. Click **Submit for Approval** to transition the draft to `READY_FOR_APPROVAL`.

---

### Act V: Maker-Checker Ceremony, Publication & Verification (55:00 – 70:00)

- **Persona:** `Prof. Sunita Verma` (`chief.warden@nit.edu` - Chief Warden)
- **Exact Clicks:**
  1. Switch to Chief Warden account.
  2. Open the draft review console. Review the **Diff Summary** showing every modification made by the block warden.
  3. Click **Approve Draft**. Add formal approval comment.
  4. Click **Publish Allocation**. Show how the four protection layers guarantee an unapproved draft can never be published.
  5. Switch back to student Aarav (`/room`):
     - Show the celebratory **Key Card Flip** animation revealing the room assignment.
     - Click **Download Letter** to open the generated allotment letter.
     - Copy the verification token or scan the QR code.
     - Open `http://localhost:3000/verify/<token>` to demonstrate public **Ed25519 digital signature verification**.
  6. Click **File an Appeal** on `/room` to file an appeal. Demonstrate how the controllable clock advances past 72 hours, triggering automatic escalation to the Chief Warden.

---

### Act VI: Dynamic Waitlist & Bed Vacating (70:00 – 80:00)

- **Persona:** `Dr. Rajesh Kumar` (`warden.demo@nit.edu`)
- **Exact Clicks:**
  1. Navigate to `/staff/warden/waitlist`.
  2. View the sorted queue of waitlisted candidates.
  3. Click **Mark Bed Vacated**. Choose Bed 101B and select reason `"Student withdrawn from university"`.
  4. Click **Vacate & Promote**.
  5. Show the immediate notification: _"Bed vacated: student promoted automatically under auto_confirm policy."_
  6. Verify room occupancy reconciles instantly.

---

### Act VII: Cryptographic Audit Chain, Observability & Conclusion (80:00 – 90:00)

- **Persona:** `Prof. Harpreet Kaur` (`dean.welfare@nit.edu` - Dean of Student Welfare)
- **Exact Clicks:**
  1. Log in as Dean.
  2. Navigate to the executive analytics and audit dashboard.
  3. Demonstrate the **Cryptographic Audit Hash Chain**: explain how each override and approval hash links back to genesis:
     $$H_i = \text{SHA256}(H_{i-1} \parallel \text{CanonicalJSON}(E_i))$$
  4. Run the automated chain integrity verification showing 0 anomalies.
  5. Visit `/health` and `/ready` to show live uptime probes and `/api/v1/metrics` for Prometheus metrics.
  6. Open floor for engineering Q&A.
