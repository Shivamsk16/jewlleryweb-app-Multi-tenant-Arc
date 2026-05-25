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

async function resolveActiveMembership(userId: string) {
  return prisma.tenantMember.findFirst({
    where: { userId, status: "active" },
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

export async function login(body: unknown) {
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return { status: 400 as const, body: { message: "Invalid input" } };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
    return { status: 401 as const, body: { message: "Invalid credentials" } };
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
    return { status: 403 as const, body: { message: "No active tenant membership" } };
  }

  const tokenPayload = buildTokenPayload(user, membership);
  const token = signToken(tokenPayload);

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

  const membership = await resolveActiveMembership(updated.id);
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

export async function createUser(body: unknown) {
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return { status: 400 as const, body: { message: "Invalid input" } };

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { status: 400 as const, body: { message: "Email already in use" } };

  const hashed = await hashPassword(parsed.data.password);
  const created = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashed,
      role: parsed.data.role,
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return { status: 201 as const, body: created };
}

export async function listUsers() {
  return prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}
