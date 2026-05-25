import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { parsePagination, toPaginatedResult } from "@/lib/pagination";
import { writeAuditLog } from "@/lib/activity-log";

const createTenantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  plan: z.string().min(1),
  adminEmail: z.string().email(),
  adminName: z.string().min(1),
  adminPassword: z.string().min(8),
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
  const [data, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: {
        _count: { select: { members: true } },
        plan_ref: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.tenant.count({ where }),
  ]);

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

  const existingSlug = await prisma.tenant.findUnique({ where: { slug: d.slug } });
  if (existingSlug) return { status: 409 as const, body: { message: "Slug already exists" } };

  const existingEmail = await prisma.user.findUnique({ where: { email: d.adminEmail } });
  if (existingEmail) return { status: 409 as const, body: { message: "Admin email already exists" } };

  const selectedPlan = await prisma.plan.findFirst({
    where: { name: d.plan, isActive: true },
  });
  if (!selectedPlan) return { status: 400 as const, body: { message: "Plan is not active" } };

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

    const [adminRole] = await Promise.all([
      tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "admin",
          isSystemRole: true,
          permissions: {
            can_invite: true,
            can_edit: true,
            can_delete: true,
            can_view_reports: true,
          },
        },
      }),
      tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "editor",
          isSystemRole: true,
          permissions: {
            can_invite: false,
            can_edit: true,
            can_delete: false,
            can_view_reports: true,
          },
        },
      }),
      tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "viewer",
          isSystemRole: true,
          permissions: {
            can_invite: false,
            can_edit: false,
            can_delete: false,
            can_view_reports: true,
          },
        },
      }),
    ]);

    const adminUser = await tx.user.create({
      data: {
        email: d.adminEmail,
        name: d.adminName,
        password: await hashPassword(d.adminPassword),
        role: "ADMIN",
        emailVerified: true,
      },
    });

    if (adminUser.superAdmin) {
      throw new Error("Super admin cannot be a tenant member");
    }

    await tx.tenantMember.create({
      data: {
        userId: adminUser.id,
        tenantId: tenant.id,
        roleId: adminRole.id,
        status: "active",
        joinedAt: new Date(),
      },
    });

    return {
      tenant,
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
      },
    };
  });

  if (actorId) {
    await writeAuditLog({
      actorId,
      tenantId: null,
      action: "tenant.created",
      resourceType: "Tenant",
      resourceId: created.tenant.id,
      afterState: { slug: created.tenant.slug },
    });
  }

  return { status: 201 as const, body: created };
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

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "deleted",
      },
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
      action: "tenant.deleted",
      resourceType: "Tenant",
      resourceId: id,
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
