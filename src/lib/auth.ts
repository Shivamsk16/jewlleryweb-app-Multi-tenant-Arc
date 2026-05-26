import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const SA_IMPERSONATION_SECRET = process.env.SA_IMPERSONATION_SECRET || "dev-sa-impersonation-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30m";
export const COOKIE_NAME = "jewelflow_token";
export const SA_COOKIE_NAME = "jewelflow_sa_token";
export const IMPERSONATION_COOKIE_NAME = "jewelflow_impersonation_token";

export type JWTPayload = {
  id: string;
  email: string;
  name: string;
  /** DEPRECATED: use memberRole */
  role: "ADMIN" | "USER";
  tenantId: string;
  tenantSlug: string;
  memberRole: string;
  superAdmin?: boolean;
  impersonatedBy?: string;
};

export type SuperAdminJWTPayload = {
  id: string;
  email: string;
  name: string;
  superAdmin: true;
  isSuperAdminSession: true;
};

export function isSuperAdmin(user: Pick<JWTPayload, "superAdmin">): boolean {
  return user.superAdmin === true;
}

export function isSuperAdminPayload(p: unknown): p is SuperAdminJWTPayload {
  if (!p || typeof p !== "object") return false;
  const payload = p as Record<string, unknown>;
  return (
    payload.superAdmin === true &&
    payload.isSuperAdminSession === true &&
    typeof payload.id === "string" &&
    typeof payload.email === "string" &&
    typeof payload.name === "string"
  );
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function signSuperAdminToken(payload: SuperAdminJWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "4h" } as jwt.SignOptions);
}

export function signImpersonationToken(payload: JWTPayload): string {
  return jwt.sign(payload, SA_IMPERSONATION_SECRET, { expiresIn: "30m" } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyImpersonationToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, SA_IMPERSONATION_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

const isProd = process.env.NODE_ENV === "production";

export function applyAuthCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
    maxAge: 60 * 30,
  });
  return res;
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });
  return res;
}

export function applySupAdminCookie(res: NextResponse, token: string) {
  res.cookies.set(SA_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
    maxAge: 60 * 60 * 4,
  });
  return res;
}

export function clearSuperAdminCookie(res: NextResponse) {
  res.cookies.set(SA_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });
  return res;
}

export function applyImpersonationCookie(res: NextResponse, token: string) {
  res.cookies.set(IMPERSONATION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
    maxAge: 60 * 30,
  });
  return res;
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const impersonationToken = req.cookies.get(IMPERSONATION_COOKIE_NAME)?.value;
  if (impersonationToken && verifyImpersonationToken(impersonationToken)) {
    return impersonationToken;
  }
  const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length);
  return null;
}

export async function getTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function getSuperAdminTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(SA_COOKIE_NAME)?.value ?? null;
}

export function requireAuth(req: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token) ?? verifyImpersonationToken(token);
}

export function requireAdmin(req: NextRequest): JWTPayload | null {
  const user = requireAuth(req);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export function requireSuperAdmin(req: NextRequest): SuperAdminJWTPayload | null {
  const token = req.cookies.get(SA_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as SuperAdminJWTPayload;
    if (!payload.isSuperAdminSession || !payload.superAdmin) return null;
    return payload;
  } catch {
    return null;
  }
}
