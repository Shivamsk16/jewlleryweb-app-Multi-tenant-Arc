import { NextRequest, NextResponse } from "next/server";
import type { JWTPayload } from "@/lib/auth";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { logIfMutating } from "@/lib/activity-log";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export async function parseJson<T>(req: NextRequest): Promise<T> {
  return req.json() as Promise<T>;
}

export function queryRecord(req: NextRequest): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  req.nextUrl.searchParams.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

type Handler = (user: JWTPayload, req: NextRequest) => Promise<NextResponse>;

export async function withAuth(
  req: NextRequest,
  resource: string,
  handler: Handler,
): Promise<NextResponse> {
  const user = requireAuth(req);
  if (!user) return error("Unauthorized", 401);
  const res = await handler(user, req);
  if (res.status < 400) await logIfMutating(req, user, resource);
  return res;
}

export async function withAdmin(
  req: NextRequest,
  resource: string,
  handler: Handler,
): Promise<NextResponse> {
  const user = requireAdmin(req);
  if (!user) {
    const authed = requireAuth(req);
    if (!authed) return error("Unauthorized", 401);
    return error("Forbidden", 403);
  }
  const res = await handler(user, req);
  if (res.status < 400) await logIfMutating(req, user, resource);
  return res;
}
