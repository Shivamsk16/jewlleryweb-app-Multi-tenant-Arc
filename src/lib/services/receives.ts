import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { detectOverdue } from "@/lib/business";
import { parsePagination, toPaginatedResult } from "@/lib/pagination";

function receiveDateRangeFromSearch(search: string): { gte: Date; lte: Date } | null {
  const parsed = new Date(search);
  if (Number.isNaN(parsed.getTime())) return null;
  const gte = new Date(parsed);
  gte.setHours(0, 0, 0, 0);
  const lte = new Date(parsed);
  lte.setHours(23, 59, 59, 999);
  return { gte, lte };
}

const receiveSchema = z.object({
  vendorId: z.string().uuid(),
  issueId: z.string().uuid(),
  itemName: z.string().min(1),
  grossWeight: z.number().nonnegative(),
  stoneWeight: z.number().nonnegative().default(0),
  returnedMaterial: z.number().nonnegative().default(0),
  qualityRemarks: z.string().optional().nullable(),
  receiveDate: z.string().optional(),
});

const updateSchema = z.object({
  itemName: z.string().min(1).optional(),
  grossWeight: z.number().nonnegative().optional(),
  stoneWeight: z.number().nonnegative().optional(),
  returnedMaterial: z.number().nonnegative().optional(),
  qualityRemarks: z.string().optional().nullable(),
  receiveDate: z.string().optional(),
});

async function calcWastage(issueId: string, gross: number, stone: number, returned: number) {
  const issue = await prisma.materialIssue.findUnique({
    where: { id: issueId },
    include: { receives: true },
  });
  if (!issue) return { netWeight: 0, wastage: 0, wastagePercent: 0 };
  const netWeight = +(gross - stone).toFixed(3);
  const receivedSoFar = issue.receives.reduce((s, r) => s + r.netWeight + r.returnedMaterial, 0);
  const remaining = issue.issuedWeight - receivedSoFar;
  const wastage = +(remaining - netWeight - returned).toFixed(3);
  const wastagePercent =
    issue.issuedWeight > 0 ? +((wastage / issue.issuedWeight) * 100).toFixed(2) : 0;
  return { netWeight, wastage, wastagePercent };
}

export async function listReceives(query: Record<string, string | undefined>) {
  const { vendorId, search } = query;
  const where: Record<string, unknown> = {};
  if (vendorId) where.vendorId = vendorId;
  if (search?.trim()) {
    const s = search.trim();
    const or: Record<string, unknown>[] = [
      { itemName: { contains: s, mode: "insensitive" } },
      { vendor: { name: { contains: s, mode: "insensitive" } } },
      { issue: { material: { contains: s, mode: "insensitive" } } },
    ];
    const dateRange = receiveDateRangeFromSearch(s);
    if (dateRange) or.push({ receiveDate: dateRange });
    where.OR = or;
  }
  const { page, limit, skip } = parsePagination(query);
  const [data, total] = await Promise.all([
    prisma.jewelleryReceive.findMany({
      where,
      include: { vendor: true, issue: true },
      orderBy: { receiveDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.jewelleryReceive.count({ where }),
  ]);
  return toPaginatedResult(data, total, page, limit);
}

export async function createReceive(body: unknown) {
  const parsed = receiveSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400 as const, body: { message: "Invalid input", issues: parsed.error.issues } };
  }
  const d = parsed.data;
  const issue = await prisma.materialIssue.findUnique({
    where: { id: d.issueId },
    include: { receives: true },
  });
  if (!issue) return { status: 404 as const, body: { message: "Issue not found" } };

  const { netWeight, wastage, wastagePercent } = await calcWastage(
    d.issueId,
    d.grossWeight,
    d.stoneWeight,
    d.returnedMaterial,
  );

  const created = await prisma.jewelleryReceive.create({
    data: {
      vendorId: d.vendorId,
      issueId: d.issueId,
      itemName: d.itemName,
      grossWeight: d.grossWeight,
      stoneWeight: d.stoneWeight,
      netWeight,
      wastage,
      wastagePercent,
      returnedMaterial: d.returnedMaterial,
      qualityRemarks: d.qualityRemarks || null,
      receiveDate: d.receiveDate ? new Date(d.receiveDate) : new Date(),
    },
    include: { vendor: true, issue: true },
  });

  const allReceives = await prisma.jewelleryReceive.findMany({ where: { issueId: d.issueId } });
  const totalReturned = allReceives.reduce((s, r) => s + r.netWeight + r.returnedMaterial, 0);
  if (totalReturned >= issue.issuedWeight * 0.99) {
    await prisma.materialIssue.update({ where: { id: d.issueId }, data: { status: "RETURNED" } });
  }
  await detectOverdue();
  return { status: 201 as const, body: created };
}

export async function getReceive(id: string) {
  const item = await prisma.jewelleryReceive.findUnique({
    where: { id },
    include: { vendor: true, issue: true },
  });
  if (!item) return { status: 404 as const, body: { message: "Not found" } };
  return { status: 200 as const, body: item };
}

export async function updateReceive(id: string, body: unknown) {
  const existing = await prisma.jewelleryReceive.findUnique({ where: { id } });
  if (!existing) return { status: 404 as const, body: { message: "Not found" } };
  const parsed = updateSchema.safeParse(body ?? {});
  if (!parsed.success) return { status: 400 as const, body: { message: "Invalid input" } };

  const gross = parsed.data.grossWeight ?? existing.grossWeight;
  const stone = parsed.data.stoneWeight ?? existing.stoneWeight;
  const returned = parsed.data.returnedMaterial ?? existing.returnedMaterial;
  const { netWeight, wastage, wastagePercent } = await calcWastage(
    existing.issueId,
    gross,
    stone,
    returned,
  );

  const updated = await prisma.jewelleryReceive.update({
    where: { id },
    data: {
      ...(parsed.data.itemName && { itemName: parsed.data.itemName }),
      grossWeight: gross,
      stoneWeight: stone,
      returnedMaterial: returned,
      netWeight,
      wastage,
      wastagePercent,
      ...(parsed.data.qualityRemarks !== undefined && {
        qualityRemarks: parsed.data.qualityRemarks,
      }),
      ...(parsed.data.receiveDate && { receiveDate: new Date(parsed.data.receiveDate) }),
    },
    include: { vendor: true, issue: true },
  });
  return { status: 200 as const, body: updated };
}

export async function deleteReceive(id: string) {
  const existing = await prisma.jewelleryReceive.findUnique({ where: { id } });
  if (!existing) return { status: 404 as const, body: { message: "Not found" } };
  await prisma.jewelleryReceive.delete({ where: { id } });
  return { status: 200 as const, body: { ok: true } };
}
