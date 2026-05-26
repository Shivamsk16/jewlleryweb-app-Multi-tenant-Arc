import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { parsePagination, toPaginatedResult } from "@/lib/pagination";
import { writeAuditLog } from "@/lib/activity-log";
import { sendTenantWelcomeEmail } from "@/lib/email";
import {
  buildProvisionSecrets,
  findLiveTenantBySlug,
  provisionTenantAdmin,
  releaseUsersExclusiveToTenant,
  resolveAdminUserForCreate,
  seedTenantRoles,
  slugForDeletedTenant,
} from "@/lib/services/super-admin/tenant-lifecycle";
import { generateSecureToken, hashToken, in48Hours } from "@/lib/tokens";

const createTenantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  plan: z.string().min(1),
  adminEmail: z.string().email(),
  adminName: z.string().min(1),
});

const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  plan: z.string().min(1).optional(),
  trialEndsAt: z.string().datetime().optional().nullable(),
  maxUsers: z.number().int().positive().optional(),
  maxVendors: z.number().int().positive().optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

export async function listAllTenants(query: Record<string, string | undefined>) {
  const { status, plan, search, from, to, includeDeleted } = query;
  const where: Record<string, unknown> = {};

  if (includeDeleted !== "true") where.deletedAt = null;
  if (status && status !== "ALL") where.status = status;
  if (plan && plan !== "ALL") {
    where.OR = [{ plan }, { plan_ref: { name: plan } }];
  }
  if (search?.trim()) {
    const s = search.trim();
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { name: { contains: s, mode: "insensitive" } },
          { slug: { contains: s, mode: "insensitive" } },
        ],
      },
    ];
  }
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, Date>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, Date>).lte = new Date(to);
  }

  const { page, limit, skip } = parsePagination(query);
  const [rows, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: {
        _count: { select: { members: true } },
        plan_ref: true,
        members: {
          where: { status: "active", role: { name: "admin" } },
          take: 1,
          include: { user: { select: { emailVerified: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.tenant.count({ where }),
  ]);

  const data = rows.map((tenant) => {
    const { members, ...rest } = tenant;
    return {
      ...rest,
      adminVerified: members[0]?.user.emailVerified ?? false,
    };
  });

  return toPaginatedResult(data, total, page, limit);
}

export async function getTenantById(id: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      members: { include: { user: true, role: true } },
      roles: true,
      plan_ref: true,
      _count: {
        select: {
          vendors: true,
          purchases: true,
          issues: true,
          receives: true,
          members: true,
        },
      },
    },
  });
  if (!tenant) return { status: 404 as const, body: { message: "Tenant not found" } };
  return { status: 200 as const, body: tenant };
}

