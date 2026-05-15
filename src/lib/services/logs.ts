import { prisma } from "@/lib/prisma";

export async function listLogs(query: Record<string, string | undefined>) {
  const { user, module, from, to } = query;
  const where: Record<string, unknown> = {};
  if (user) where.userName = { contains: user, mode: "insensitive" };
  if (module && module !== "ALL") where.module = module;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, Date>).gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      (where.createdAt as Record<string, Date>).lte = end;
    }
  }
  return prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}
