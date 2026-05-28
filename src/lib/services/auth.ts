import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  signSuperAdminToken,
  signToken,
  verifyPassword,
  verifyToken,
  type JWTPayload,
  type SuperAdminJWTPayload,
} from "@/lib/auth";
import {
  getSystemActorId,
  hashEmailForAudit,
  writeAuditLog,
} from "@/lib/activity-log";
import { resolveTenantRoleId, validateTenantForLogin } from "@/lib/tenant-scope";
import { generateSecureToken, hashToken, in1Hour } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "USER"]),
});

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

const setupPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
});

const PASSWORD_RESET_GENERIC =
  "If an account exists for this email, you will receive a password reset link shortly.";

type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
  tenantId: string;
  tenantSlug: string;
  memberRole: string;
};

type SuperAdminSessionUser = {
  id: string;
  email: string;
  name: string;
  superAdmin: true;
};

type AuthMeta = { ipAddress?: string };

async function logLoginFailed(
  email: string,
  reason: string,
  userId: string | null,
  tenantId: string | null,
  ipAddress?: string,
) {
  const actorId = userId ?? (await getSystemActorId());
  if (!actorId) return;
  await writeAuditLog({
    actorId,
    tenantId,
    action: "auth.login_failed",
    resourceType: "User",
    resourceId: userId ?? undefined,
    afterState: { reason, emailHash: hashEmailForAudit(email) },
    ipAddress,
  });
}

async function resolveActiveMembership(userId: string, tenantId?: string) {
  return prisma.tenantMember.findFirst({
    where: {
      userId,
      status: "active",
      ...(tenantId ? { tenantId } : {}),
    },
    include: { tenant: true, role: true },
    orderBy: { joinedAt: "desc" },
  });
}

function buildTokenPayload(
  user: { id: string; email: string; name: string; role: string; superAdmin: boolean },
  membership: { tenant: { id: string; slug: string }; role: { name: string } },
): JWTPayload {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "ADMIN" | "USER",
    tenantId: membership.tenant.id,
    tenantSlug: membership.tenant.slug,
    memberRole: membership.role.name,
    superAdmin: user.superAdmin,
  };
}

function toSessionUser(payload: JWTPayload): SessionUser {
  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    tenantId: payload.tenantId,
    tenantSlug: payload.tenantSlug,
    memberRole: payload.memberRole,
  };
}

async function findPasswordResetByRawToken(rawToken: string) {
  const hashed = hashToken(rawToken);
  return prisma.emailVerification.findFirst({
    where: { token: hashed, type: "password_reset", usedAt: null },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          superAdmin: true,
        },
      },
    },
  });
}

