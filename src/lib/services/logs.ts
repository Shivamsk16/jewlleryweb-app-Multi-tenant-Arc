import { prisma } from "@/lib/prisma";
import { parsePagination, toPaginatedResult } from "@/lib/pagination";

export async function listLogs(query: Record<string, string | undefined>) {
  const { user, module, from, to, search } = query;
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
  if (search?.trim()) {
    const s = search.trim();
    where.OR = [
      { userName: { contains: s, mode: "insensitive" } },
      { action: { contains: s, mode: "insensitive" } },
      { module: { contains: s, mode: "insensitive" } },
      { details: { contains: s, mode: "insensitive" } },
    ];
  }
  const { page, limit, skip } = parsePagination(query);
  const [data, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.activityLog.count({ where }),
  ]);
  return toPaginatedResult(data, total, page, limit);
}
