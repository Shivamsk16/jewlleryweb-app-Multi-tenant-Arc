import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "jewelflow_token";
const SA_COOKIE_NAME = "jewelflow_sa_token";

type TenantClaims = {
  tenantId?: string;
  tenantSlug?: string;
  isSuperAdminSession?: boolean;
};

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/materials",
  "/vendors",
  "/issues",
  "/receives",
  "/reports",
  "/reminders",
  "/settings",
  "/logs",
];
const SA_PROTECTED_PREFIXES = ["/super-admin"];

/** Decode JWT payload only (no verification) — safe for Edge middleware. */
function decodeJwtPayload(token: string): TenantClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof atob === "function"
        ? atob(base64)
        : Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(json) as TenantClaims;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isSuperAdminRoute =
    SA_PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) &&
    pathname !== "/super-admin/login";
  if (isSuperAdminRoute) {
    const saToken = req.cookies.get(SA_COOKIE_NAME)?.value;
    if (!saToken) {
      const url = req.nextUrl.clone();
      url.pathname = "/super-admin/login";
      return NextResponse.redirect(url);
    }
    const payload = decodeJwtPayload(saToken);
    if (!payload?.isSuperAdminSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/super-admin/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const payload = decodeJwtPayload(token);
  if (payload?.tenantId && payload?.tenantSlug) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-tenant-id", payload.tenantId);
    requestHeaders.set("x-tenant-slug", payload.tenantSlug);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/super-admin/:path*",
    "/dashboard/:path*",
    "/materials/:path*",
    "/vendors/:path*",
    "/issues/:path*",
    "/receives/:path*",
    "/reports/:path*",
    "/reminders/:path*",
    "/settings/:path*",
    "/logs/:path*",
  ],
};
