import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getWebEnv } from "@hostelhub/shared/env";

const MANDATORY_MFA_ROLES = ["hostel_admin", "chief_warden", "sys_admin"];
const STAFF_ROLES = ["warden", "chief_warden", "hostel_admin", "dean", "sys_admin"];

const PROTECTED_PREFIXES = [
  "/student",
  "/warden",
  "/chief-warden",
  "/admin",
  "/dean",
  "/sys-admin",
  "/dashboard",
  "/applications",
  "/room",
  "/roommate",
  "/complaints",
  "/payments",
  "/staff",
];

const STATIC_ASSET_REGEX = /\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|map)$/i;

function isOriginAllowed(origin: string, host: string | null): boolean {
  try {
    const originUrl = new URL(origin);
    if (host && originUrl.host === host) return true;
    if (originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1") return true;
    const allowed = process.env["ALLOWED_ORIGINS"]?.split(",").map((s) => s.trim()) ?? [];
    return allowed.includes(origin);
  } catch {
    return false;
  }
}

function getCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://challenges.cloudflare.com ${isDev ? "'unsafe-eval'" : ""};
    script-src-elem 'self' 'nonce-${nonce}' 'unsafe-inline' https://challenges.cloudflare.com ${isDev ? "'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://*.tile.openstreetmap.org https://images.unsplash.com https://avatars.githubusercontent.com https://lh3.googleusercontent.com https:;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://accounts.google.com;
    frame-ancestors 'none';
    frame-src 'self' https://challenges.cloudflare.com;
    connect-src 'self' https://hostel-allocation-roommate-matching.onrender.com wss://hostel-allocation-roommate-matching.onrender.com https://challenges.cloudflare.com https://api.postalpincode.in https://api.openrouteservice.org https://generativelanguage.googleapis.com https://api.pwnedpasswords.com https://*.sentry.io ${isDev ? "http://localhost:* ws://localhost:* ws: wss:" : ""};
    worker-src 'self' blob:;
    child-src 'self' blob: https://challenges.cloudflare.com;
    media-src 'self' blob: data:;
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();
}

