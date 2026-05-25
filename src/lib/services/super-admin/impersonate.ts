import { prisma } from "@/lib/prisma";
import { signImpersonationToken, type JWTPayload } from "@/lib/auth";
import { writeAuditLog } from "@/lib/activity-log";

export async function startImpersonation(
  superAdminId: string,
  targetTenantId: string,
  ipAddress?: string,
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: targetTenantId } });
  if (!tenant) return { status: 404 as const, body: { message: "Tenant not found" } };
  if (tenant.deletedAt || tenant.status !== "active") {
    return { status: 400 as const, body: { message: "Tenant must be active for impersonation" } };
  }

  const tenantAdmin = await prisma.tenantMember.findFirst({
    where: {
      tenantId: targetTenantId,
      status: "active",
      role: { name: "admin" },
    },
    include: {
      user: true,
      tenant: true,
      role: true,
    },
  });
  if (!tenantAdmin) return { status: 404 as const, body: { message: "Tenant admin not found" } };

  const payload: JWTPayload = {
    id: tenantAdmin.user.id,
    email: tenantAdmin.user.email,
    name: tenantAdmin.user.name,
    role: tenantAdmin.user.role as "ADMIN" | "USER",
    tenantId: tenantAdmin.tenantId,
    tenantSlug: tenantAdmin.tenant.slug,
    memberRole: tenantAdmin.role.name,
    superAdmin: false,
    impersonatedBy: superAdminId,
  };

  const token = signImpersonationToken(payload);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.impersonationSession.create({
    data: {
      superAdminId,
      targetTenantId,
      impersonatedUserId: tenantAdmin.userId,
      token,
      expiresAt,
      ipAddress: ipAddress ?? null,
    },
  });

  await writeAuditLog({
    actorId: superAdminId,
    tenantId: null,
    action: "tenant.impersonation_started",
    resourceType: "ImpersonationSession",
    afterState: { targetTenantId, impersonatedUserId: tenantAdmin.userId },
    ipAddress,
  });

  return { status: 200 as const, body: { token, expiresAt } };
}

export async function endImpersonation(sessionToken: string, actorId: string) {
  const session = await prisma.impersonationSession.findUnique({
    where: { token: sessionToken },
  });
  if (!session) return { status: 404 as const, body: { message: "Impersonation session not found" } };

  await prisma.impersonationSession.update({
    where: { id: session.id },
    data: { endedAt: new Date() },
  });

  await writeAuditLog({
    actorId,
    tenantId: null,
    action: "tenant.impersonation_ended",
    resourceType: "ImpersonationSession",
    resourceId: session.id,
  });

  return { status: 200 as const, body: { ok: true } };
}