export async function createTenant(body: unknown, actorId?: string) {
  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400 as const, body: { message: "Invalid input", issues: parsed.error.issues } };
  }
  const d = parsed.data;

  const slugConflict = await findLiveTenantBySlug(d.slug);
  if (slugConflict) return { status: 409 as const, body: { message: "Slug already exists" } };

  const adminResolution = await resolveAdminUserForCreate(d.adminEmail);
  if (adminResolution.kind === "blocked") {
    return { status: 409 as const, body: { message: adminResolution.reason } };
  }

  const selectedPlan = await prisma.plan.findFirst({
    where: { name: d.plan, isActive: true },
  });
  if (!selectedPlan) return { status: 400 as const, body: { message: "Plan is not active" } };

  const { placeholderPassword, rawSetupToken, hashedSetupToken } = await buildProvisionSecrets();
  const reuseUserId =
    adminResolution.kind === "reuse" ? adminResolution.userId : undefined;

  const created = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: d.name,
        slug: d.slug,
        plan: selectedPlan.name,
        planId: selectedPlan.id,
        status: "active",
        maxUsers: selectedPlan.maxUsers,
        maxVendors: selectedPlan.maxVendors,
      },
    });

    const adminRole = await seedTenantRoles(tx, tenant.id);

    const adminUser = await provisionTenantAdmin(
      tx,
      tenant.id,
      adminRole.id,
      {
        email: d.adminEmail,
        name: d.adminName,
        placeholderPassword,
        hashedSetupToken,
      },
      reuseUserId,
    );

    return {
      tenant,
      adminUser,
      reusedExistingUser: Boolean(reuseUserId),
    };
  });

  let emailSent = true;
  try {
    await sendTenantWelcomeEmail({
      to: d.adminEmail,
      adminName: d.adminName,
      tenantName: d.name,
      setupToken: rawSetupToken,
    });
    if (actorId) {
      await writeAuditLog({
        actorId,
        tenantId: created.tenant.id,
        action: "tenant.invite_sent",
        resourceType: "User",
        resourceId: created.adminUser.id,
        afterState: { adminEmail: d.adminEmail },
      });
    }
  } catch {
    emailSent = false;
  }

  if (actorId) {
    await writeAuditLog({
      actorId,
      tenantId: null,
      action: "tenant.created",
      resourceType: "Tenant",
      resourceId: created.tenant.id,
      afterState: {
        name: d.name,
        slug: d.slug,
        plan: d.plan,
        adminEmail: d.adminEmail,
        emailSent,
        reusedExistingUser: created.reusedExistingUser,
      },
    });
  }

  const { reusedExistingUser, ...createdBody } = created;

  return {
    status: 201 as const,
    body: {
      ...createdBody,
      emailSent,
    },
  };
}

export async function resendSetupEmail(tenantId: string, actorId?: string) {
  const adminMember = await prisma.tenantMember.findFirst({
    where: {
      tenantId,
      status: "active",
      role: { name: "admin" },
    },
    include: {
      user: true,
      tenant: true,
    },
  });

  if (!adminMember) {
    return { status: 404 as const, body: { message: "Tenant admin not found" } };
  }

  if (adminMember.user.emailVerified) {
    return { status: 400 as const, body: { message: "User has already set up their account" } };
  }

  const rawSetupToken = generateSecureToken();
  const hashedSetupToken = hashToken(rawSetupToken);

  await prisma.$transaction([
    prisma.emailVerification.deleteMany({ where: { userId: adminMember.userId } }),
    prisma.emailVerification.create({
      data: {
        userId: adminMember.userId,
        token: hashedSetupToken,
        type: "password_setup",
        expiresAt: in48Hours(),
      },
    }),
  ]);

  await sendTenantWelcomeEmail({
    to: adminMember.user.email,
    adminName: adminMember.user.name,
    tenantName: adminMember.tenant.name,
    setupToken: rawSetupToken,
  });

  if (actorId) {
    await writeAuditLog({
      actorId,
      tenantId,
      action: "tenant.invite_resent",
      resourceType: "User",
      resourceId: adminMember.userId,
      afterState: { adminEmail: adminMember.user.email },
    });
  }

  return { status: 200 as const, body: { message: "Setup email resent.", sent: true } };
}

export async function updateTenant(id: string, body: unknown, actorId?: string) {
  const parsed = updateTenantSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400 as const, body: { message: "Invalid input", issues: parsed.error.issues } };
  }

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) return { status: 404 as const, body: { message: "Tenant not found" } };

  const d = parsed.data;
  const data: Record<string, unknown> = {};
  if (d.name) data.name = d.name;
  if (d.trialEndsAt !== undefined) data.trialEndsAt = d.trialEndsAt ? new Date(d.trialEndsAt) : null;
  if (d.maxUsers !== undefined) data.maxUsers = d.maxUsers;
  if (d.maxVendors !== undefined) data.maxVendors = d.maxVendors;

  if (d.plan) {
    const selectedPlan = await prisma.plan.findFirst({ where: { name: d.plan, isActive: true } });
    if (!selectedPlan) return { status: 400 as const, body: { message: "Plan is not active" } };
    data.plan = selectedPlan.name;
    data.planId = selectedPlan.id;
  }

  const updated = await prisma.tenant.update({ where: { id }, data });

  if (actorId) {
    await writeAuditLog({
      actorId,
      tenantId: null,
      action: "tenant.updated",
      resourceType: "Tenant",
      resourceId: id,
      afterState: data,
    });
  }

  return { status: 200 as const, body: updated };
}

