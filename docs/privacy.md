# HostelHub Privacy Policy, Data Retention & Third-Party Disclosure Register

**Effective Date:** September 2026  
**Compliance Standard:** Digital Personal Data Protection (DPDP) Act 2023 (India) & Global Privacy Standards

---

## 1. Principles of Data Processing

HostelHub processes student personal data strictly based on **Purpose Limitation, Data Minimisation, Confidentiality, and Storage Limitation**. Personal information collected during accommodation allocation is used exclusively for evaluating room compatibility, determining statutory quota eligibility, and assigning residential facilities.

---

## 2. Explicit Consent Texts & User Notices

### A. Application Registration & Profile Processing Consent

> _"I hereby provide informed and unambiguous consent to the University and Hostel Administration to process my academic, demographic, home location, and uploaded verification documents for the sole purpose of evaluating hostel eligibility and room assignment for the current academic year. I understand that my permanently stored data is protected under university IT policies."_

### B. Roommate Compatibility Questionnaire Consent (Optional Opt-In)

> _"I freely consent to answer the 7-dimension Lifestyle & Roommate Harmony Survey (covering sleeping hours, study routines, room tidiness, and noise preferences). I acknowledge that:_
>
> 1. _My survey answers are encrypted with AES-256-GCM prior to storage._
> 2. _My individual answers are never disclosed in plaintext to other students._
> 3. _Only aggregate compatibility scores (e.g. '94% Match') and mutual agreement notes are visible to assigned roommates._
> 4. _I hold the absolute right to export my data in JSON format or trigger permanent hard deletion and withdrawal anytime via the Privacy Centre."_

---

## 3. Data Retention & Archival Policies

| Category of Data                    | Storage Medium                      | Retention Period                         | Deletion / Purging Method                                                                |
| :---------------------------------- | :---------------------------------- | :--------------------------------------- | :--------------------------------------------------------------------------------------- |
| **Unsubmitted Application Drafts**  | MongoDB / IndexedDB                 | 30 days after application window close   | Automated background purging job                                                         |
| **Active Allocation Assignments**   | MongoDB (`allocation_assignments`)  | Active degree duration + 1 academic year | Anonymised archival; student names replaced with pseudonymous hashes                     |
| **Uploaded Verification Documents** | MinIO / AWS S3 (Private Bucket)     | 180 days following final appeal closure  | Cryptographic erasure of S3 objects and database metadata                                |
| **Compatibility Survey Vectors**    | MongoDB (`compatibility_responses`) | Current academic cycle                   | Instant hard deletion upon student click in Privacy Centre; auto-purged on cycle archive |
| **Cryptographic Audit Hash Chain**  | MongoDB (`audit_logs`)              | 7 years (statutory audit requirement)    | Read-only append-only cold storage                                                       |

---

## 4. Third-Party Service Integrations & Data Disclosure Register

HostelHub does not sell, rent, monetize, or share student data with commercial advertising networks or external data brokers. The following table provides the exhaustive register of third-party systems integrated with HostelHub and the exact data transmitted:

| Service / Tool                                | Legal Basis & Purpose                                        | Data Shared                                                         | Transmission & Safeguards                                                                                                                  |
| :-------------------------------------------- | :----------------------------------------------------------- | :------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------- |
| **Sentry**                                    | Legitimate Interest: Crash reporting and error diagnostics   | Sanitized error stack traces, release version, browser environment. | **Zero Student PII.** Sentry PII scrubber strips email addresses, names, roll numbers, IP addresses, and request payloads before dispatch. |
| **Cloudflare Turnstile**                      | Legitimate Interest: Bot prevention on authentication routes | IP address, browser user-agent, challenge response token.           | Ephemeral verification token only. Turnstile does not track users across domains.                                                          |
| **ClamAV**                                    | Legitimate Interest: Malware detection on file uploads       | Byte stream of uploaded document.                                   | Processed entirely on-premises inside the internal Docker network (`clamav:3310`). No files leave institutional servers.                   |
| **MinIO / AWS S3**                            | Contractual Necessity: Storing verified student documents    | Encrypted binary document files.                                    | Private, non-public bucket. Access strictly granted via short-lived (15-minute) presigned URLs generated on the server.                    |
| **Transactional Email (Resend / Nodemailer)** | Contractual Necessity: Sending official notices & receipts   | Student email address, student name, email subject & HTML body.     | Encrypted in transit via TLS 1.3. Emails contain portal deep-links rather than medical or lifestyle details.                               |
| **Uptime Monitoring (UptimeRobot)**           | Legitimate Interest: System availability monitoring          | HTTP GET requests to `/health` and `/ready`.                        | No user or application state is transmitted.                                                                                               |

---

## 5. Student Rights Under the DPDP Act 2023

Students retain the following automated self-service rights directly within their portal:

1. **Right to Access & Portability:** Download an instantaneous JSON export of all stored compatibility data from `/roommate` ──► _Privacy & Consent Centre_.
2. **Right to Correction:** Update profile, address, and document uploads while the application window remains open.
3. **Right to Erasure (Revocation):** One-click hard deletion of lifestyle questionnaire data from the Privacy Centre, permanently purging cryptographic vectors.
4. **Right to Grievance Redressal:** Formal housing and allocation appeals submitted via `/room` are tracked under a strict 72-hour SLA.