async function findVerificationByRawToken(rawToken: string) {
  const hashed = hashToken(rawToken);
  return prisma.emailVerification.findFirst({
    where: { token: hashed, type: "password_setup", usedAt: null },
    include: {
      user: {
        select: {
          email: true,
          name: true,
          memberships: {
            where: { status: "active" },
            take: 1,
            include: { tenant: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
}

function profileFromRecord(
  record: NonNullable<Awaited<ReturnType<typeof findVerificationByRawToken>>>,
) {
  const tenantName = record.user.memberships[0]?.tenant.name ?? "your organization";
  return {
    email: record.user.email,
    name: record.user.name,
    tenantName,
  };
}

export async function login(body: unknown, meta?: AuthMeta) {
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return { status: 400 as const, body: { message: "Invalid input" } };

  const email = parsed.data.email;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
    await logLoginFailed(
      email,
      "invalid_credentials",
      user?.id ?? null,
      null,
      meta?.ipAddress,
    );
    return { status: 401 as const, body: { message: "Invalid credentials" } };
  }

  if (!user.emailVerified && user.superAdmin !== true) {
    await logLoginFailed(
      email,
      "email_not_verified",
      user.id,
      null,
      meta?.ipAddress,
    );
    return {
      status: 403 as const,
      body: {
        error: "Please verify your email before logging in. Check your inbox for the setup link.",
        message: "Please verify your email before logging in. Check your inbox for the setup link.",
      },
    };
  }

  if (user.superAdmin === true) {
    const payload: SuperAdminJWTPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      superAdmin: true,
      isSuperAdminSession: true,
    };
    const token = signSuperAdminToken(payload);
    const superAdminUser: SuperAdminSessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      superAdmin: true,
    };
    await writeAuditLog({
      actorId: user.id,
      tenantId: null,
      action: "auth.login_success",
      resourceType: "User",
      resourceId: user.id,
      afterState: { role: "super_admin" },
      ipAddress: meta?.ipAddress,
    });
    return {
      status: 200 as const,
      body: {
        user: superAdminUser,
        token,
        isSuperAdmin: true,
      },
    };
  }

  const membership = await resolveActiveMembership(user.id);
  if (!membership) {
    await logLoginFailed(email, "no_membership", user.id, null, meta?.ipAddress);
    return { status: 403 as const, body: { message: "No active tenant membership" } };
  }

  const tenantCheck = await validateTenantForLogin(membership.tenantId);
  if (!tenantCheck.ok) {
    await logLoginFailed(
      email,
      "tenant_inactive",
      user.id,
      membership.tenantId,
      meta?.ipAddress,
    );
    return { status: 403 as const, body: { message: tenantCheck.message } };
  }

  const tokenPayload = buildTokenPayload(user, membership);
  const token = signToken(tokenPayload);

  await writeAuditLog({
    actorId: user.id,
    tenantId: membership.tenantId,
    action: "auth.login_success",
    resourceType: "User",
    resourceId: user.id,
    ipAddress: meta?.ipAddress,
  });

  return {
    status: 200 as const,
    body: {
      user: toSessionUser(tokenPayload),
      token,
    },
  };
}

export async function me(token: string | null) {
  if (!token) return { user: null };
  const payload = verifyToken(token);
  if (!payload?.tenantId) return { user: null };
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) return { user: null };
  return {
    user: {
      ...user,
      role: user.role as "ADMIN" | "USER",
      tenantId: payload.tenantId,
      tenantSlug: payload.tenantSlug,
      memberRole: payload.memberRole,
    },
  };
}

export async function updateProfile(user: JWTPayload, body: unknown) {
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return { status: 400 as const, body: { message: "Invalid input" } };

  if (parsed.data.email && parsed.data.email !== user.email) {
    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (exists) return { status: 400 as const, body: { message: "Email already in use" } };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.email && { email: parsed.data.email }),
    },
    select: { id: true, email: true, name: true, role: true, superAdmin: true },
  });

  const membership = await resolveActiveMembership(updated.id, user.tenantId);
  if (!membership) {
    return { status: 403 as const, body: { message: "No active tenant membership" } };
  }

  const tokenPayload = buildTokenPayload(updated, membership);
  const token = signToken(tokenPayload);

  return {
    status: 200 as const,
    body: { user: toSessionUser(tokenPayload), token },
  };
}

export async function createUser(tenantId: string, body: unknown) {
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return { status: 400 as const, body: { message: "Invalid input" } };

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, maxUsers: true, status: true, deletedAt: true },
  });
  if (!tenant || tenant.deletedAt || tenant.status !== "active") {
    return { status: 403 as const, body: { message: "Tenant is not active" } };
  }

  const memberCount = await prisma.tenantMember.count({
    where: { tenantId, status: "active" },
  });
  if (memberCount >= tenant.maxUsers) {
    return { status: 400 as const, body: { message: "Tenant user limit reached" } };
  }

  const roleId = await resolveTenantRoleId(tenantId, parsed.data.role);
  if (!roleId) {
    return { status: 500 as const, body: { message: "Tenant roles are not configured" } };
  }

  const existingMember = await prisma.tenantMember.findFirst({
    where: {
      tenantId,
      user: { email: parsed.data.email },
    },
    select: { id: true },
  });
  if (existingMember) {
    return { status: 400 as const, body: { message: "Email already in use for this tenant" } };
  }

  const existingGlobal = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingGlobal) {
    return { status: 400 as const, body: { message: "Email already in use" } };
  }

  const hashed = await hashPassword(parsed.data.password);
  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: hashed,
        role: parsed.data.role,
        emailVerified: true,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    await tx.tenantMember.create({
      data: {
        userId: user.id,
        tenantId,
        roleId,
        status: "active",
        joinedAt: new Date(),
      },
    });
    return user;
  });

  return { status: 201 as const, body: created };
}

