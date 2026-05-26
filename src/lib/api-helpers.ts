import { NextRequest, NextResponse } from "next/server";
import type { JWTPayload, SuperAdminJWTPayload } from "@/lib/auth";
import { logIfMutating } from "@/lib/activity-log";
import { writeAuditLog } from "@/lib/activity-log";
import {
  requireAdmin,
  requireAuth,
  requireSuperAdmin,
  requireTenantAdmin,
  requireTenantContext,
} from "@/lib/authorization";
import { resolveTenantId } from "@/lib/tenant-scope";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** Cache GET responses at the CDN/edge layer (s-maxage) with stale-while-revalidate. */
export function jsonCached<T>(data: T, maxAgeSeconds: number, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`,
    },
  });
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

/** @deprecated Use requireTenantContext; kept for any legacy callers */
export function getTenantId(req: NextRequest, user: JWTPayload): string | null {
  return resolveTenantId(req, user);
}

export function getClientIp(req: NextRequest): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    undefined
  );
}

type Handler = (
  user: JWTPayload,
  req: NextRequest,
  tenantId: string,
) => Promise<NextResponse>;

type SuperAdminHandler = (
  admin: SuperAdminJWTPayload,
  req: NextRequest,
) => Promise<NextResponse>;

export async function withAuth(
  req: NextRequest,
  resource: string,
  handler: Handler,
): Promise<NextResponse> {
  const user = requireAuth(req);
  if (!user) return error("Unauthorized", 401);

  const ctx = await requireTenantContext(req, user);
  if (!ctx.ok) return error(ctx.message, 403);

  const { tenantId } = ctx.context;
  const res = await handler(user, req, tenantId);
  if (res.status < 400) await logIfMutating(req, user, resource, tenantId);
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

  if (!requireTenantAdmin(user)) {
    return error("Forbidden", 403);
  }

  const ctx = await requireTenantContext(req, user);
  if (!ctx.ok) return error(ctx.message, 403);

  const { tenantId } = ctx.context;
  const res = await handler(user, req, tenantId);
  if (res.status < 400) await logIfMutating(req, user, resource, tenantId);
  return res;
}

export async function withSuperAdmin(
  req: NextRequest,
  action: string,
  handler: SuperAdminHandler,
): Promise<NextResponse> {
  const admin = requireSuperAdmin(req);
  if (!admin) return error("Super admin access required", 403);

  const res = await handler(admin, req);

  if (res.status < 400 && ["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
    await writeAuditLog({
      actorId: admin.id,
      tenantId: null,
      action,
      resourceType: "SuperAdmin",
      ipAddress: getClientIp(req),
    });
  }

  return res;
}
