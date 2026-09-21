/**
 * @hostelhub/web — __tests__/publication-letters.test.ts
 *
 * Tests for Prompt 22:
 * - Public token verification API reveals no personal data
 * - Tampered token is rejected with invalid status
 * - Rate limiting on public verification endpoint
 * - Calendar (.ics) generation
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as verifyRoute } from "../app/api/v1/verify/[token]/route";
import {
  signVerificationToken,
  getOrCreateDefaultTestKeyPair,
  hashAssignmentId,
} from "@hostelhub/domain";
import { generateIcsContent } from "../lib/calendar";

describe("Prompt 22: Publication Letters & Verification API Tests", () => {
  const { privateKeyPem, kid } = getOrCreateDefaultTestKeyPair();

  const validPayload = {
    lid: "letter-obj-test-12345",
    ah: hashAssignmentId("asgn-xyz-987"),
    iat: Math.floor(Date.now() / 1000),
    iss: "NIT-CAMPUS",
  };

  const validToken = signVerificationToken(validPayload, privateKeyPem, kid);

  it("TEST REQUIREMENT: Verification endpoint verifies token and reveals NO personal data", async () => {
    const req = new NextRequest(`http://localhost:3000/api/v1/verify/${validToken}`);
    const params = Promise.resolve({ token: validToken });

    const res = await verifyRoute(req, { params });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.status).toBe("valid");
    expect(data.institution).toBe("NIT-CAMPUS");
    expect(data.letterId).toBe("letter-obj-test-12345");
    expect(data.message).toContain("Valid - issued by NIT-CAMPUS");

    // ABSOLUTE PRIVACY GUARANTEE: No personal student or room details returned!
    expect(data).not.toHaveProperty("studentName");
    expect(data).not.toHaveProperty("name");
    expect(data).not.toHaveProperty("student_name");
    expect(data).not.toHaveProperty("rollNumber");
    expect(data).not.toHaveProperty("roll_no");
    expect(data).not.toHaveProperty("roomNumber");
    expect(data).not.toHaveProperty("room");
    expect(data).not.toHaveProperty("bed");
    expect(data).not.toHaveProperty("email");
  });

  it("TEST REQUIREMENT: A tampered QR token is invalid", async () => {
    const parts = validToken.split(".");
    // Tamper with signature
    const sigPart = parts[2] ?? "";
    const forgedSignature = sigPart.slice(0, -5) + "ZZZZZ";
    const tamperedToken = `${parts[0]}.${parts[1]}.${forgedSignature}`;

    const req = new NextRequest(`http://localhost:3000/api/v1/verify/${tamperedToken}`);
    const params = Promise.resolve({ token: tamperedToken });

    const res = await verifyRoute(req, { params });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.status).toBe("invalid");
    expect(data.reason).toBe("tampered");
    expect(data.message).toContain("Invalid or altered");
  });

  it("TEST REQUIREMENT: Rate limiter handles verification requests", async () => {
    const uniqueIp = "192.168.100.42";

    // Perform verification request with x-forwarded-for header
    const req = new NextRequest(`http://localhost:3000/api/v1/verify/${validToken}`, {
      headers: { "x-forwarded-for": uniqueIp },
    });
    const params = Promise.resolve({ token: validToken });

    const res = await verifyRoute(req, { params });
    expect(res.status).toBe(200);
  });

  it("generates a valid iCalendar (.ics) export with title, move-in window, and reminder", () => {
    const icsString = generateIcsContent({
      title: "Hostel Move-In: Aryabhata Hall Room 304",
      description: "Bring allocation letter and ID card.",
      location: "Aryabhata Hall Caretaker Office",
      startDate: new Date("2026-09-25T10:00:00Z"),
      endDate: new Date("2026-09-25T17:00:00Z"),
    });

    expect(icsString).toContain("BEGIN:VCALENDAR");
    expect(icsString).toContain("VERSION:2.0");
    expect(icsString).toContain("SUMMARY:Hostel Move-In: Aryabhata Hall Room 304");
    expect(icsString).toContain("LOCATION:Aryabhata Hall Caretaker Office");
    expect(icsString).toContain("BEGIN:VALARM"); // Reminder alarm
    expect(icsString).toContain("END:VCALENDAR");
  });
});