function applySecurityHeaders(res: NextResponse, nonce: string): NextResponse {
  const cspHeader = getCspHeader(nonce);

  res.headers.set("Content-Security-Policy", cspHeader);
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );

  return res;
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  const cspHeader = getCspHeader(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  // Explicit static file and internal Next.js paths allow-list: bypass
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico" ||
    STATIC_ASSET_REGEX.test(pathname)
  ) {
    return applySecurityHeaders(
      NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      }),
      nonce,
    );
  }

  // ── Strict CORS Handling for API ─────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    if (req.method === "OPTIONS") {
      const preflightRes = new NextResponse(null, { status: 204 });
      if (origin && isOriginAllowed(origin, host)) {
        preflightRes.headers.set("Access-Control-Allow-Origin", origin);
        preflightRes.headers.set("Access-Control-Allow-Credentials", "true");
        preflightRes.headers.set(
          "Access-Control-Allow-Methods",
          "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        );
        preflightRes.headers.set(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization, X-Request-Id, Idempotency-Key, X-Institution-Id",
        );
        preflightRes.headers.set("Access-Control-Max-Age", "86400");
      }
      return applySecurityHeaders(preflightRes, nonce);
    }
  }

  const env = getWebEnv();
  const secret = env.AUTH_SECRET;

  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-hostelhub.session-token"
      : "hostelhub.session-token";

  // ── CSRF Protection for Cookie-Authenticated Mutations ───────────────────────
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  const hasAuthCookie =
    req.cookies.has(cookieName) ||
    req.cookies.has("hostelhub.session-token") ||
    req.cookies.has("__Secure-hostelhub.session-token");

  if (isMutation && hasAuthCookie && !pathname.startsWith("/api/auth")) {
    if (origin) {
      if (!isOriginAllowed(origin, host)) {
        return applySecurityHeaders(
          new NextResponse(
            JSON.stringify({
              type: "https://hostelhub.campus.edu/errors/csrf-forbidden",
              title: "Forbidden",
              status: 403,
              detail: "Cross-Site Request Forgery (CSRF) validation failed: Origin mismatch.",
            }),
            {
              status: 403,
              headers: { "Content-Type": "application/problem+json" },
            },
          ),
          nonce,
        );
      }
    } else {
      const referer = req.headers.get("referer");
      if (referer) {
        try {
          const refererUrl = new URL(referer);
          if (!isOriginAllowed(refererUrl.origin, host)) {
            return applySecurityHeaders(
              new NextResponse(
                JSON.stringify({
                  type: "https://hostelhub.campus.edu/errors/csrf-forbidden",
                  title: "Forbidden",
                  status: 403,
                  detail: "Cross-Site Request Forgery (CSRF) validation failed: Referer mismatch.",
                }),
                {
                  status: 403,
                  headers: { "Content-Type": "application/problem+json" },
                },
              ),
              nonce,
            );
          }
        } catch {
          // Invalid URL format
        }
      }
    }
  }

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
    return applySecurityHeaders(NextResponse.redirect(loginUrl), nonce);
  }

  function getPortalForRole(role?: string): string {
    switch (role) {
      case "warden":
        return "/warden/dashboard";
      case "chief_warden":
        return "/chief-warden/dashboard";
      case "hostel_admin":
        return "/admin/dashboard";
      case "dean":
        return "/dean/analytics";
      case "sys_admin":
        return "/sys-admin/users";
      case "student":
      default:
        return "/student/dashboard";
    }
  }

  // 2. If authenticated and attempting to visit /login
  if (token && isAuthPage) {
    if (token["mfaPending"]) {
      return applySecurityHeaders(NextResponse.redirect(new URL("/mfa/verify", req.url)), nonce);
    }
    const roles = (token["roles"] as string[]) ?? [];
    const primaryRole = (token["activeRole"] as string) || roles[0];
    return applySecurityHeaders(
      NextResponse.redirect(new URL(getPortalForRole(primaryRole), req.url)),
      nonce,
    );
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
      return applySecurityHeaders(NextResponse.redirect(verifyUrl), nonce);
    }

    // B. If user has mandatory MFA role and is NOT enrolled, force /mfa/enrol
    const hasMandatoryRole = roles.some((r) => MANDATORY_MFA_ROLES.includes(r));
    if (hasMandatoryRole && !mfaEnabled && !isMfaEnrolPage && !pathname.startsWith("/api/mfa")) {
      return applySecurityHeaders(NextResponse.redirect(new URL("/mfa/enrol", req.url)), nonce);
    }

    // C. Route access control: Role-based portal guards
    const userRole = (token["activeRole"] as string) || roles[0] || "student";

    if (pathname.startsWith("/warden")) {
      const canAccess = roles.some((r) => ["warden", "chief_warden", "sys_admin"].includes(r));
      if (!canAccess) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL(getPortalForRole(userRole), req.url)),
          nonce,
        );
      }
    }

    if (pathname.startsWith("/chief-warden")) {
      const canAccess = roles.some((r) => ["chief_warden", "sys_admin"].includes(r));
      if (!canAccess) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL(getPortalForRole(userRole), req.url)),
          nonce,
        );
      }
    }

    if (pathname.startsWith("/admin")) {
      const canAccess = roles.some((r) => ["hostel_admin", "sys_admin"].includes(r));
      if (!canAccess) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL(getPortalForRole(userRole), req.url)),
          nonce,
        );
      }
    }

    if (pathname.startsWith("/dean")) {
      const canAccess = roles.some((r) => ["dean", "sys_admin"].includes(r));
      if (!canAccess) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL(getPortalForRole(userRole), req.url)),
          nonce,
        );
      }
    }

    if (pathname.startsWith("/sys-admin")) {
      const canAccess = roles.includes("sys_admin");
      if (!canAccess) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL(getPortalForRole(userRole), req.url)),
          nonce,
        );
      }
    }

    if (pathname.startsWith("/staff")) {
      const isStaff = roles.some((r) => STAFF_ROLES.includes(r));
      if (!isStaff) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL(getPortalForRole(userRole), req.url)),
          nonce,
        );
      }
    }

    // D. Auto-route staff users landing on /dashboard to their respective portal
    if (pathname === "/dashboard") {
      if (userRole && userRole !== "student") {
        return applySecurityHeaders(
          NextResponse.redirect(new URL(getPortalForRole(userRole), req.url)),
          nonce,
        );
      }
    }
  }

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (pathname.startsWith("/api/") && origin && isOriginAllowed(origin, host)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return applySecurityHeaders(res, nonce);
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
