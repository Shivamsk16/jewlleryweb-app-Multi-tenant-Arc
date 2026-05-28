import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { generateSecureToken, hashToken } from "@/lib/tokens";

/** Frees a unique slug by renaming a soft-deleted tenant's slug. */
export function slugForDeletedTenant(originalSlug: string, tenantId: string): string {
  const suffix = `-del-${tenantId.replace(/-/g, "").slice(0, 8)}`;
  const maxBase = Math.max(1, 80 - suffix.length);
  return `${originalSlug.slice(0, maxBase)}${suffix}`;
}

export async function findLiveTenantBySlug(slug: string) {
  return prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
  });
}

/** True if user belongs to any tenant that is not soft-deleted. */
export async function hasMembershipOnLiveTenant(userId: string): Promise<boolean> {
  const count = await prisma.tenantMember.count({
    where: {
      userId,
      tenant: { deletedAt: null },
    },
  });
  return count > 0;
}

/**
 * Frees the user's email for reuse (anonymize) when they have no live-tenant memberships.
 * Keeps the User row for audit log FK integrity.
 */
export async function releaseOrphanUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, superAdmin: true },
  });
  if (!user || user.superAdmin) return false;

  if (await hasMembershipOnLiveTenant(userId)) return false;

  await prisma.$transaction([
    prisma.emailVerification.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        email: `released.${userId}@invalid.jewelflow.local`,
        emailVerified: false,
      },
    }),
  ]);

  return true;
}

/** After tenant delete: release emails for users who only belonged to that tenant. */
export async function releaseUsersExclusiveToTenant(tenantId: string): Promise<string[]> {
  const members = await prisma.tenantMember.findMany({
    where: { tenantId },
    select: { userId: true, user: { select: { superAdmin: true } } },
  });

  const released: string[] = [];
  for (const m of members) {
    if (m.user.superAdmin) continue;

    const onOtherLive = await prisma.tenantMember.count({
      where: {
        userId: m.userId,
        tenantId: { not: tenantId },
        tenant: { deletedAt: null },
      },
    });
    if (onOtherLive > 0) continue;

    const didRelease = await releaseOrphanUser(m.userId);
    if (didRelease) released.push(m.userId);
  }
  return released;
}

type Tx = Prisma.TransactionClient;

export async function seedTenantRoles(tx: Tx, tenantId: string) {
  const [adminRole] = await Promise.all([
    tx.role.create({
      data: {
        tenantId,
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
        tenantId,
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
        tenantId,
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
  return adminRole;
}

export type ProvisionAdminInput = {
  email: string;
  name: string;
  hashedPassword: string;
};

export async function provisionTenantAdmin(
  tx: Tx,
  tenantId: string,
  adminRoleId: string,
  input: ProvisionAdminInput,
  existingUserId?: string,
) {
  const adminUser = existingUserId
    ? await tx.user.update({
        where: { id: existingUserId },
        data: {
          name: input.name,
          email: input.email,
          password: input.hashedPassword,
          role: "ADMIN",
          emailVerified: true,
          superAdmin: false,
        },
        select: { id: true, email: true, name: true },
      })
    : await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          password: input.hashedPassword,
          role: "ADMIN",
          emailVerified: true,
          superAdmin: false,
        },
        select: { id: true, email: true, name: true },
      });

  await tx.emailVerification.deleteMany({ where: { userId: adminUser.id } });

  await tx.tenantMember.create({
    data: {
      userId: adminUser.id,
      tenantId,
      roleId: adminRoleId,
      status: "active",
      joinedAt: new Date(),
    },
  });

  return adminUser;
}

export async function resolveAdminUserForCreate(email: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) return { kind: "new" as const };

  if (existing.superAdmin) {
    return { kind: "blocked" as const, reason: "Admin email already exists" };
  }

  if (await hasMembershipOnLiveTenant(existing.id)) {
    return {
      kind: "blocked" as const,
      reason: "This email is already in use by another active tenant",
    };
  }

  return { kind: "reuse" as const, userId: existing.id };
}

export async function buildProvisionSecrets() {
  const placeholderPassword = await hashPassword(generateSecureToken());
  const rawSetupToken = generateSecureToken();
  const hashedSetupToken = hashToken(rawSetupToken);
  return { placeholderPassword, rawSetupToken, hashedSetupToken };
}
