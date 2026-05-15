import { prisma } from "@/lib/prisma";
import { computeStock, computeVendorBalances, detectOverdue } from "@/lib/business";

function metalTotals(stock: Awaited<ReturnType<typeof computeStock>>, material: string) {
  const entries = stock.filter((s) => s.material === material);
  return {
    received: +entries.reduce((s, e) => s + e.purchased, 0).toFixed(3),
    issued: +entries.reduce((s, e) => s + e.issued, 0).toFixed(3),
    balance: +entries.reduce((s, e) => s + e.available, 0).toFixed(3),
  };
}

export async function dashboardSummary() {
  await detectOverdue();
  const stock = await computeStock();
  const gold = metalTotals(stock, "GOLD");
  const silver = metalTotals(stock, "SILVER");
  const vendorBalances = await computeVendorBalances();
  const totalPending = vendorBalances
    .filter((v) => v.pending > 0)
    .reduce((s, v) => s + v.pending, 0);
  const totalProduced =
    (await prisma.jewelleryReceive.aggregate({ _sum: { netWeight: true } }))._sum.netWeight ?? 0;
  const overdueCount = await prisma.materialIssue.count({ where: { status: "OVERDUE" } });
  const now = new Date();
  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);
  const dueSoonCount = await prisma.materialIssue.count({
    where: { status: { in: ["PENDING"] }, expectedReturn: { gte: now, lte: sevenDays } },
  });
  return {
    goldStock: gold.balance,
    silverStock: silver.balance,
    goldIn: gold.received,
    goldIssued: gold.issued,
    goldBalance: gold.balance,
    silverIn: silver.received,
    silverIssued: silver.issued,
    silverBalance: silver.balance,
    totalPending: +totalPending.toFixed(3),
    totalProduced: +totalProduced.toFixed(3),
    overdueCount,
    dueSoonCount,
    stock,
    vendorBalances,
    lastUpdated: new Date().toISOString(),
  };
}

export async function dashboardTrends() {
  const months: { month: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-IN", { month: "short" }),
    });
  }
  const [purchases, issues, receives] = await Promise.all([
    prisma.rawMaterialPurchase.findMany({ where: { isDeleted: false } }),
    prisma.materialIssue.findMany(),
    prisma.jewelleryReceive.findMany(),
  ]);
  return months.map((m) => {
    const purchased = purchases
      .filter((p) => p.purchaseDate.toISOString().slice(0, 7) === m.month)
      .reduce((s, p) => s + p.netWeight, 0);
    const issued = issues
      .filter((i) => i.issueDate.toISOString().slice(0, 7) === m.month)
      .reduce((s, i) => s + i.issuedWeight, 0);
    const received = receives
      .filter((r) => r.receiveDate.toISOString().slice(0, 7) === m.month)
      .reduce((s, r) => s + r.netWeight, 0);
    return {
      month: m.label,
      purchased: +purchased.toFixed(3),
      issued: +issued.toFixed(3),
      received: +received.toFixed(3),
    };
  });
}

export async function dashboardMetalTrends(period: string) {
  const now = new Date();
  const buckets: { label: string; start: Date; end: Date }[] = [];
  if (period === "weekly") {
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      buckets.push({
        label: start.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        start,
        end,
      });
    }
  } else if (period === "yearly") {
    for (let i = 4; i >= 0; i--) {
      const year = now.getFullYear() - i;
      buckets.push({
        label: String(year),
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
      });
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      buckets.push({
        label: d.toLocaleString("en-IN", { month: "short", year: "2-digit" }),
        start: d,
        end,
      });
    }
  }
  const [purchases, issues] = await Promise.all([
    prisma.rawMaterialPurchase.findMany({ where: { isDeleted: false } }),
    prisma.materialIssue.findMany(),
  ]);
  const inRange = (date: Date, start: Date, end: Date) => date >= start && date <= end;
  const buildSeries = (material: string) =>
    buckets.map((b) => {
      const inWeight = purchases
        .filter((p) => p.material === material && inRange(new Date(p.purchaseDate), b.start, b.end))
        .reduce((s, p) => s + p.netWeight, 0);
      const outWeight = issues
        .filter((i) => i.material === material && inRange(new Date(i.issueDate), b.start, b.end))
        .reduce((s, i) => s + i.issuedWeight, 0);
      return { period: b.label, in: +inWeight.toFixed(3), out: +outWeight.toFixed(3) };
    });
  return { gold: buildSeries("GOLD"), silver: buildSeries("SILVER") };
}

export async function dashboardDueSoon() {
  await detectOverdue();
  const now = new Date();
  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);
  return prisma.materialIssue.findMany({
    where: { status: "PENDING", expectedReturn: { gte: now, lte: sevenDays } },
    include: { vendor: true, receives: true },
    orderBy: { expectedReturn: "asc" },
    take: 5,
  });
}

export async function dashboardRecent() {
  const [purchases, issues, receives] = await Promise.all([
    prisma.rawMaterialPurchase.findMany({
      where: { isDeleted: false },
      orderBy: { purchaseDate: "desc" },
      take: 10,
    }),
    prisma.materialIssue.findMany({
      orderBy: { issueDate: "desc" },
      take: 10,
      include: { vendor: true },
    }),
    prisma.jewelleryReceive.findMany({
      orderBy: { receiveDate: "desc" },
      take: 10,
      include: { vendor: true },
    }),
  ]);
  return [
    ...purchases.map((p) => ({
      id: `p-${p.id}`,
      type: "PURCHASE" as const,
      title: `Purchase: ${p.material} ${p.purity}`,
      description: `${p.grossWeight.toFixed(3)}g from ${p.vendorName ?? "—"}`,
      date: p.purchaseDate.toISOString(),
      link: `/materials`,
    })),
    ...issues.map((i) => ({
      id: `i-${i.id}`,
      type: "ISSUE" as const,
      title: `Issued: ${i.material} ${i.purity}`,
      description: `${i.issuedWeight.toFixed(3)}g to ${i.vendor.name}`,
      date: i.issueDate.toISOString(),
      link: `/issues`,
    })),
    ...receives.map((r) => ({
      id: `r-${r.id}`,
      type: "RECEIVE" as const,
      title: `Received: ${r.itemName}`,
      description: `${r.netWeight.toFixed(3)}g net from ${r.vendor.name}`,
      date: r.receiveDate.toISOString(),
      link: `/receives`,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
}
