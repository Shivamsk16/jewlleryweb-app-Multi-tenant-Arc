import type { JWTPayload } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Merge tenantId into a Prisma where clause unless the actor is a super admin. */
export function scopedWhere<T extends Record<string, unknown>>(
  tenantId: string,
  user: JWTPayload | undefined,
  where: T = {} as T,
): T & { tenantId?: string } {
  if (user && isSuperAdmin(user)) return where;
  return { ...where, tenantId };
}

/**
 * Resolve the authoritative tenant id for an API request.
 * JWT tenantId is the source of truth; x-tenant-id must match when present.
 */
export function resolveTenantId(req: { headers: Headers }, user: JWTPayload): string | null {
  if (!user.tenantId) return null;
  const headerTenant = req.headers.get("x-tenant-id");
  if (headerTenant && headerTenant !== user.tenantId) return null;
  return user.tenantId;
}

export type TenantAccessResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Ensure user exists, has active membership, and tenant is active (not deleted/suspended).
 * @deprecated Prefer requireTenantContext from @/lib/authorization for full context.
 */
export async function validateTenantAccess(
  userId: string,
  tenantId: string,
): Promise<TenantAccessResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return { ok: false, message: "User account not found" };
  }

  const membership = await prisma.tenantMember.findFirst({
    where: { userId, tenantId, status: "active" },
    include: {
      tenant: { select: { status: true, deletedAt: true } },
    },
  });

  if (!membership) {
    return { ok: false, message: "Forbidden: not a member of this tenant" };
  }

  if (membership.tenant.deletedAt) {
    return { ok: false, message: "Tenant has been deleted" };
  }

  if (membership.tenant.status !== "active") {
    return { ok: false, message: "Tenant is not active" };
  }

  return { ok: true };
}

/** Validate tenant is usable for login (active, not deleted). */
export async function validateTenantForLogin(tenantId: string): Promise<TenantAccessResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true, deletedAt: true },
  });

  if (!tenant) {
    return { ok: false, message: "Tenant not found" };
  }

  if (tenant.deletedAt) {
    return { ok: false, message: "Tenant has been deleted" };
  }

  if (tenant.status !== "active") {
    return { ok: false, message: "Tenant is not active" };
  }

  return { ok: true };
}

/** Resolve system role id for a tenant when provisioning users. */
export async function resolveTenantRoleId(
  tenantId: string,
  userRole: "ADMIN" | "USER",
): Promise<string | null> {
  const roleName = userRole === "ADMIN" ? "admin" : "editor";
  const role = await prisma.role.findFirst({
    where: { tenantId, name: roleName },
    select: { id: true },
  });
  return role?.id ?? null;
}
