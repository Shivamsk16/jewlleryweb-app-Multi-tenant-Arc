import { prisma } from "@/lib/prisma";
import { parsePagination, toPaginatedResult } from "@/lib/pagination";

export async function listPlatformAuditLogs(query: Record<string, string | undefined>) {
  const { actorId, tenantId, action, resourceType, dateFrom, dateTo } = query;
  const where: Record<string, unknown> = {};

  if (actorId) where.actorId = actorId;
  if (tenantId) where.tenantId = tenantId === "null" ? null : tenantId;
  if (action) where.action = action;
  if (resourceType) where.resourceType = resourceType;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Record<string, Date>).gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      (where.createdAt as Record<string, Date>).lte = end;
    }
  }

  const { page, limit, skip } = parsePagination(query);
  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return toPaginatedResult(data, total, page, limit);
}
