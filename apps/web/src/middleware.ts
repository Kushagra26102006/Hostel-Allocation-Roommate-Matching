import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getWebEnv } from "@hostelhub/shared/env";

const MANDATORY_MFA_ROLES = ["hostel_admin", "chief_warden", "sys_admin"];
const STAFF_ROLES = ["warden", "chief_warden", "hostel_admin", "dean", "sys_admin"];

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/applications",
  "/room",
  "/roommate",
  "/complaints",
  "/payments",
  "/staff",
];

const STATIC_ASSET_REGEX = /\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|map)$/i;

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Explicit static file and internal Next.js paths allow-list: bypass
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico" ||
    STATIC_ASSET_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  const env = getWebEnv();
  const secret = env.AUTH_SECRET;

  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-hostelhub.session-token"
      : "hostelhub.session-token";

  let token = null;
  try {
    token = await getToken({
      req,
      secret,
      cookieName,
    });
  } catch {
    token = null;
  }

  const isAuthPage = pathname.startsWith("/login");
  const isMfaVerifyPage = pathname.startsWith("/mfa/verify");
  const isMfaEnrolPage = pathname.startsWith("/mfa/enrol");
  const isProtectedPath = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // 1. If unauthenticated and accessing a protected route
  if (!token && isProtectedPath) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  function getPortalForRole(role?: string): string {
    switch (role) {
      case "warden":
      case "chief_warden":
        return "/staff/warden/review";
      case "hostel_admin":
        return "/staff/admin/inventory";
      case "dean":
        return "/staff/dean/overview";
      case "sys_admin":
        return "/staff/system/health";
      case "student":
      default:
        return "/dashboard";
    }
  }

  // 2. If authenticated and attempting to visit /login
  if (token && isAuthPage) {
    if (token["mfaPending"]) {
      return NextResponse.redirect(new URL("/mfa/verify", req.url));
    }
    const roles = (token["roles"] as string[]) ?? [];
    const primaryRole = (token["activeRole"] as string) || roles[0];
    return NextResponse.redirect(new URL(getPortalForRole(primaryRole), req.url));
  }

  // 3. MFA & Route Enforcements for logged in users
  if (token) {
    const roles = (token["roles"] as string[]) ?? [];
    const mfaPending = token["mfaPending"] as boolean;
    const mfaEnabled = token["mfaEnabled"] as boolean;

    // A. If MFA verification is pending, redirect away from protected pages to /mfa/verify
    if (mfaPending && !isMfaVerifyPage && !pathname.startsWith("/api/mfa")) {
      const verifyUrl = new URL("/mfa/verify", req.url);
      verifyUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(verifyUrl);
    }

    // B. If user has mandatory MFA role and is NOT enrolled, force /mfa/enrol
    const hasMandatoryRole = roles.some((r) => MANDATORY_MFA_ROLES.includes(r));
    if (hasMandatoryRole && !mfaEnabled && !isMfaEnrolPage && !pathname.startsWith("/api/mfa")) {
      return NextResponse.redirect(new URL("/mfa/enrol", req.url));
    }

    // C. Route access control: Only staff roles on STAFF_ROLES allowlist can access /staff/*
    if (pathname.startsWith("/staff")) {
      const isStaff = roles.some((r) => STAFF_ROLES.includes(r));
      if (!isStaff) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // D. Auto-route staff users landing on /dashboard to their respective portal
    if (pathname === "/dashboard") {
      const primaryRole = (token["activeRole"] as string) || roles[0];
      if (primaryRole && primaryRole !== "student") {
        return NextResponse.redirect(new URL(getPortalForRole(primaryRole), req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