export async function suspendTenant(id: string, reason: string, actorId?: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) return { status: 404 as const, body: { message: "Tenant not found" } };
  if (tenant.deletedAt) return { status: 400 as const, body: { message: "Tenant is deleted" } };
  if (tenant.status === "suspended") {
    return { status: 400 as const, body: { message: "Tenant is already suspended" } };
  }

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id },
      data: { status: "suspended", suspendedAt: new Date(), suspendedReason: reason },
    }),
    prisma.tenantMember.updateMany({
      where: { tenantId: id },
      data: { status: "suspended" },
    }),
  ]);

  if (actorId) {
    await writeAuditLog({
      actorId,
      tenantId: null,
      action: "tenant.suspended",
      resourceType: "Tenant",
      resourceId: id,
      afterState: { reason },
    });
  }

  return { status: 200 as const, body: { ok: true } };
}

export async function activateTenant(id: string, actorId?: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) return { status: 404 as const, body: { message: "Tenant not found" } };

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id },
      data: { status: "active", suspendedAt: null, suspendedReason: null },
    }),
    prisma.tenantMember.updateMany({
      where: { tenantId: id, status: "suspended" },
      data: { status: "active" },
    }),
  ]);

  if (actorId) {
    await writeAuditLog({
      actorId,
      tenantId: null,
      action: "tenant.activated",
      resourceType: "Tenant",
      resourceId: id,
    });
  }

  return { status: 200 as const, body: { ok: true } };
}

export async function softDeleteTenant(id: string, actorId?: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) return { status: 404 as const, body: { message: "Tenant not found" } };
  if (tenant.deletedAt) return { status: 400 as const, body: { message: "Tenant already deleted" } };

  const freedSlug = slugForDeletedTenant(tenant.slug, tenant.id);

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "deleted",
        slug: freedSlug,
      },
    }),
    prisma.tenantMember.updateMany({
      where: { tenantId: id },
      data: { status: "suspended" },
    }),
  ]);

  const releasedUserIds = await releaseUsersExclusiveToTenant(id);

  if (actorId) {
    await writeAuditLog({
      actorId,
      tenantId: null,
      action: "tenant.deleted",
      resourceType: "Tenant",
      resourceId: id,
      afterState: {
        previousSlug: tenant.slug,
        freedSlug,
        releasedUserIds,
      },
    });
  }

  return { status: 204 as const, body: null };
}

export async function resetTenantAdmin(tenantId: string, input: unknown, actorId?: string) {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 400 as const, body: { message: "Invalid input", issues: parsed.error.issues } };
  }

  const adminMember = await prisma.tenantMember.findFirst({
    where: {
      tenantId,
      status: "active",
      role: { name: "admin" },
    },
    include: { user: true },
  });

  if (!adminMember) return { status: 404 as const, body: { message: "Active tenant admin not found" } };
  if (adminMember.user.superAdmin) {
    return { status: 400 as const, body: { message: "Super admin cannot be a tenant member" } };
  }

  await prisma.user.update({
    where: { id: adminMember.userId },
    data: { password: await hashPassword(parsed.data.newPassword) },
  });

  if (actorId) {
    await writeAuditLog({
      actorId,
      tenantId: null,
      action: "tenant.admin_password_reset",
      resourceType: "User",
      resourceId: adminMember.userId,
    });
  }

  return { status: 200 as const, body: { message: "Password reset successfully" } };
}
