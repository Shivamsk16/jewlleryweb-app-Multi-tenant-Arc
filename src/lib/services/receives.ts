import { z } from "zod";
import type { JWTPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectOverdue } from "@/lib/business";
import { parsePagination, toPaginatedResult } from "@/lib/pagination";
import { scopedWhere } from "@/lib/tenant-scope";

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

async function calcWastage(
  tenantId: string,
  issueId: string,
  gross: number,
  stone: number,
  returned: number,
  user?: JWTPayload,
) {
  const issue = await prisma.materialIssue.findFirst({
    where: { id: issueId, ...scopedWhere(tenantId, user) },
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

export async function listReceives(
  tenantId: string,
  query: Record<string, string | undefined>,
  user?: JWTPayload,
) {
  const { vendorId, search } = query;
  const where: Record<string, unknown> = scopedWhere(tenantId, user);
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
      select: {
        id: true,
        vendorId: true,
        issueId: true,
        itemName: true,
        grossWeight: true,
        stoneWeight: true,
        netWeight: true,
        wastage: true,
        wastagePercent: true,
        returnedMaterial: true,
        receiveDate: true,
        qualityRemarks: true,
        vendor: { select: { name: true } },
        issue: { select: { material: true, purity: true, issuedWeight: true } },
      },
      orderBy: { receiveDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.jewelleryReceive.count({ where }),
  ]);
  return toPaginatedResult(data, total, page, limit);
}

export async function createReceive(tenantId: string, body: unknown, user?: JWTPayload) {
  const parsed = receiveSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400 as const, body: { message: "Invalid input", issues: parsed.error.issues } };
  }
  const d = parsed.data;
  const issue = await prisma.materialIssue.findFirst({
    where: { id: d.issueId, ...scopedWhere(tenantId, user) },
    include: { receives: true },
  });
  if (!issue) return { status: 404 as const, body: { message: "Issue not found" } };

  const { netWeight, wastage, wastagePercent } = await calcWastage(
    tenantId,
    d.issueId,
    d.grossWeight,
    d.stoneWeight,
    d.returnedMaterial,
    user,
  );

  const created = await prisma.jewelleryReceive.create({
    data: {
      tenantId,
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

  const allReceives = await prisma.jewelleryReceive.findMany({
    where: { issueId: d.issueId, ...scopedWhere(tenantId, user) },
  });
  const totalReturned = allReceives.reduce((s, r) => s + r.netWeight + r.returnedMaterial, 0);
  if (totalReturned >= issue.issuedWeight * 0.99) {
    await prisma.materialIssue.update({ where: { id: d.issueId }, data: { status: "RETURNED" } });
  }
  await detectOverdue(tenantId, user);
  return { status: 201 as const, body: created };
}

export async function getReceive(tenantId: string, id: string, user?: JWTPayload) {
  const item = await prisma.jewelleryReceive.findFirst({
    where: { id, ...scopedWhere(tenantId, user) },
    include: { vendor: true, issue: true },
  });
  if (!item) return { status: 404 as const, body: { message: "Not found" } };
  return { status: 200 as const, body: item };
}

export async function updateReceive(tenantId: string, id: string, body: unknown, user?: JWTPayload) {
  const existing = await prisma.jewelleryReceive.findFirst({
    where: { id, ...scopedWhere(tenantId, user) },
  });
  if (!existing) return { status: 404 as const, body: { message: "Not found" } };
  const parsed = updateSchema.safeParse(body ?? {});
  if (!parsed.success) return { status: 400 as const, body: { message: "Invalid input" } };

  const gross = parsed.data.grossWeight ?? existing.grossWeight;
  const stone = parsed.data.stoneWeight ?? existing.stoneWeight;
  const returned = parsed.data.returnedMaterial ?? existing.returnedMaterial;
  const { netWeight, wastage, wastagePercent } = await calcWastage(
    tenantId,
    existing.issueId,
    gross,
    stone,
    returned,
    user,
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

export async function deleteReceive(tenantId: string, id: string, user?: JWTPayload) {
  const existing = await prisma.jewelleryReceive.findFirst({
    where: { id, ...scopedWhere(tenantId, user) },
  });
  if (!existing) return { status: 404 as const, body: { message: "Not found" } };
  await prisma.jewelleryReceive.delete({ where: { id } });
  return { status: 200 as const, body: { ok: true } };
}
