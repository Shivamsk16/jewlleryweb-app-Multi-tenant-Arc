import { prisma } from "@/lib/prisma";

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfWeek(d = new Date()) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(d);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export async function getPlatformAnalytics() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const weekStart = startOfWeek(now);

  const [
    totalTenants,
    activeTenants,
    suspendedTenants,
    trialTenants,
    deletedTenants,
    newThisMonth,
    newThisWeek,
    totalUsers,
    activeMembers,
    monthlyRevenue,
    totalAuditLogs,
    auditLogsThisWeek,
    totalVendors,
    totalPurchases,
    totalIssues,
    overdueIssues,
  ] = await prisma.$transaction([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "active", deletedAt: null } }),
    prisma.tenant.count({ where: { status: "suspended", deletedAt: null } }),
    prisma.tenant.count({ where: { plan: "trial", deletedAt: null } }),
    prisma.tenant.count({ where: { deletedAt: { not: null } } }),
    prisma.tenant.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.tenant.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.user.count(),
    prisma.tenantMember.count({ where: { status: "active" } }),
    prisma.tenant.aggregate({ _sum: { monthlyRevenue: true } }),
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.vendor.count(),
    prisma.rawMaterialPurchase.count(),
    prisma.materialIssue.count(),
    prisma.materialIssue.count({ where: { status: "OVERDUE" } }),
  ]);

  const topActionsRows = await prisma.auditLog.groupBy({
    by: ["action"],
    where: { createdAt: { gte: monthStart } },
    _count: { action: true },
    orderBy: { _count: { action: "desc" } },
    take: 5,
  });

  const byPlanRows = await prisma.tenant.groupBy({
    by: ["plan"],
    _count: { plan: true },
    _sum: { monthlyRevenue: true },
  });

  return {
    tenants: {
      total: totalTenants,
      active: activeTenants,
      suspended: suspendedTenants,
      trial: trialTenants,
      deleted: deletedTenants,
      newThisMonth,
      newThisWeek,
    },
    users: {
      total: totalUsers,
      activeMembers,
    },
    revenue: {
      monthlyTotal: monthlyRevenue._sum.monthlyRevenue ?? 0,
      byPlan: byPlanRows.map((r) => ({
        plan: r.plan,
        count: r._count.plan,
        revenue: r._sum.monthlyRevenue ?? 0,
      })),
    },
    activity: {
      totalAuditLogs,
      auditLogsThisWeek,
      topActions: topActionsRows.map((row) => ({
        action: row.action,
        count: row._count.action,
      })),
    },
    inventory: {
      totalVendors,
      totalPurchases,
      totalIssues,
      overdueIssues,
    },
  };
}

export async function getTenantAnalytics(tenantId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const weekStart = startOfWeek(now);

  const [
    tenant,
    activeMembers,
    totalAuditLogs,
    auditLogsThisWeek,
    totalVendors,
    totalPurchases,
    totalIssues,
    overdueIssues,
  ] = await prisma.$transaction([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.tenantMember.count({ where: { tenantId, status: "active" } }),
    prisma.auditLog.count({ where: { tenantId } }),
    prisma.auditLog.count({ where: { tenantId, createdAt: { gte: weekStart } } }),
    prisma.vendor.count({ where: { tenantId } }),
    prisma.rawMaterialPurchase.count({ where: { tenantId } }),
    prisma.materialIssue.count({ where: { tenantId } }),
    prisma.materialIssue.count({ where: { tenantId, status: "OVERDUE" } }),
  ]);

  if (!tenant) return { status: 404 as const, body: { message: "Tenant not found" } };

  const topActionsRows = await prisma.auditLog.groupBy({
    by: ["action"],
    where: { tenantId, createdAt: { gte: monthStart } },
    _count: { action: true },
    orderBy: { _count: { action: "desc" } },
    take: 5,
  });

  const newThisMonth = await prisma.tenant.count({
    where: { id: tenantId, createdAt: { gte: monthStart } },
  });
  const newThisWeek = await prisma.tenant.count({
    where: { id: tenantId, createdAt: { gte: weekStart } },
  });

  return {
    status: 200 as const,
    body: {
      tenants: {
        total: 1,
        active: tenant.status === "active" ? 1 : 0,
        suspended: tenant.status === "suspended" ? 1 : 0,
        trial: tenant.plan === "trial" ? 1 : 0,
        deleted: tenant.deletedAt ? 1 : 0,
        newThisMonth,
        newThisWeek,
      },
      users: {
        total: activeMembers,
        activeMembers,
      },
      revenue: {
        monthlyTotal: tenant.monthlyRevenue,
        byPlan: [{ plan: tenant.plan, count: 1, revenue: tenant.monthlyRevenue }],
      },
      activity: {
        totalAuditLogs,
        auditLogsThisWeek,
        topActions: topActionsRows.map((row) => ({
          action: row.action,
          count: row._count.action,
        })),
      },
      inventory: {
        totalVendors,
        totalPurchases,
        totalIssues,
        overdueIssues,
      },
    },
  };
}
