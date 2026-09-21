# Student Quick-Start Guide

Welcome to HostelHub! This guide walks you through applying for on-campus accommodation, ranking your preferences, finding compatible roommates, and accessing your allotment letter.

---

## 1. Sign In & Authentication

1. Navigate to the login portal at `/login`.
2. Enter your institutional email address (e.g. `yourname@nit.edu`) and password.
3. If Multi-Factor Authentication (MFA) is enabled on your account, enter the 6-digit verification code from your authenticator app.
4. If your device goes offline, your login session persists locally in encrypted browser storage.

---

## 2. Filling Your Hostel Application (`/applications/new`)

The application process is organized into 5 guided steps with real-time autosave:

```
[1. Profile] ──► [2. Documents] ──► [3. Preferences] ──► [4. Questionnaire] ──► [5. Review & Submit]
```

### Step 1: Personal Profile

- Confirm your student roll number, academic programme, and cohort.
- Provide your permanent home address and 6-digit PIN code (used for calculating hometown distance priority $D_{ij}$).

### Step 2: Document Uploads

- Upload your verified income certificate (for fee waiver or quota consideration) and category certificates (if applicable).
- Supported formats: PDF, JPEG, PNG (under 5 MB).
- All files are automatically scanned for malware by ClamAV.

### Step 3: Hostel Preference Ranking

- Rank campus hostel towers in order of personal preference (1st, 2nd, 3rd choice).
- Select your room type preferences (Single, Double, or Triple sharing) and amenity requirements (AC or Non-AC).

### Step 4: Roommate Group Formation (Optional)

- Create a Roommate Group to apply together with friends.
- Share your group's unique 6-character invite code (e.g. `TUR-42`).
- When members accept, the allocation engine places your group in contiguous beds or the same room.

### Step 5: Review, Autosave & Submission

- Review your application summary and check for any eligibility warnings.
- Click **Submit Application**.
- Note your unique submission receipt reference number (e.g. `APP-2026-NIT-0042`).

---

## 3. Lifestyle Compatibility Survey (`/roommate`)

If you are not applying as part of a pre-formed group, complete the **Lifestyle Preferences Questionnaire**:

- **7 Dimensions:** Sleep Routine, Study Environment, Room Tidiness, Noise Tolerance, Guest Policy, AC Temperature, and Campus Smoking Policy.
- **Mutual Deal-Breakers:** Flag zero-tolerance deal-breakers (e.g. strict non-smoker).
- **Privacy Guarantee:** All survey responses are encrypted using AES-256-GCM. You can export a JSON copy of your data or permanently delete your answers anytime from the **Privacy & Consent Centre**.

---

## 4. Viewing Results & Downloading Your Allotment Letter (`/room`)

Once the Chief Warden publishes the provisional list:

1. Navigate to the **Room & Bed Allotment** portal (`/room`).
2. View your allotted hostel tower, room number, floor, and assigned bed.
3. Review your roommate's profile and compatibility harmony score.
4. Click **Download Letter** to obtain your official PDF allotment letter.
5. Your letter features an **Ed25519 digitally signed QR code**. Gatekeepers scan this QR code at move-in check-in to verify your assignment.

---

## 5. Filing an Allocation Appeal

If you have exceptional medical grounds, physical mobility requirements, or personal hardships:

1. Click **File an Appeal** on your allotment page.
2. Select your appeal category (Medical, Hardship, or Academic).
3. Provide a detailed explanation (minimum 20 characters) and attach supporting documentation.
4. Appeals are tracked under a strict **72-hour Service Level Agreement (SLA)** and adjudicated directly by the Chief Warden and Dean of Student Welfare committee.
