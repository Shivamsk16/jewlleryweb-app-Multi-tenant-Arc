import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken,
  type JWTPayload,
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

export async function login(body: unknown) {
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return { status: 400 as const, body: { message: "Invalid input" } };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
    return { status: 401 as const, body: { message: "Invalid credentials" } };
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "ADMIN" | "USER",
  });

  return {
    status: 200 as const,
    body: {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    },
  };
}

export async function me(token: string | null) {
  if (!token) return { user: null };
  const payload = verifyToken(token);
  if (!payload) return { user: null };
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, name: true, role: true },
  });
  return { user };
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
    select: { id: true, email: true, name: true, role: true },
  });

  const token = signToken({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role as "ADMIN" | "USER",
  });

  return { status: 200 as const, body: { user: updated, token } };
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
