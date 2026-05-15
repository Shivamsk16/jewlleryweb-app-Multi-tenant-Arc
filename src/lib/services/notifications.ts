import { prisma } from "@/lib/prisma";
import { detectOverdue } from "@/lib/business";

export async function listNotifications() {
  await detectOverdue();
  return prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function unreadCount() {
  await detectOverdue();
  const count = await prisma.notification.count({ where: { isRead: false } });
  return { count };
}

export async function markRead(id: string) {
  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  return { ok: true };
}
