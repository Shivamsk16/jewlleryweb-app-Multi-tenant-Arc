import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "jewelflow_token";

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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
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
