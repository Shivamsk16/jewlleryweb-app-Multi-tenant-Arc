import type { JWTPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeStock, computeVendorBalances } from "@/lib/business";
import { scopedWhere } from "@/lib/tenant-scope";

export async function reportStock(tenantId: string, user?: JWTPayload) {
  return computeStock(tenantId, user);
}

export async function reportVendorPending(tenantId: string, user?: JWTPayload) {
  const balances = await computeVendorBalances(tenantId, user);
  return balances.sort((a, b) => b.pending - a.pending);
}

export async function reportProduction(
  tenantId: string,
  query: Record<string, string | undefined>,
  user?: JWTPayload,
) {
  const { from, to, material } = query;
  const where: Record<string, unknown> = scopedWhere(tenantId, user);
  if (from || to) {
    where.receiveDate = {};
    if (from) (where.receiveDate as Record<string, Date>).gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      (where.receiveDate as Record<string, Date>).lte = end;
    }
  }
  const receives = await prisma.jewelleryReceive.findMany({
    where,
    include: { vendor: true, issue: true },
    orderBy: { receiveDate: "desc" },
  });
  const filtered =
    material && material !== "ALL"
      ? receives.filter((r) => r.issue.material === material)
      : receives;
  const byMonth = new Map<
    string,
    { month: string; netWeight: number; count: number; wastage: number }
  >();
  for (const r of filtered) {
    const d = new Date(r.receiveDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth.has(key))
      byMonth.set(key, { month: key, netWeight: 0, count: 0, wastage: 0 });
    const entry = byMonth.get(key)!;
    entry.netWeight += r.netWeight;
    entry.wastage += r.wastage;
    entry.count += 1;
  }
  const byItem = new Map<string, { itemName: string; count: number; netWeight: number }>();
  for (const r of filtered) {
    if (!byItem.has(r.itemName))
      byItem.set(r.itemName, { itemName: r.itemName, count: 0, netWeight: 0 });
    const entry = byItem.get(r.itemName)!;
    entry.count += 1;
    entry.netWeight += r.netWeight;
  }
  return {
    monthly: Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month)),
    byItem: Array.from(byItem.values()).sort((a, b) => b.netWeight - a.netWeight),
    items: filtered,
  };
}

export async function reportWastage(tenantId: string, user?: JWTPayload) {
  const receives = await prisma.jewelleryReceive.findMany({
    where: scopedWhere(tenantId, user),
    include: { vendor: true, issue: true },
    orderBy: { receiveDate: "desc" },
  });
  const avg =
    receives.length > 0
      ? receives.reduce((s, r) => s + r.wastagePercent, 0) / receives.length
      : 0;
  return {
    average: +avg.toFixed(2),
    items: receives.map((r) => ({
      id: r.id,
      vendor: r.vendor.name,
      itemName: r.itemName,
      issuedWeight: r.issue.issuedWeight,
      netWeight: r.netWeight,
      wastage: r.wastage,
      wastagePercent: r.wastagePercent,
      receiveDate: r.receiveDate,
    })),
  };
}
