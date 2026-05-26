import type { JWTPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePagination, toPaginatedResult } from "@/lib/pagination";
import { scopedWhere } from "@/lib/tenant-scope";

export async function listLogs(
  tenantId: string,
  query: Record<string, string | undefined>,
  user?: JWTPayload,
) {
  const { user: userFilter, module, from, to, search } = query;
  const where: Record<string, unknown> = scopedWhere(tenantId, user, {});
  if (userFilter) {
    const actor = await prisma.tenantMember.findFirst({
      where: {
        tenantId,
        status: "active",
        user: { name: { contains: userFilter, mode: "insensitive" } },
      },
      select: { userId: true },
    });
    if (actor) where.actorId = actor.userId;
  }
  if (module && module !== "ALL") where.resourceType = module;
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
      { action: { contains: s, mode: "insensitive" } },
      { resourceType: { contains: s, mode: "insensitive" } },
    ];
  }
  const { page, limit, skip } = parsePagination(query);
  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);
  const mapped = data.map((row) => ({
    id: row.id,
    userName: row.actor.name,
    action: row.action,
    module: row.resourceType,
    details: row.resourceId,
    createdAt: row.createdAt,
  }));
  return toPaginatedResult(mapped, total, page, limit);
}

/** Legacy activity log listing (admin diagnostics). */
export async function listActivityLogs(
  tenantId: string,
  query: Record<string, string | undefined>,
) {
  const { user: userFilter, module, from, to, search } = query;
  const where: Record<string, unknown> = {};
  if (userFilter) where.userName = { contains: userFilter, mode: "insensitive" };
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
  void tenantId;
  const { page, limit, skip } = parsePagination(query);
  const [data, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      select: {
        id: true,
        userName: true,
        action: true,
        module: true,
        details: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.activityLog.count({ where }),
  ]);
  return toPaginatedResult(data, total, page, limit);
}
