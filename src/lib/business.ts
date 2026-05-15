import { prisma } from "./prisma";

// =====================================================
// Stock Calculations
// =====================================================
export type StockKey = string; // `${material}|${purity}`

export type StockEntry = {
  material: string;
  purity: string;
  purchased: number;
  issued: number;
  returned: number;
  available: number;
};

export async function computeStock(): Promise<StockEntry[]> {
  const [purchases, issues, receives] = await Promise.all([
    prisma.rawMaterialPurchase.findMany({ where: { isDeleted: false } }),
    prisma.materialIssue.findMany(),
    prisma.jewelleryReceive.findMany(),
  ]);

  const map = new Map<StockKey, StockEntry>();
  const get = (material: string, purity: string): StockEntry => {
    const k = `${material}|${purity}`;
    if (!map.has(k))
      map.set(k, { material, purity, purchased: 0, issued: 0, returned: 0, available: 0 });
    return map.get(k)!;
  };

  for (const p of purchases) {
    const e = get(p.material, p.purity);
    e.purchased += p.netWeight;
  }
  for (const i of issues) {
    const e = get(i.material, i.purity);
    e.issued += i.issuedWeight;
  }
  for (const r of receives) {
    const issue = issues.find((x) => x.id === r.issueId);
    if (!issue) continue;
    const e = get(issue.material, issue.purity);
    e.returned += r.returnedMaterial;
  }

  for (const e of map.values()) {
    e.available = e.purchased - e.issued + e.returned;
  }

  return Array.from(map.values()).sort((a, b) =>
    a.material === b.material ? a.purity.localeCompare(b.purity) : a.material.localeCompare(b.material),
  );
}

export async function getAvailableStock(material: string, purity: string): Promise<number> {
  const stock = await computeStock();
  const found = stock.find((s) => s.material === material && s.purity === purity);
  return found ? found.available : 0;
}

// =====================================================
// Vendor balance
// =====================================================
export type VendorBalance = {
  vendorId: string;
  vendorName: string;
  issued: number;
  received: number;
  returned: number;
  pending: number;
  wastage: number;
  wastagePercent: number;
};

export async function computeVendorBalances(): Promise<VendorBalance[]> {
  const vendors = await prisma.vendor.findMany({
    include: {
      issues: { include: { receives: true } },
    },
  });

  return vendors.map((v) => {
    let issued = 0;
    let received = 0;
    let returned = 0;
    let wastage = 0;
    for (const issue of v.issues) {
      issued += issue.issuedWeight;
      for (const rec of issue.receives) {
        received += rec.netWeight;
        returned += rec.returnedMaterial;
        wastage += rec.wastage;
      }
    }
    const pending = issued - (received + returned);
    const wastagePercent = issued > 0 ? (wastage / issued) * 100 : 0;
    return {
      vendorId: v.id,
      vendorName: v.name,
      issued,
      received,
      returned,
      pending,
      wastage,
      wastagePercent,
    };
  });
}

// =====================================================
// Overdue detection — also flips status to OVERDUE
// =====================================================
export async function detectOverdue(): Promise<void> {
  const now = new Date();
  const pendings = await prisma.materialIssue.findMany({
    where: { status: "PENDING" },
    include: { receives: true, vendor: true },
  });

  for (const i of pendings) {
    const receivedNet = i.receives.reduce((s, r) => s + r.netWeight + r.returnedMaterial, 0);
    const balance = i.issuedWeight - receivedNet;
    if (i.expectedReturn < now && balance > 0) {
      await prisma.materialIssue.update({ where: { id: i.id }, data: { status: "OVERDUE" } });
      const exists = await prisma.notification.findFirst({
        where: { type: "OVERDUE", link: "/reminders?tab=overdue" },
      });
      if (!exists) {
        await prisma.notification.create({
          data: {
            type: "OVERDUE",
            title: "Issue overdue",
            message: `Issue to ${i.vendor.name} (${i.issuedWeight}g ${i.material} ${i.purity}) is overdue.`,
            link: "/reminders?tab=overdue",
          },
        });
      }
    } else if (balance <= 0) {
      await prisma.materialIssue.update({ where: { id: i.id }, data: { status: "RETURNED" } });
    }
  }
}
