import type { NextRequest } from "next/server";
import type { JWTPayload, SuperAdminJWTPayload } from "@/lib/auth";
import {
  requireAdmin as authRequireAdmin,
  requireAuth as authRequireAuth,
  requireSuperAdmin as authRequireSuperAdmin,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveTenantId } from "@/lib/tenant-scope";

export { authRequireAuth as requireAuth, authRequireSuperAdmin as requireSuperAdmin };

export type TenantContext = {
  tenantId: string;
  membership: {
    id: string;
    userId: string;
    tenantId: string;
    roleId: string;
    status: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    deletedAt: Date | null;
  };
};

export type TenantContextResult =
  | { ok: true; context: TenantContext }
  | { ok: false; message: string };

/** Full tenant session: JWT tenant, active membership, active tenant. */
export async function requireTenantContext(
  req: NextRequest,
  user: JWTPayload,
): Promise<TenantContextResult> {
  const tenantId = resolveTenantId(req, user);
  if (!tenantId) {
    return { ok: false, message: "No tenant context" };
  }

  const membership = await prisma.tenantMember.findFirst({
    where: { userId: user.id, tenantId, status: "active" },
    include: {
      tenant: {
        select: { id: true, name: true, slug: true, status: true, deletedAt: true },
      },
    },
  });

  if (!membership) {
    return { ok: false, message: "Forbidden: not a member of this tenant" };
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  });
  if (!userRecord) {
    return { ok: false, message: "User account not found" };
  }

  if (membership.tenant.deletedAt) {
    return { ok: false, message: "Tenant has been deleted" };
  }

  if (membership.tenant.status !== "active") {
    return { ok: false, message: "Tenant is not active" };
  }

  return {
    ok: true,
    context: {
      tenantId,
      membership: {
        id: membership.id,
        userId: membership.userId,
        tenantId: membership.tenantId,
        roleId: membership.roleId,
        status: membership.status,
      },
      tenant: membership.tenant,
    },
  };
}

export function requireTenantAdmin(user: JWTPayload): boolean {
  return user.role === "ADMIN";
}

export function requireMemberRole(user: JWTPayload, allowed: string[]): boolean {
  return allowed.includes(user.memberRole);
}

export function requireAdmin(req: NextRequest): JWTPayload | null {
  return authRequireAdmin(req);
}
