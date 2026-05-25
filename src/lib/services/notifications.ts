import type { JWTPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectOverdue } from "@/lib/business";
import { scopedWhere } from "@/lib/tenant-scope";

export async function listNotifications(tenantId: string, user?: JWTPayload) {
  await detectOverdue(tenantId, user);
  return prisma.notification.findMany({
    where: scopedWhere(tenantId, user),
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function unreadCount(tenantId: string, user?: JWTPayload) {
  await detectOverdue(tenantId, user);
  const count = await prisma.notification.count({
    where: { ...scopedWhere(tenantId, user), isRead: false },
  });
  return { count };
}

export async function markRead(tenantId: string, id: string, user?: JWTPayload) {
  const existing = await prisma.notification.findFirst({
    where: { id, ...scopedWhere(tenantId, user) },
  });
  if (!existing) return { status: 404 as const, body: { message: "Not found" } };
  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  return { status: 200 as const, body: { ok: true } };
}