export async function verifySetupToken(token: string | undefined) {
  if (!token?.trim()) {
    return { status: 404 as const, body: { valid: false, reason: "invalid" as const } };
  }

  const record = await findVerificationByRawToken(token.trim());

  if (!record) {
    return { status: 404 as const, body: { valid: false, reason: "invalid" as const } };
  }

  const profile = profileFromRecord(record);

  if (record.expiresAt < new Date()) {
    return {
      status: 410 as const,
      body: {
        valid: false,
        reason: "expired" as const,
        ...profile,
      },
    };
  }

  return {
    status: 200 as const,
    body: {
      valid: true,
      ...profile,
    },
  };
}

export async function setupPassword(body: unknown, meta?: AuthMeta) {
  const parsed = setupPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400 as const, body: { message: "Invalid input" } };
  }

  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { status: 400 as const, body: { message: "Passwords do not match" } };
  }

  const record = await findVerificationByRawToken(parsed.data.token);

  if (!record) {
    return { status: 404 as const, body: { message: "Invalid or expired setup link" } };
  }

  if (record.expiresAt < new Date()) {
    return {
      status: 410 as const,
      body: {
        message: "This setup link has expired. Please contact your administrator.",
      },
    };
  }

  const hashedPassword = await hashPassword(parsed.data.password);
  const tenantId = record.user.memberships[0]?.tenant.id ?? null;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword, emailVerified: true },
    }),
    prisma.emailVerification.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await writeAuditLog({
    actorId: record.userId,
    tenantId,
    action: "auth.password_setup_completed",
    resourceType: "User",
    resourceId: record.userId,
    ipAddress: meta?.ipAddress,
  });

  return {
    status: 200 as const,
    body: { message: "Account setup complete. You can now log in." },
  };
}

export async function requestPasswordReset(body: unknown) {
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400 as const, body: { message: "Invalid input" } };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const canReset =
      user.superAdmin === true ||
      (await prisma.tenantMember.findFirst({
        where: { userId: user.id, status: "active" },
      })) !== null;

    if (canReset) {
      const rawToken = generateSecureToken();
      const hashedToken = hashToken(rawToken);

      await prisma.emailVerification.deleteMany({ where: { userId: user.id } });
      await prisma.emailVerification.create({
        data: {
          userId: user.id,
          token: hashedToken,
          type: "password_reset",
          expiresAt: in1Hour(),
        },
      });

      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          resetToken: rawToken,
        });
      } catch (err) {
        console.error("[Auth] Failed to send password reset email:", err);
      }
    }
  }

  return {
    status: 200 as const,
    body: { message: PASSWORD_RESET_GENERIC },
  };
}

export async function resetPassword(body: unknown, meta?: AuthMeta) {
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400 as const, body: { message: "Invalid input" } };
  }

  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { status: 400 as const, body: { message: "Passwords do not match" } };
  }

  const record = await findPasswordResetByRawToken(parsed.data.token);

  if (!record) {
    return { status: 404 as const, body: { message: "Invalid or expired reset link" } };
  }

  if (record.expiresAt < new Date()) {
    return {
      status: 410 as const,
      body: { message: "This reset link has expired. Please request a new one." },
    };
  }

  const hashedPassword = await hashPassword(parsed.data.password);
  const tenantId =
    (
      await prisma.tenantMember.findFirst({
        where: { userId: record.userId, status: "active" },
        select: { tenantId: true },
      })
    )?.tenantId ?? null;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword, emailVerified: true },
    }),
    prisma.emailVerification.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await writeAuditLog({
    actorId: record.userId,
    tenantId,
    action: "auth.password_reset_completed",
    resourceType: "User",
    resourceId: record.userId,
    ipAddress: meta?.ipAddress,
  });

  return {
    status: 200 as const,
    body: { message: "Password updated. You can now sign in." },
  };
}

export async function listUsers(tenantId: string) {
  const members = await prisma.tenantMember.findMany({
    where: { tenantId, status: "active" },
    include: {
      user: {
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      },
    },
    orderBy: { joinedAt: "desc" },
  });
  return members.map((m) => m.user);
}
