import type { Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { generateSync } from "otplib";
import type { UserRole } from "@hostelhub/shared";

export const TEST_AUTH_SECRET = process.env["AUTH_SECRET"] || "hostelhub-secret-min-32-chars-long!";
export const TEST_INSTITUTION_ID = "66f000000000000000000000";

export const TEST_TOTP_SECRET = "JBSWY3DPEHPK3PXP";

export interface TestUser {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  institution_id: string;
  hostelAssignments?: string[];
  mfaEnabled?: boolean;
  mfaPending?: boolean;
}

export const PRESET_USERS: Record<UserRole, TestUser> = {
  student: {
    id: "66f000000000000000000001",
    email: "student.demo@nit.edu",
    name: "Aarav Sharma",
    roles: ["student"],
    institution_id: TEST_INSTITUTION_ID,
    hostelAssignments: [],
    mfaEnabled: false,
    mfaPending: false,
  },
  warden: {
    id: "66f000000000000000000002",
    email: "warden.demo@nit.edu",
    name: "Dr. Rajesh Kumar",
    roles: ["warden"],
    institution_id: TEST_INSTITUTION_ID,
    hostelAssignments: ["66f000000000000000000010"],
    mfaEnabled: true,
    mfaPending: false,
  },
  chief_warden: {
    id: "66f000000000000000000003",
    email: "chief.warden@nit.edu",
    name: "Prof. Sunita Verma",
    roles: ["chief_warden"],
    institution_id: TEST_INSTITUTION_ID,
    hostelAssignments: [],
    mfaEnabled: true,
    mfaPending: false,
  },
  hostel_admin: {
    id: "66f000000000000000000004",
    email: "admin.hostel@nit.edu",
    name: "Vikram Singh",
    roles: ["hostel_admin"],
    institution_id: TEST_INSTITUTION_ID,
    hostelAssignments: [],
    mfaEnabled: true,
    mfaPending: false,
  },
  dean: {
    id: "66f000000000000000000005",
    email: "dean.welfare@nit.edu",
    name: "Prof. Harpreet Kaur",
    roles: ["dean"],
    institution_id: TEST_INSTITUTION_ID,
    hostelAssignments: [],
    mfaEnabled: true,
    mfaPending: false,
  },
  sys_admin: {
    id: "66f000000000000000000006",
    email: "sysadmin@nit.edu",
    name: "Amitabh Sen",
    roles: ["sys_admin"],
    institution_id: TEST_INSTITUTION_ID,
    hostelAssignments: [],
    mfaEnabled: true,
    mfaPending: false,
  },
};

/**
 * Generates a standard RFC 6238 6-digit TOTP code using a test secret.
 */
export function generateTestTotp(secret: string = TEST_TOTP_SECRET): string {
  return generateSync({ secret });
}

/**
 * Creates a signed NextAuth session JWT cookie for instant authenticated context.
 */
export async function createSessionToken(user: TestUser): Promise<string> {
  const token = await encode({
    token: {
      sub: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      institution_id: user.institution_id,
      hostelAssignments: user.hostelAssignments ?? [],
      mfaPending: user.mfaPending ?? false,
    },
    secret: TEST_AUTH_SECRET,
    salt: "hostelhub.session-token",
  });

  return token;
}

/**
 * Sets authenticated session cookies on the Playwright browser context.
 */
export async function loginAsRole(
  page: Page,
  role: UserRole,
  overrides?: Partial<TestUser>,
): Promise<TestUser> {
  const baseUser = PRESET_USERS[role];
  const user: TestUser = {
    ...baseUser,
    ...overrides,
  };

  const token = await createSessionToken(user);

  await page.context().addCookies([
    {
      name: "hostelhub.session-token",
      value: token,
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "__Secure-authjs.session-token",
      value: token,
      url: "http://localhost:3000",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);

  return user;
}

/**
 * Helper to execute full UI login including TOTP MFA verification step.
 */
export async function loginWithMfaUi(
  page: Page,
  role: UserRole,
  secret: string = TEST_TOTP_SECRET,
): Promise<void> {
  const user = PRESET_USERS[role];
  await page.goto("/login");
  await page.getByLabel(/email address/i).fill(user.email);
  await page.getByLabel(/password/i).fill("Password123!");
  await page.getByRole("button", { name: /sign in/i }).click();

  if (user.mfaEnabled) {
    await page.waitForURL(/\/mfa\/verify/);
    const totpCode = generateTestTotp(secret);
    await page.getByPlaceholder(/000000/i).fill(totpCode);
    await page.getByRole("button", { name: /verify/i }).click();
  }
}
