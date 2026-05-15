import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30m";
export const COOKIE_NAME = "jewelflow_token";

export type JWTPayload = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
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

export function getTokenFromRequest(req: NextRequest): string | null {
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

export function requireAuth(req: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAdmin(req: NextRequest): JWTPayload | null {
  const user = requireAuth(req);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}
